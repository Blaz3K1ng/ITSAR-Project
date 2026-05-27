# BrewBridge Coffee Co. — ERP System

A mini Enterprise Resource Planning (ERP) system for **BrewBridge Coffee Co.**, a fictional regional coffee shop chain with 5 locations. Built with a microservices architecture.

---

## Architecture Overview

```
                      ┌─────────────────┐
                      │    Frontend     │
                      │  React + Vite   │
                      │   Port: 5173    │
                      └────────┬────────┘
                               │
                      ┌────────▼────────┐
                      │   API Gateway   │
                      │     Nginx       │
                      │    Port: 80     │
                      └────────┬────────┘
         ┌──────────┬──────────┼────────────┬──────────┐
         │          │          │            │          │
  ┌──────▼───┐ ┌────▼─────┐ ┌─▼──────┐ ┌───▼────┐ ┌───▼─────┐
  │  auth    │ │inventory │ │ sales  │ │   hr   │ │   crm   │
  │ :3001    │ │  :3002   │ │ :3003  │ │  :3004 │ │  :3005  │
  └──────┬───┘ └────┬─────┘ └─┬──────┘ └───┬────┘ └───┬─────┘
         │          │          │             │          │
      auth-db  inventory-db  sales-db      hr-db    crm-db
                    ▲          │
                    │          │  RabbitMQ
                    └──────────┘  order.placed
```

---

## Services

| Service | Port | Description |
|---|---|---|
| auth-service | 3001 | JWT authentication & user management |
| inventory-service | 3002 | Stock items, suppliers, alerts |
| sales-service | 3003 | Orders, POS, invoices |
| hr-service | 3004 | Employees, shifts, payroll |
| crm-service | 3005 | Customers, loyalty, feedback |
| api-gateway | 80 | Nginx reverse proxy |
| frontend | 5173 | React dashboard |

---

## Prerequisites

- [Docker](https://www.docker.com/) & Docker Compose
- Node.js 18+ (for local development)
- Git

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Blaz3K1ng/ITSAR-Project.git
cd ITSAR-Project

# 2. Set up environment variables
cp .env.example .env

# 3. Start all services
docker-compose up --build

# 4. Access the application
# Frontend:  http://localhost
# RabbitMQ:  http://localhost:15672  (guest/guest)
```

---

## API Documentation (Swagger)

| Service | Swagger URL |
|---|---|
| auth-service | http://localhost/api/v1/auth/docs |
| inventory-service | http://localhost/api/v1/inventory/docs |
| sales-service | http://localhost/api/v1/sales/docs |
| hr-service | http://localhost/api/v1/hr/docs |
| crm-service | http://localhost/api/v1/crm/docs |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend Services | Node.js + Express |
| Databases | PostgreSQL (one per service) |
| Message Broker | RabbitMQ |
| Authentication | JWT + bcrypt |
| API Gateway | Nginx |
| Frontend | React + Vite + TailwindCSS |
| Containerization | Docker + Docker Compose |
| API Docs | Swagger (swagger-ui-express) |

---

## Team Members

| Name | GitHub | Responsibilities |
|---|---|---|
| Member 1 | @Blaz3K1ng | sales-service + frontend |
| Member 2 | - | inventory-service + RabbitMQ |
| Member 3 | - | auth-service + api-gateway |
| Member 4 | - | hr-service + crm-service + deployment |

---

## Project Structure

```
ITSAR-Project/
├── services/
│   ├── auth-service/
│   ├── inventory-service/
│   ├── sales-service/
│   ├── hr-service/
│   └── crm-service/
├── gateway/
├── frontend/
├── docs/
│   ├── business/
│   └── technical/
├── docker-compose.yml
├── .env.example
└── README.md
```
