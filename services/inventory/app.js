const path = require("path");
const express = require("express");
const { createDatabase } = require("../../lib/db");
const { createApiRateLimiter } = require("../../lib/rate-limit");
const { authorizeRoles, authorizeRolesOrService } = require("../../lib/security");

const seedItems = [
  {
    id: "inv-beans",
    sku: "INV-001",
    name: "Arabica Beans",
    quantity: 40,
    reorderLevel: 12,
    unitPrice: 8,
    supplierId: "sup-beans",
  },
  {
    id: "inv-milk",
    sku: "INV-002",
    name: "Oat Milk",
    quantity: 25,
    reorderLevel: 10,
    unitPrice: 4,
    supplierId: "sup-dairy",
  },
  {
    id: "inv-cups",
    sku: "INV-003",
    name: "Compostable Cups",
    quantity: 100,
    reorderLevel: 30,
    unitPrice: 1,
    supplierId: "sup-packaging",
  },
];

async function createApp() {
  const db = await createDatabase(path.join(__dirname, "data", "inventory.db"), [
    {
      name: "items",
      options: { unique: ["id", "sku"] },
      seed: seedItems,
    },
  ]);

  const items = db.getCollection("items");
  const app = express();

  app.use(express.json());
  app.use("/api/v1", createApiRateLimiter());

  app.get("/health", (req, res) => {
    res.json({ service: "inventory-service", status: "ok" });
  });

  app.get("/api/v1/inventory/items", authorizeRoles(["admin", "manager", "cashier", "buyer"]), (req, res) => {
    res.json({
      items: items
        .chain()
        .simplesort("name")
        .data()
        .map(({ meta, $loki, ...item }) => item),
    });
  });

  app.get("/api/v1/inventory/low-stock", authorizeRoles(["admin", "manager", "buyer"]), (req, res) => {
    res.json({
      items: items
        .find()
        .filter((item) => item.quantity <= item.reorderLevel)
        .map(({ meta, $loki, ...item }) => item),
    });
  });

  app.post("/api/v1/inventory/items", authorizeRoles(["admin", "manager", "buyer"]), (req, res) => {
    const { id, sku, name, quantity, reorderLevel, unitPrice, supplierId } = req.body || {};

    if (!id || !sku || !name) {
      res.status(400).json({ message: "id, sku and name are required." });
      return;
    }

    if (items.findOne({ id }) || items.findOne({ sku })) {
      res.status(409).json({ message: "Item already exists." });
      return;
    }

    const item = {
      id,
      sku,
      name,
      quantity: Number(quantity || 0),
      reorderLevel: Number(reorderLevel || 0),
      unitPrice: Number(unitPrice || 0),
      supplierId: supplierId || "",
    };

    items.insert(item);
    db.saveDatabase();

    res.status(201).json({ item });
  });

  app.post("/api/v1/inventory/reserve", authorizeRolesOrService(["admin", "manager", "cashier"]), (req, res) => {
    const lineItems = Array.isArray(req.body?.lineItems) ? req.body.lineItems : [];

    if (lineItems.length === 0) {
      res.status(400).json({ message: "At least one line item is required." });
      return;
    }

    const reservedItems = [];

    for (const lineItem of lineItems) {
      const item = items.findOne({ id: lineItem.itemId });

      if (!item) {
        res.status(404).json({ message: `Inventory item ${lineItem.itemId} not found.` });
        return;
      }

      const quantity = Number(lineItem.quantity || 0);

      if (quantity <= 0) {
        res.status(400).json({ message: "Reserved quantity must be greater than zero." });
        return;
      }

      if (item.quantity < quantity) {
        res.status(409).json({ message: `Insufficient stock for ${item.name}.` });
        return;
      }
    }

    for (const lineItem of lineItems) {
      const item = items.findOne({ id: lineItem.itemId });
      item.quantity -= Number(lineItem.quantity);
      items.update(item);
      reservedItems.push({
        itemId: item.id,
        name: item.name,
        quantity: Number(lineItem.quantity),
        unitPrice: item.unitPrice,
        remainingQuantity: item.quantity,
      });
    }

    db.saveDatabase();

    const lowStock = items
      .find()
      .filter((item) => item.quantity <= item.reorderLevel)
      .map(({ meta, $loki, ...item }) => item);

    res.json({ reservedItems, lowStock });
  });

  return app;
}

module.exports = {
  createApp,
};
