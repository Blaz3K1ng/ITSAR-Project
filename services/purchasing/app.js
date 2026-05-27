const path = require("path");
const express = require("express");
const { createDatabase } = require("../../lib/db");
const { authorizeRoles } = require("../../lib/security");

const seedSuppliers = [
  { id: "sup-beans", name: "Highland Roasters", contactEmail: "beans@highland.example", category: "Coffee" },
  { id: "sup-dairy", name: "Fresh Oat Co", contactEmail: "oat@fresh.example", category: "Dairy Alternatives" },
  { id: "sup-packaging", name: "EcoPack Ltd", contactEmail: "cups@ecopack.example", category: "Packaging" },
];

const seedPurchaseOrders = [
  {
    id: "po-1001",
    supplierId: "sup-beans",
    itemName: "Arabica Beans",
    quantity: 20,
    status: "received",
    requestedBy: "buyer",
  },
];

async function createApp() {
  const db = await createDatabase(path.join(__dirname, "data", "purchasing.db"), [
    {
      name: "suppliers",
      options: { unique: ["id", "contactEmail"] },
      seed: seedSuppliers,
    },
    {
      name: "purchaseOrders",
      options: { unique: ["id"] },
      seed: seedPurchaseOrders,
    },
  ]);

  const suppliers = db.getCollection("suppliers");
  const purchaseOrders = db.getCollection("purchaseOrders");
  const app = express();

  app.use(express.json());

  app.get("/health", (req, res) => {
    res.json({ service: "purchasing-service", status: "ok" });
  });

  app.get("/api/v1/purchasing/suppliers", authorizeRoles(["admin", "manager", "buyer"]), (req, res) => {
    res.json({
      suppliers: suppliers
        .chain()
        .simplesort("name")
        .data()
        .map(({ meta, $loki, ...supplier }) => supplier),
    });
  });

  app.post("/api/v1/purchasing/suppliers", authorizeRoles(["admin", "manager", "buyer"]), (req, res) => {
    const { id, name, contactEmail, category } = req.body || {};

    if (!id || !name || !contactEmail) {
      res.status(400).json({ message: "id, name and contactEmail are required." });
      return;
    }

    if (suppliers.findOne({ id }) || suppliers.findOne({ contactEmail })) {
      res.status(409).json({ message: "Supplier already exists." });
      return;
    }

    const supplier = { id, name, contactEmail, category: category || "General" };
    suppliers.insert(supplier);
    db.saveDatabase();
    res.status(201).json({ supplier });
  });

  app.get("/api/v1/purchasing/purchase-orders", authorizeRoles(["admin", "manager", "buyer"]), (req, res) => {
    res.json({
      purchaseOrders: purchaseOrders
        .chain()
        .simplesort("id")
        .data()
        .map(({ meta, $loki, ...order }) => order),
    });
  });

  app.post("/api/v1/purchasing/purchase-orders", authorizeRoles(["admin", "manager", "buyer"]), (req, res) => {
    const { id, supplierId, itemName, quantity } = req.body || {};

    if (!id || !supplierId || !itemName || !quantity) {
      res.status(400).json({ message: "id, supplierId, itemName and quantity are required." });
      return;
    }

    if (purchaseOrders.findOne({ id })) {
      res.status(409).json({ message: "Purchase order already exists." });
      return;
    }

    const supplier = suppliers.findOne({ id: supplierId });
    if (!supplier) {
      res.status(404).json({ message: "Supplier not found." });
      return;
    }

    const purchaseOrder = {
      id,
      supplierId,
      itemName,
      quantity: Number(quantity),
      status: "requested",
      requestedBy: req.user.username,
    };

    purchaseOrders.insert(purchaseOrder);
    db.saveDatabase();

    res.status(201).json({ purchaseOrder });
  });

  return app;
}

module.exports = {
  createApp,
};
