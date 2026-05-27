const jwt = require("jsonwebtoken");

function getJwtSecret() {
  return process.env.JWT_SECRET || "super-secret-demo-key";
}

function issueToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "8h",
  });
}

function authenticateRequest(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing bearer token." });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = jwt.verify(token, getJwtSecret());
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token." });
  }
}

function authorizeRoles(roles) {
  return (req, res, next) => {
    authenticateRequest(req, res, () => {
      if (!roles.includes(req.user.role)) {
        res.status(403).json({ message: "Forbidden for this role." });
        return;
      }

      next();
    });
  };
}

function authorizeRolesOrService(roles) {
  return (req, res, next) => {
    const serviceToken = process.env.SERVICE_TOKEN || "internal-service-token";

    if (req.headers["x-service-token"] === serviceToken) {
      req.user = { role: "service", username: "internal" };
      next();
      return;
    }

    authorizeRoles(roles)(req, res, next);
  };
}

module.exports = {
  authenticateRequest,
  authorizeRoles,
  authorizeRolesOrService,
  issueToken,
};
