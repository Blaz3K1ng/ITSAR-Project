const path = require("path");
const express = require("express");
const { createDatabase } = require("../../lib/db");
const { createApiRateLimiter } = require("../../lib/rate-limit");
const { authorizeRoles } = require("../../lib/security");
const { resolveServiceBaseUrl } = require("../../lib/service-url");

async function postInternalJson(serviceName, routePath, body) {
  const url = new URL(routePath, resolveServiceBaseUrl(serviceName));
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-service-token": process.env.SERVICE_TOKEN || "internal-service-token",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || `Request to ${url.toString()} failed.`);
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

async function createApp() {
  const db = await createDatabase(path.join(__dirname, "data", "sales.db"), [
    {
      name: "orders",
      options: { unique: ["id"] },
      seed: [],
    },
  ]);

  const orders = db.getCollection("orders");
  const app = express();

  app.use(express.json());
  app.use("/api/v1", createApiRateLimiter());

  app.get("/health", (req, res) => {
    res.json({ service: "sales-service", status: "ok" });
  });

  app.get("/api/v1/sales/orders", authorizeRoles(["admin", "manager", "cashier"]), (req, res) => {
    res.json({
      orders: orders
        .chain()
        .simplesort("createdAt", true)
        .data()
        .map(({ meta, $loki, ...order }) => order),
    });
  });

  app.post("/api/v1/sales/orders", authorizeRoles(["admin", "manager", "cashier"]), async (req, res) => {
    const { id, customerId, lineItems, paymentMethod } = req.body || {};

    if (!id || !Array.isArray(lineItems) || lineItems.length === 0 || !paymentMethod) {
      res.status(400).json({ message: "id, lineItems and paymentMethod are required." });
      return;
    }

    if (orders.findOne({ id })) {
      res.status(409).json({ message: "Order already exists." });
      return;
    }

    try {
      const inventoryPayload = await postInternalJson(
        "inventory",
        "/api/v1/inventory/reserve",
        { lineItems }
      );

      const total = inventoryPayload.reservedItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      const order = {
        id,
        customerId: customerId || null,
        lineItems: inventoryPayload.reservedItems,
        total,
        paymentMethod,
        status: "confirmed",
        createdAt: new Date().toISOString(),
        createdBy: req.user.username,
      };

      orders.insert(order);
      db.saveDatabase();

      let updatedCustomer = null;
      let warning = null;
      if (customerId) {
        try {
          const points = Math.max(1, Math.floor(total / 5));
          const crmPayload = await postInternalJson(
            "crm",
            `/api/v1/crm/customers/${encodeURIComponent(customerId)}/loyalty`,
            { points }
          );
          updatedCustomer = crmPayload.customer;
        } catch (error) {
          warning = "Order was created, but loyalty points could not be updated.";
        }
      }

      const { meta, $loki, ...cleanOrder } = order;

      res.status(201).json({
        order: cleanOrder,
        lowStock: inventoryPayload.lowStock,
        updatedCustomer,
        warning,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  });

  return app;
}

module.exports = {
  createApp,
};
