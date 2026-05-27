import os

import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ERP API Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVICE_MAP = {
    "auth": os.getenv("AUTH_URL", "http://auth-service:8001"),
    "inventory": os.getenv("INVENTORY_URL", "http://inventory-service:8002"),
    "sales": os.getenv("SALES_URL", "http://sales-service:8003"),
    "purchasing": os.getenv("PURCHASING_URL", "http://purchasing-service:8004"),
    "crm": os.getenv("CRM_URL", "http://crm-service:8005"),
}


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "gateway"}


async def forward_request(request: Request, service_key: str, subpath: str) -> Response:
    base_url = SERVICE_MAP.get(service_key)
    if base_url is None:
        raise HTTPException(status_code=404, detail="Unknown service")

    target_url = f"{base_url}/api/v1/{service_key}/{subpath}".rstrip("/")
    if not subpath:
        target_url = f"{base_url}/api/v1/{service_key}"

    headers = {k: v for k, v in request.headers.items() if k.lower() != "host"}
    body = await request.body()

    async with httpx.AsyncClient(timeout=20.0) as client:
        upstream_response = await client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            params=dict(request.query_params),
            content=body,
        )

    filtered_headers = {
        k: v
        for k, v in upstream_response.headers.items()
        if k.lower() not in {"content-encoding", "transfer-encoding", "connection"}
    }

    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers=filtered_headers,
        media_type=upstream_response.headers.get("content-type"),
    )


@app.api_route("/api/v1/{service_key}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_root(request: Request, service_key: str) -> Response:
    return await forward_request(request, service_key, "")


@app.api_route(
    "/api/v1/{service_key}/{subpath:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def proxy_subpath(request: Request, service_key: str, subpath: str) -> Response:
    return await forward_request(request, service_key, subpath)
