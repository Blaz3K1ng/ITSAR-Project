# Demo Video Script (5-10 Minutes)

## 0:00 - 0:45 Intro

- Introduce team and business: ITSAR Coffee Group.
- Problem statement: stock mismatch, disconnected operations, weak customer visibility.
- Solution summary: microservices ERP with isolated databases and API gateway.

## 0:45 - 1:45 Architecture Snapshot

- Show architecture diagram.
- Explain each service in one sentence:
  - Auth issues JWTs
  - Inventory owns stock data
  - CRM owns customer data
  - Sales handles orders and reserves stock
  - Purchasing handles supplier lifecycle and restocking

## 1:45 - 3:15 Login and Access Control

- Open frontend.
- Login as admin (`admin/admin123`).
- Mention role-based access and JWT-protected endpoints.

## 3:15 - 5:30 Core Flow 1: Sales Order

- Load inventory and customers.
- Create a sales order.
- Explain technical flow: Sales validates customer via CRM and reserves stock via Inventory.
- Show order success and inventory quantity impact.

## 5:30 - 7:15 Core Flow 2: Purchasing Receive

- Create purchase order.
- Receive the purchase order.
- Explain technical flow: Purchasing calls Inventory internal restock endpoint.
- Show increased stock quantity.

## 7:15 - 8:30 Deployment + Reliability

- Show Docker Compose setup.
- Mention health endpoints and independent service deployment.
- Mention no shared database policy.

## 8:30 - 9:30 Wrap-up

- Reconnect implementation to business pain points.
- Mention possible future enhancements (analytics, message broker, Kubernetes).
