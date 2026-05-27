import os
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

app = FastAPI(title="Auth Service", version="1.0.0")
security = HTTPBearer()
DB_PATH = "/data/auth.db"
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALG = "HS256"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
        """
    )
    conn.commit()

    users = [
        ("admin", "admin123", "admin"),
        ("manager", "manager123", "manager"),
        ("staff", "staff123", "staff"),
    ]
    for username, password, role in users:
        cur.execute(
            "INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)",
            (username, password, role),
        )
    conn.commit()
    conn.close()


@app.on_event("startup")
def startup() -> None:
    init_db()


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


def create_token(user_id: int, username: str, role: str) -> str:
    exp = datetime.now(tz=timezone.utc) + timedelta(hours=8)
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "exp": exp,
        "iat": datetime.now(tz=timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    return decode_token(credentials.credentials)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "auth-service"}


@app.post("/api/v1/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, username, password, role FROM users WHERE username = ?",
        (payload.username,),
    )
    row: Optional[sqlite3.Row] = cur.fetchone()
    conn.close()

    if row is None or row["password"] != payload.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_token(row["id"], row["username"], row["role"])
    return TokenResponse(access_token=token, role=row["role"])


@app.get("/api/v1/auth/me")
def me(user: dict = Depends(get_current_user)) -> dict:
    return {
        "id": user.get("sub"),
        "username": user.get("username"),
        "role": user.get("role"),
    }
