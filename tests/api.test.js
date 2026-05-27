const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const request = require("supertest");
const { createApp: createAuthApp } = require("../services/auth/app");
const { createApp: createInventoryApp } = require("../services/inventory/app");
const { createApp: createSalesApp } = require("../services/sales/app");
const { createApp: createGatewayApp } = require("../gateway/app");

function resetDatabases() {
  for (const databasePath of [
    path.join(__dirname, "..", "services", "auth", "data", "auth.db"),
    path.join(__dirname, "..", "services", "inventory", "data", "inventory.db"),
    path.join(__dirname, "..", "services", "sales", "data", "sales.db"),
  ]) {
    fs.rmSync(databasePath, { force: true });
  }
}

test("auth service issues a JWT for seeded users", { concurrency: false }, async () => {
  resetDatabases();
  const app = await createAuthApp();

  const response = await request(app).post("/api/v1/auth/login").send({
    username: "manager",
    password: "manager123",
  });

  assert.equal(response.status, 200);
  assert.ok(response.body.token);
  assert.equal(response.body.user.role, "manager");
});

test("inventory service reserves stock for authorized users", { concurrency: false }, async () => {
  resetDatabases();
  const authApp = await createAuthApp();
  const inventoryApp = await createInventoryApp();

  const loginResponse = await request(authApp).post("/api/v1/auth/login").send({
    username: "cashier",
    password: "cashier123",
  });

  const response = await request(inventoryApp)
    .post("/api/v1/inventory/reserve")
    .set("Authorization", "Bearer " + loginResponse.body.token)
    .send({
      lineItems: [{ itemId: "inv-milk", quantity: 2 }],
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.reservedItems[0].itemId, "inv-milk");
  assert.equal(response.body.reservedItems[0].remainingQuantity, 23);
});

test("sales service creates an order and propagates loyalty updates", { concurrency: false }, async () => {
  resetDatabases();
  const authApp = await createAuthApp();
  const salesApp = await createSalesApp();

  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const requestUrl = String(url);

    if (requestUrl.includes("/inventory/reserve")) {
      return {
        ok: true,
        json: async () => ({
          reservedItems: [{ itemId: "inv-beans", name: "Arabica Beans", quantity: 2, unitPrice: 8 }],
          lowStock: [],
        }),
      };
    }

    return {
      ok: true,
      json: async () => ({
        customer: { id: "crm-aisha", loyaltyPoints: 21, segment: "Gold" },
      }),
    };
  };

  const loginResponse = await request(authApp).post("/api/v1/auth/login").send({
    username: "cashier",
    password: "cashier123",
  });

  const response = await request(salesApp)
    .post("/api/v1/sales/orders")
    .set("Authorization", "Bearer " + loginResponse.body.token)
    .send({
      id: "sale-test",
      customerId: "crm-aisha",
      lineItems: [{ itemId: "inv-beans", quantity: 2 }],
      paymentMethod: "card",
    });

  global.fetch = originalFetch;

  assert.equal(response.status, 201);
  assert.equal(response.body.order.total, 16);
  assert.equal(response.body.updatedCustomer.loyaltyPoints, 21);
});

test("gateway preserves mounted auth path when proxying", { concurrency: false }, async () => {
  const upstream = express();
  upstream.use(express.json());
  upstream.post("/api/v1/auth/login", (req, res) => {
    res.json({ proxied: true, username: req.body.username });
  });

  const server = upstream.listen(0);
  const address = server.address();
  const previousAuthUrl = process.env.AUTH_SERVICE_URL;
  process.env.AUTH_SERVICE_URL = `http://127.0.0.1:${address.port}`;

  try {
    const gatewayApp = createGatewayApp();
    const response = await request(gatewayApp).post("/api/v1/auth/login").send({
      username: "manager",
      password: "manager123",
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.proxied, true);
    assert.equal(response.body.username, "manager");
  } finally {
    process.env.AUTH_SERVICE_URL = previousAuthUrl;
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});
