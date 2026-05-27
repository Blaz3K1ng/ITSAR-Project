const serviceConfig = {
  inventory: {
    envName: "INVENTORY_SERVICE_URL",
    fallback: "http://127.0.0.1:4002",
    allowedHosts: new Set(["127.0.0.1", "localhost", "inventory-service"]),
    port: "4002",
  },
  crm: {
    envName: "CRM_SERVICE_URL",
    fallback: "http://127.0.0.1:4005",
    allowedHosts: new Set(["127.0.0.1", "localhost", "crm-service"]),
    port: "4005",
  },
};

function resolveServiceBaseUrl(serviceName) {
  const config = serviceConfig[serviceName];

  if (!config) {
    throw new Error(`Unsupported service: ${serviceName}`);
  }

  const candidate = process.env[config.envName] || config.fallback;
  const url = new URL(candidate);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`Unsupported protocol for ${serviceName}.`);
  }

  if (!config.allowedHosts.has(url.hostname)) {
    throw new Error(`Unsupported host for ${serviceName}.`);
  }

  if ((url.port || (url.protocol === "https:" ? "443" : "80")) !== config.port) {
    throw new Error(`Unsupported port for ${serviceName}.`);
  }

  if ((url.pathname && url.pathname !== "/") || url.username || url.password || url.search || url.hash) {
    throw new Error(`Unsupported URL shape for ${serviceName}.`);
  }

  return url.origin;
}

module.exports = {
  resolveServiceBaseUrl,
};
