const path = require("path");
const express = require("express");
const { createDatabase } = require("../../lib/db");
const { createApiRateLimiter } = require("../../lib/rate-limit");
const { authorizeRoles, authorizeRolesOrService } = require("../../lib/security");

const seedCustomers = [
  {
    id: "crm-aisha",
    name: "Aisha Bello",
    email: "aisha@example.com",
    loyaltyPoints: 18,
    segment: "Gold",
  },
  {
    id: "crm-daniel",
    name: "Daniel Mensah",
    email: "daniel@example.com",
    loyaltyPoints: 7,
    segment: "Silver",
  },
];

async function createApp() {
  const db = await createDatabase(path.join(__dirname, "data", "crm.db"), [
    {
      name: "customers",
      options: { unique: ["id", "email"] },
      seed: seedCustomers,
    },
  ]);

  const customers = db.getCollection("customers");
  const app = express();

  app.use(express.json());
  app.use("/api/v1", createApiRateLimiter());

  app.get("/health", (req, res) => {
    res.json({ service: "crm-service", status: "ok" });
  });

  app.get("/api/v1/crm/customers", authorizeRoles(["admin", "manager", "cashier", "marketing"]), (req, res) => {
    res.json({
      customers: customers
        .chain()
        .simplesort("name")
        .data()
        .map(({ meta, $loki, ...customer }) => customer),
    });
  });

  app.post("/api/v1/crm/customers", authorizeRoles(["admin", "manager", "cashier", "marketing"]), (req, res) => {
    const { id, name, email, segment } = req.body || {};

    if (!id || !name || !email) {
      res.status(400).json({ message: "id, name and email are required." });
      return;
    }

    if (customers.findOne({ id }) || customers.findOne({ email })) {
      res.status(409).json({ message: "Customer already exists." });
      return;
    }

    const customer = {
      id,
      name,
      email,
      loyaltyPoints: 0,
      segment: segment || "Bronze",
    };

    customers.insert(customer);
    db.saveDatabase();

    res.status(201).json({ customer });
  });

  app.post(
    "/api/v1/crm/customers/:customerId/loyalty",
    authorizeRolesOrService(["admin", "manager", "cashier"]),
    (req, res) => {
      const customer = customers.findOne({ id: req.params.customerId });

      if (!customer) {
        res.status(404).json({ message: "Customer not found." });
        return;
      }

      const additionalPoints = Number(req.body?.points || 0);

      if (additionalPoints <= 0) {
        res.status(400).json({ message: "Points must be greater than zero." });
        return;
      }

      customer.loyaltyPoints += additionalPoints;
      if (customer.loyaltyPoints >= 20) {
        customer.segment = "Gold";
      } else if (customer.loyaltyPoints >= 10) {
        customer.segment = "Silver";
      }
      customers.update(customer);
      db.saveDatabase();

      const { meta, $loki, ...cleanCustomer } = customer;
      res.json({ customer: cleanCustomer });
    }
  );

  return app;
}

module.exports = {
  createApp,
};
