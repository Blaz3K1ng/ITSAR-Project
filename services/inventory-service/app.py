import os
import sqlite3
from typing import Optional

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

app = FastAPI(title="Inventory Service", version="1.0.0")
security = HTTPBearer()
DB_PATH = "/data/inventory.db"
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALG = "HS256"
SERVICE_TOKEN = os.getenv("SERVICE_TOKEN", "dev-service-token")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            unit_price REAL NOT NULL DEFAULT 0,
            reorder_level INTEGER NOT NULL DEFAULT 5
        )
        """
    )
    conn.commit()

    seeds = [
        ("CF-BEAN-001", "Arabica Beans 1kg", 120, 18.5, 20),
        ("CF-MILK-001", "Oat Milk 1L", 60, 2.8, 15),
        ("CF-CUP-001", "Paper Cups 100pcs", 40, 4.0, 10),
    ]
    for row in seeds:
        cur.execute(
            "INSERT OR IGNORE INTO items (sku, name, quantity, unit_price, reorder_level) VALUES (?, ?, ?, ?, ?)",
            row,
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


def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    return decode_token(credentials.credentials)


def require_service_token(x_service_token: Optional[str] = Header(default=None)) -> None:
    if x_service_token != SERVICE_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal service token",
        )


class ItemCreate(BaseModel):
    sku: str
    name: str
    quantity: int = Field(ge=0)
    unit_price: float = Field(ge=0)
    reorder_level: int = Field(ge=0)


class StockAdjust(BaseModel):
    item_id: int
    delta: int
    reason: str


class StockMove(BaseModel):
    item_id: int
    quantity: int = Field(gt=0)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "inventory-service"}


@app.get("/api/v1/inventory/items")
def list_items(_: dict = Depends(require_user)) -> dict:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM items ORDER BY id")
    rows = [dict(row) for row in cur.fetchall()]
    conn.close()
    return {"items": rows}


@app.post("/api/v1/inventory/items")
def create_item(payload: ItemCreate, _: dict = Depends(require_user)) -> dict:
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO items (sku, name, quantity, unit_price, reorder_level) VALUES (?, ?, ?, ?, ?)",
            (payload.sku, payload.name, payload.quantity, payload.unit_price, payload.reorder_level),
        )
        conn.commit()
        item_id = cur.lastrowid
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=400, detail="SKU already exists") from exc
    finally:
        conn.close()
    return {"id": item_id, "message": "Item created"}


@app.post("/api/v1/inventory/adjust")
def adjust_stock(payload: StockAdjust, _: dict = Depends(require_user)) -> dict:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT quantity FROM items WHERE id = ?", (payload.item_id,))
    row = cur.fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Item not found")

    new_qty = row["quantity"] + payload.delta
    if new_qty < 0:
        conn.close()
        raise HTTPException(status_code=400, detail="Insufficient stock")

    cur.execute("UPDATE items SET quantity = ? WHERE id = ?", (new_qty, payload.item_id))
    conn.commit()
    conn.close()

    return {
        "message": "Stock updated",
        "item_id": payload.item_id,
        "new_quantity": new_qty,
        "reason": payload.reason,
    }


@app.post("/api/v1/inventory/internal/reserve")
def reserve_stock(payload: StockMove, _: None = Depends(require_service_token)) -> dict:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT quantity FROM items WHERE id = ?", (payload.item_id,))
    row = cur.fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Item not found")

    if row["quantity"] < payload.quantity:
        conn.close()
        raise HTTPException(status_code=400, detail="Insufficient stock")

    new_qty = row["quantity"] - payload.quantity
    cur.execute("UPDATE items SET quantity = ? WHERE id = ?", (new_qty, payload.item_id))
    conn.commit()
    conn.close()
    return {"message": "Stock reserved", "item_id": payload.item_id, "new_quantity": new_qty}


@app.post("/api/v1/inventory/internal/restock")
def restock(payload: StockMove, _: None = Depends(require_service_token)) -> dict:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT quantity FROM items WHERE id = ?", (payload.item_id,))
    row = cur.fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Item not found")

    new_qty = row["quantity"] + payload.quantity
    cur.execute("UPDATE items SET quantity = ? WHERE id = ?", (new_qty, payload.item_id))
    conn.commit()
    conn.close()
    return {"message": "Stock replenished", "item_id": payload.item_id, "new_quantity": new_qty}
