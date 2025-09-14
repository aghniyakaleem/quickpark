import express from "express";
import { createTicketPublic, recallRequestPublic } from "../controllers/ticketController.js";
import { publicRateLimiter } from "../middleware/rateLimiter.js";
import { body } from "express-validator";
import { handleValidation } from "../middleware/validate.js";

const router = express.Router();

/**
 * Public ticket creation
 * POST /api/tickets/public/:slug
 * body: { phone }
 */
router.post("/public/:slug",
  publicRateLimiter,
  body("phone").isString().notEmpty(),
  handleValidation,
  createTicketPublic
);

/**
 * POST /api/tickets/public/:slug/recall
 * body: { ticketShortId, payMode }
 */
router.post("/public/:slug/recall",
  publicRateLimiter,
  body("ticketShortId").isString().notEmpty(),
  handleValidation,
  recallRequestPublic
);

export default router;