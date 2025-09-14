import express from "express";
import { createLocation, createValet, listLocations, createSuperAdmin } from "../controllers/adminController.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { body } from "express-validator";
import { handleValidation } from "../middleware/validate.js";

const router = express.Router();

/**
 * Super admin protected routes
 */
router.post("/create-super-admin",
  body("name").isString().notEmpty(),
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  handleValidation,
  createSuperAdmin
);

router.post("/locations",
  authMiddleware,
  requireRole("SUPER_ADMIN"),
  body("name").isString().notEmpty(),
  body("paymentRequired").isBoolean(),
  handleValidation,
  createLocation
);

router.get("/locations",
  authMiddleware,
  requireRole("SUPER_ADMIN"),
  listLocations
);

router.post("/valets",
  authMiddleware,
  requireRole("SUPER_ADMIN"),
  body("name").isString().notEmpty(),
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  body("locationId").isString().notEmpty(),
  handleValidation,
  createValet
);

export default router;