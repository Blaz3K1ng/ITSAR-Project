# Deployment Guide

## Local Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the full stack:
   ```bash
   docker compose up --build
   ```
3. Open the gateway at `http://localhost:4000`.

## Manual Non-Docker Run
Start each service in a separate shell:
```bash
PORT=4001 node services/auth/server.js
PORT=4002 node services/inventory/server.js
PORT=4003 INVENTORY_SERVICE_URL=http://localhost:4002 CRM_SERVICE_URL=http://localhost:4005 node services/sales/server.js
PORT=4004 node services/purchasing/server.js
PORT=4005 node services/crm/server.js
PORT=4000 AUTH_SERVICE_URL=http://localhost:4001 INVENTORY_SERVICE_URL=http://localhost:4002 SALES_SERVICE_URL=http://localhost:4003 PURCHASING_SERVICE_URL=http://localhost:4004 CRM_SERVICE_URL=http://localhost:4005 node gateway/server.js
```

## Production Deployment Notes
- Build and deploy the same containers to a public platform such as Render, Fly.io, Railway, or a VPS.
- Set `JWT_SECRET` and `SERVICE_TOKEN` to strong environment-specific secrets.
- Expose only the gateway publicly; keep business services on the private network.
- Persist each service datastore on durable volumes if running beyond demo use.

## Demo Credentials
- `admin / admin123`
- `manager / manager123`
- `cashier / cashier123`
- `buyer / buyer123`
- `marketing / marketing123`
