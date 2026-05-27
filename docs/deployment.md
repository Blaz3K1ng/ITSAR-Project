# Deployment Guide

## 1. Prerequisites

- Docker
- Docker Compose
- Public host (Render, Railway, Fly.io, Azure VM, AWS EC2, DigitalOcean, etc.)

## 2. Local Run

1. Copy env:

```bash
cp .env.example .env
```

2. Build and start:

```bash
docker compose up --build
```

3. Access:

- Frontend: `http://localhost:8080`
- Gateway: `http://localhost:8000`

## 3. Test Credentials

- Admin: `admin` / `admin123`
- Manager: `manager` / `manager123`
- Staff: `staff` / `staff123`

## 4. Production Notes

- Change `JWT_SECRET` and `SERVICE_TOKEN` in production.
- Place gateway behind HTTPS reverse proxy (Nginx/Traefik/Caddy).
- Restrict internal service ports from public internet.
- Mount persistent volumes for `./data/*` paths.
- Configure automatic restart and health checks.

## 5. Public URL Requirement

Deploy the stack and provide:

- Frontend URL (demo-ready)
- Gateway URL (if needed for API checks)

Ensure URL remains active through presentation date.
