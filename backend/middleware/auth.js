import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("JWT_SECRET not set in .env");
  process.exit(1);
}

export async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

// Enforce that valet belongs to location or super admin can access
export function requireLocationScope() {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role === "SUPER_ADMIN") return next();
    if (!user.locationId) return res.status(403).json({ message: "Valet not assigned to a location" });
    // attach locationId for controllers convenience
    req.locationId = user.locationId.toString();
    next();
  };
}