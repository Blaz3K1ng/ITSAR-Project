# ITSAR-Project

This repository now contains a minimal but working microservices ERP implementation for the ITSAR capstone brief.

## Project Deliverables in the Repository
- **Business documentation:** [`docs/business-documentation.md`](./docs/business-documentation.md)
- **Technical documentation:** [`docs/technical-documentation.md`](./docs/technical-documentation.md)
- **API specification:** [`docs/openapi.yaml`](./docs/openapi.yaml)
- **Deployment guide:** [`docs/deployment-guide.md`](./docs/deployment-guide.md)
- **Source code:** auth service, four ERP module services, API gateway, and frontend
- **Container orchestration:** [`docker-compose.yml`](./docker-compose.yml)

## Implemented Modules
- Authentication and authorization service
- Inventory and Stock Management
- Sales and Order Management
- Purchasing and Supplier Management
- Customer Relationship Management (CRM)

## Quick Start
```bash
npm install
docker compose up --build
```

Open `http://localhost:4000` to use the ERP dashboard.