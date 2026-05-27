# API Reference (Summary)

Gateway Base URL: `http://localhost:8000`

## Auth

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

## Inventory

- `GET /api/v1/inventory/items`
- `POST /api/v1/inventory/items`
- `POST /api/v1/inventory/adjust`
- `POST /api/v1/inventory/internal/reserve` (internal)
- `POST /api/v1/inventory/internal/restock` (internal)

## CRM

- `GET /api/v1/crm/customers`
- `POST /api/v1/crm/customers`
- `GET /api/v1/crm/internal/customers/{customer_id}` (internal)

## Sales

- `GET /api/v1/sales/orders`
- `POST /api/v1/sales/orders`

## Purchasing

- `GET /api/v1/purchasing/suppliers`
- `POST /api/v1/purchasing/suppliers`
- `GET /api/v1/purchasing/purchase-orders`
- `POST /api/v1/purchasing/purchase-orders`
- `POST /api/v1/purchasing/purchase-orders/{po_id}/receive`

## Auth Header

For protected endpoints:

`Authorization: Bearer <token>`
