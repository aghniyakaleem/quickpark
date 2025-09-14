import express from "express";
import { login } from "../controllers/authController.js";
import { body } from "express-validator";
import { handleValidation } from "../middleware/validate.js";

const router = express.Router();

/**
 * POST /api/auth/login
 * body: { email, password }
 */
router.post("/login",
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  handleValidation,
  login
);

export default router;