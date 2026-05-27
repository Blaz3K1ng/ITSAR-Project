const path = require("path");
const express = require("express");
const { createDatabase } = require("../../lib/db");
const { authenticateRequest, issueToken } = require("../../lib/security");

const seedUsers = [
  { id: "usr-admin", username: "admin", password: "admin123", role: "admin", fullName: "Amina Admin" },
  { id: "usr-manager", username: "manager", password: "manager123", role: "manager", fullName: "Musa Manager" },
  { id: "usr-cashier", username: "cashier", password: "cashier123", role: "cashier", fullName: "Nia Cashier" },
  { id: "usr-buyer", username: "buyer", password: "buyer123", role: "buyer", fullName: "Kwesi Buyer" },
  { id: "usr-marketing", username: "marketing", password: "marketing123", role: "marketing", fullName: "Lina Marketing" },
];

async function createApp() {
  const db = await createDatabase(path.join(__dirname, "data", "auth.db"), [
    {
      name: "users",
      options: { unique: ["id", "username"] },
      seed: seedUsers,
    },
  ]);

  const users = db.getCollection("users");
  const app = express();

  app.use(express.json());

  app.get("/health", (req, res) => {
    res.json({ service: "auth-service", status: "ok" });
  });

  app.post("/api/v1/auth/login", (req, res) => {
    const { username, password } = req.body || {};
    const user = users.findOne({ username });

    if (!user || user.password !== password) {
      res.status(401).json({ message: "Invalid username or password." });
      return;
    }

    const token = issueToken({
      sub: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
    });
  });

  app.get("/api/v1/auth/me", authenticateRequest, (req, res) => {
    res.json({ user: req.user });
  });

  return app;
}

module.exports = {
  createApp,
};
