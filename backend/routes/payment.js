import express from "express";
import { createRazorOrderForTicket } from "../controllers/paymentController.js";
import { body } from "express-validator";
import { handleValidation } from "../middleware/validate.js";

const router = express.Router();

/**
 * POST /api/payments/razor/:ticketId
 * body: { amount }
 */
router.post("/razor/:ticketId",
  body("amount").isNumeric(),
  handleValidation,
  createRazorOrderForTicket
);

export default router;