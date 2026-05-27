import os
import sqlite3
from typing import Optional

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

app = FastAPI(title="CRM Service", version="1.0.0")
security = HTTPBearer()
DB_PATH = "/data/crm.db"
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
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            tier TEXT NOT NULL DEFAULT 'standard'
        )
        """
    )
    conn.commit()

    seeds = [
        ("Alice Khan", "alice@itsarcoffee.com", "555-1200", "gold"),
        ("Ben Li", "ben@itsarcoffee.com", "555-1201", "silver"),
    ]
    for row in seeds:
        cur.execute(
            "INSERT OR IGNORE INTO customers (name, email, phone, tier) VALUES (?, ?, ?, ?)",
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


def require_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    return decode_token(credentials.credentials)


def require_service_token(x_service_token: Optional[str] = Header(default=None)) -> None:
    if x_service_token != SERVICE_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid internal service token")


class CustomerCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    tier: str = "standard"


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "crm-service"}


@app.get("/api/v1/crm/customers")
def list_customers(_: dict = Depends(require_user)) -> dict:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM customers ORDER BY id")
    rows = [dict(row) for row in cur.fetchall()]
    conn.close()
    return {"customers": rows}


@app.post("/api/v1/crm/customers")
def create_customer(payload: CustomerCreate, _: dict = Depends(require_user)) -> dict:
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO customers (name, email, phone, tier) VALUES (?, ?, ?, ?)",
            (payload.name, payload.email, payload.phone, payload.tier),
        )
        conn.commit()
        customer_id = cur.lastrowid
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=400, detail="Email already exists") from exc
    finally:
        conn.close()

    return {"id": customer_id, "message": "Customer created"}


@app.get("/api/v1/crm/internal/customers/{customer_id}")
def internal_get_customer(customer_id: int, _: None = Depends(require_service_token)) -> dict:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
    row = cur.fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"customer": dict(row)}
