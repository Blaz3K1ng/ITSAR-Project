const path = require("path");
const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { createApiRateLimiter } = require("../lib/rate-limit");

function createProxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 5000,
    pathRewrite: (_path, req) => req.originalUrl,
  });
}

function createApp() {
  const app = express();
  const frontendDir = path.join(__dirname, "..", "frontend");

  app.use(cors());
  app.use(createApiRateLimiter());
  app.use(express.static(frontendDir));

  app.get("/health", (req, res) => {
    res.json({ service: "api-gateway", status: "ok" });
  });

  app.use("/api/v1/auth", createProxy(process.env.AUTH_SERVICE_URL || "http://localhost:4001"));
  app.use("/api/v1/inventory", createProxy(process.env.INVENTORY_SERVICE_URL || "http://localhost:4002"));
  app.use("/api/v1/sales", createProxy(process.env.SALES_SERVICE_URL || "http://localhost:4003"));
  app.use("/api/v1/purchasing", createProxy(process.env.PURCHASING_SERVICE_URL || "http://localhost:4004"));
  app.use("/api/v1/crm", createProxy(process.env.CRM_SERVICE_URL || "http://localhost:4005"));

  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
  });

  return app;
}

module.exports = {
  createApp,
};
