import os
import sqlite3
from datetime import datetime

import httpx
import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

app = FastAPI(title="Sales Service", version="1.0.0")
security = HTTPBearer()
DB_PATH = "/data/sales.db"
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALG = "HS256"
SERVICE_TOKEN = os.getenv("SERVICE_TOKEN", "dev-service-token")
INVENTORY_URL = os.getenv("INVENTORY_URL", "http://inventory-service:8002")
CRM_URL = os.getenv("CRM_URL", "http://crm-service:8005")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            total REAL NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
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


class OrderCreate(BaseModel):
    customer_id: int
    item_id: int
    quantity: int = Field(gt=0)
    unit_price: float = Field(gt=0)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "sales-service"}


@app.get("/api/v1/sales/orders")
def list_orders(_: dict = Depends(require_user)) -> dict:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM orders ORDER BY id DESC")
    rows = [dict(row) for row in cur.fetchall()]
    conn.close()
    return {"orders": rows}


@app.post("/api/v1/sales/orders")
async def create_order(payload: OrderCreate, user: dict = Depends(require_user)) -> dict:
    if user.get("role") not in {"admin", "manager", "staff"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    headers = {"X-Service-Token": SERVICE_TOKEN}
    async with httpx.AsyncClient(timeout=10.0) as client:
        customer_resp = await client.get(
            f"{CRM_URL}/api/v1/crm/internal/customers/{payload.customer_id}",
            headers=headers,
        )
        if customer_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid customer")

        reserve_resp = await client.post(
            f"{INVENTORY_URL}/api/v1/inventory/internal/reserve",
            json={"item_id": payload.item_id, "quantity": payload.quantity},
            headers=headers,
        )
        if reserve_resp.status_code != 200:
            detail = reserve_resp.json().get("detail", "Stock reservation failed")
            raise HTTPException(status_code=400, detail=detail)

    total = round(payload.quantity * payload.unit_price, 2)
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO orders (customer_id, item_id, quantity, unit_price, total, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload.customer_id,
            payload.item_id,
            payload.quantity,
            payload.unit_price,
            total,
            "confirmed",
            datetime.utcnow().isoformat(),
        ),
    )
    conn.commit()
    order_id = cur.lastrowid
    conn.close()

    return {"id": order_id, "message": "Order created", "total": total}
