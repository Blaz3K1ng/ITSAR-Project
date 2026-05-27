# ITSAR Mini ERP (Microservices)

This project is a full mini ERP system for a fictional regional coffee chain called **ITSAR Coffee Group**.

## Services

- `gateway` (port 8000): single API entry point and routing
- `auth-service` (port 8001): login and JWT issuance
- `inventory-service` (port 8002): stock and item management
- `sales-service` (port 8003): order creation and listing
- `purchasing-service` (port 8004): suppliers and purchase receiving
- `crm-service` (port 8005): customer management
- `frontend` (port 8080): web UI to run business flows

## Required Requirements Mapping

- Microservices with independent data stores: each service owns its own SQLite DB in `/data`.
- API Gateway: implemented by `gateway` service.
- Inter-service communication: 
  - `sales-service` calls `crm-service` and `inventory-service`
  - `purchasing-service` calls `inventory-service`
- Authentication/Authorization: JWT + role-based checks.
- Containerization and orchestration: Dockerfiles + Docker Compose.

## Quick Start

1. Copy environment file:

```bash
cp .env.example .env
```

2. Start all services:

```bash
docker compose up --build
```

3. Open frontend:

- http://localhost:8080

4. Login using seeded user:

- username: `admin`
- password: `admin123`

## Core API Prefixes

- `/api/v1/auth/*`
- `/api/v1/inventory/*`
- `/api/v1/sales/*`
- `/api/v1/purchasing/*`
- `/api/v1/crm/*`

## Documentation

- Business doc: `docs/business.md`
- Technical doc: `docs/technical.md`
- Deployment guide: `docs/deployment.md`
- Render deployment guide: `docs/render-deployment.md`
- API reference: `docs/api.md`
- Architecture diagrams: `docs/architecture-diagrams.md`
- Demo video script: `docs/demo-script.md`
- Architectural defense Q&A prep: `docs/defense-qa.md`
- OpenAPI specs:
  - `docs/openapi/auth-service.yaml`
  - `docs/openapi/inventory-service.yaml`
  - `docs/openapi/sales-service.yaml`
  - `docs/openapi/purchasing-service.yaml`
  - `docs/openapi/crm-service.yaml`
