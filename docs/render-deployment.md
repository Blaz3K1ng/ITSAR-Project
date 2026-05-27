# Render Deployment Guide (Live URL)

This guide deploys your ERP to Render using:
- 5 private backend services (`auth`, `inventory`, `sales`, `purchasing`, `crm`)
- 1 public gateway service
- 1 static frontend site

## 1. Pre-Deploy Notes

- Keep the repository structure as-is.
- Backend Dockerfiles already support `PORT` via `${PORT:-...}`.
- Each data-owning service should attach a persistent disk mounted at `/data` for SQLite persistence.

## 2. Create Backend Services (Render Dashboard)

Create each as **Web Service** with **Environment = Docker** from same repo.

### A) auth-service (Private)

- Name: `itsar-auth`
- Root Directory: `services/auth-service`
- Dockerfile Path: `services/auth-service/Dockerfile`
- Public Access: **Private**
- Environment Variables:
  - `JWT_SECRET=<strong-secret>`
- Persistent Disk:
  - Mount path: `/data`

### B) inventory-service (Private)

- Name: `itsar-inventory`
- Root Directory: `services/inventory-service`
- Dockerfile Path: `services/inventory-service/Dockerfile`
- Public Access: **Private**
- Environment Variables:
  - `JWT_SECRET=<same-strong-secret>`
  - `SERVICE_TOKEN=<internal-strong-token>`
- Persistent Disk:
  - Mount path: `/data`

### C) crm-service (Private)

- Name: `itsar-crm`
- Root Directory: `services/crm-service`
- Dockerfile Path: `services/crm-service/Dockerfile`
- Public Access: **Private**
- Environment Variables:
  - `JWT_SECRET=<same-strong-secret>`
  - `SERVICE_TOKEN=<same-internal-token>`
- Persistent Disk:
  - Mount path: `/data`

### D) sales-service (Private)

- Name: `itsar-sales`
- Root Directory: `services/sales-service`
- Dockerfile Path: `services/sales-service/Dockerfile`
- Public Access: **Private**
- Environment Variables:
  - `JWT_SECRET=<same-strong-secret>`
  - `SERVICE_TOKEN=<same-internal-token>`
  - `INVENTORY_URL=http://itsar-inventory:10000`
  - `CRM_URL=http://itsar-crm:10000`
- Persistent Disk:
  - Mount path: `/data`

### E) purchasing-service (Private)

- Name: `itsar-purchasing`
- Root Directory: `services/purchasing-service`
- Dockerfile Path: `services/purchasing-service/Dockerfile`
- Public Access: **Private**
- Environment Variables:
  - `JWT_SECRET=<same-strong-secret>`
  - `SERVICE_TOKEN=<same-internal-token>`
  - `INVENTORY_URL=http://itsar-inventory:10000`
- Persistent Disk:
  - Mount path: `/data`

## 3. Create Gateway Service (Public)

Create another **Web Service** with **Environment = Docker**:

- Name: `itsar-gateway`
- Root Directory: `gateway`
- Dockerfile Path: `gateway/Dockerfile`
- Public Access: **Public**
- Environment Variables:
  - `AUTH_URL=http://itsar-auth:10000`
  - `INVENTORY_URL=http://itsar-inventory:10000`
  - `SALES_URL=http://itsar-sales:10000`
  - `PURCHASING_URL=http://itsar-purchasing:10000`
  - `CRM_URL=http://itsar-crm:10000`

After deploy, note the public URL, e.g. `https://itsar-gateway.onrender.com`.

## 4. Create Frontend Static Site (Public)

Create a **Static Site** from same repo:

- Name: `itsar-frontend`
- Root Directory: `frontend`
- Build Command: *(leave empty)*
- Publish Directory: `.`

Open frontend URL and set gateway URL field to your gateway public URL.

Example:
- `https://itsar-gateway.onrender.com`

## 5. Smoke Tests (After Deployment)

1. Health:
- `GET https://itsar-gateway.onrender.com/health`

2. Login:
- `POST https://itsar-gateway.onrender.com/api/v1/auth/login`
- Body: `{ "username": "admin", "password": "admin123" }`

3. Protected endpoint:
- `GET https://itsar-gateway.onrender.com/api/v1/inventory/items`
- Header: `Authorization: Bearer <token>`

## 6. Common Issues

- 502 from gateway:
  - Usually one private service URL is wrong.
  - Confirm service names and `http://<service-name>:10000` env vars.

- Data lost after restart:
  - Persistent disk missing on `/data`.

- Unauthorized internal call:
  - `SERVICE_TOKEN` must match in `inventory`, `crm`, `sales`, `purchasing`.

- JWT invalid between services:
  - `JWT_SECRET` must match across all backend services.

## 7. Submission Assets to Include

- Frontend live URL (Render static site)
- Gateway live URL
- Screenshot of Render service list
- This deployment guide and test results
