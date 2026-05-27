import os
import sqlite3
from datetime import datetime

import httpx
import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field

app = FastAPI(title="Purchasing Service", version="1.0.0")
security = HTTPBearer()
DB_PATH = "/data/purchasing.db"
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALG = "HS256"
SERVICE_TOKEN = os.getenv("SERVICE_TOKEN", "dev-service-token")
INVENTORY_URL = os.getenv("INVENTORY_URL", "http://inventory-service:8002")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact_email TEXT UNIQUE NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS purchase_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()

    cur.execute(
        "INSERT OR IGNORE INTO suppliers (id, name, contact_email) VALUES (1, 'Brew Supply Co', 'sales@brewsupply.example')"
    )
    conn.commit()
    conn.close()


@app.on_event("startup")
def startup() -> None:
    init_db()


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


def require_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    return decode_token(credentials.credentials)


class SupplierCreate(BaseModel):
    name: str
    contact_email: EmailStr


class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    item_id: int
    quantity: int = Field(gt=0)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "purchasing-service"}


@app.get("/api/v1/purchasing/suppliers")
def list_suppliers(_: dict = Depends(require_user)) -> dict:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM suppliers ORDER BY id")
    rows = [dict(row) for row in cur.fetchall()]
    conn.close()
    return {"suppliers": rows}


@app.post("/api/v1/purchasing/suppliers")
def create_supplier(payload: SupplierCreate, _: dict = Depends(require_user)) -> dict:
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO suppliers (name, contact_email) VALUES (?, ?)",
            (payload.name, payload.contact_email),
        )
        conn.commit()
        supplier_id = cur.lastrowid
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=400, detail="Supplier email already exists") from exc
    finally:
        conn.close()
    return {"id": supplier_id, "message": "Supplier created"}


@app.get("/api/v1/purchasing/purchase-orders")
def list_purchase_orders(_: dict = Depends(require_user)) -> dict:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM purchase_orders ORDER BY id DESC")
    rows = [dict(row) for row in cur.fetchall()]
    conn.close()
    return {"purchase_orders": rows}


@app.post("/api/v1/purchasing/purchase-orders")
def create_purchase_order(payload: PurchaseOrderCreate, user: dict = Depends(require_user)) -> dict:
    if user.get("role") not in {"admin", "manager"}:
        raise HTTPException(status_code=403, detail="Only admin/manager can create purchase orders")

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id FROM suppliers WHERE id = ?", (payload.supplier_id,))
    supplier = cur.fetchone()
    if supplier is None:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid supplier")

    cur.execute(
        """
        INSERT INTO purchase_orders (supplier_id, item_id, quantity, status, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            payload.supplier_id,
            payload.item_id,
            payload.quantity,
            "ordered",
            datetime.utcnow().isoformat(),
        ),
    )
    conn.commit()
    po_id = cur.lastrowid
    conn.close()

    return {"id": po_id, "message": "Purchase order created"}


@app.post("/api/v1/purchasing/purchase-orders/{po_id}/receive")
async def receive_purchase_order(po_id: int, user: dict = Depends(require_user)) -> dict:
    if user.get("role") not in {"admin", "manager"}:
        raise HTTPException(status_code=403, detail="Only admin/manager can receive purchase orders")

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, item_id, quantity, status FROM purchase_orders WHERE id = ?", (po_id,))
    row = cur.fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if row["status"] == "received":
        conn.close()
        raise HTTPException(status_code=400, detail="Purchase order already received")

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{INVENTORY_URL}/api/v1/inventory/internal/restock",
            json={"item_id": row["item_id"], "quantity": row["quantity"]},
            headers={"X-Service-Token": SERVICE_TOKEN},
        )
    if resp.status_code != 200:
        conn.close()
        detail = resp.json().get("detail", "Failed to restock inventory")
        raise HTTPException(status_code=400, detail=detail)

    cur.execute("UPDATE purchase_orders SET status = 'received' WHERE id = ?", (po_id,))
    conn.commit()
    conn.close()

    return {"id": po_id, "message": "Purchase order received and inventory updated"}
