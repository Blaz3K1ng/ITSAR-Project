# Data Models

## Auth Service (`auth.db`)

### users

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto increment |
| username | TEXT UNIQUE | Login name |
| password | TEXT | Demo plaintext for class project |
| role | TEXT | admin, manager, staff |

## Inventory Service (`inventory.db`)

### items

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto increment |
| sku | TEXT UNIQUE | Product SKU |
| name | TEXT | Product name |
| quantity | INTEGER | Current stock |
| unit_price | REAL | Unit cost/price |
| reorder_level | INTEGER | Threshold for replenishment |

## CRM Service (`crm.db`)

### customers

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto increment |
| name | TEXT | Customer full name |
| email | TEXT UNIQUE | Customer email |
| phone | TEXT | Contact number |
| tier | TEXT | standard, silver, gold |

## Sales Service (`sales.db`)

### orders

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto increment |
| customer_id | INTEGER | Ref CRM customer ID |
| item_id | INTEGER | Ref Inventory item ID |
| quantity | INTEGER | Ordered quantity |
| unit_price | REAL | Sale price per unit |
| total | REAL | Calculated total |
| status | TEXT | confirmed |
| created_at | TEXT | ISO datetime |

## Purchasing Service (`purchasing.db`)

### suppliers

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto increment |
| name | TEXT | Supplier name |
| contact_email | TEXT UNIQUE | Supplier contact |

### purchase_orders

| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto increment |
| supplier_id | INTEGER | Ref suppliers.id |
| item_id | INTEGER | Ref inventory item ID |
| quantity | INTEGER | Ordered quantity |
| status | TEXT | ordered, received |
| created_at | TEXT | ISO datetime |
