import express from "express";
import { 
  createTicketPublic, 
  recallRequestPublic, 
  valetUpdateTicket, 
  getTicketsByLocation
} from "../controllers/ticketController.js";
import { publicRateLimiter } from "../middleware/rateLimiter.js";
import { body, param } from "express-validator";
import { handleValidation } from "../middleware/validate.js";

const router = express.Router();

/**
 * Public ticket creation
 * POST /api/tickets/public/:slug
 * body: { phone }
 */
router.post(
  "/public/:slug",
  publicRateLimiter,
  body("phone").isString().notEmpty(),
  handleValidation,
  createTicketPublic
);

/**
 * Public recall
 * POST /api/tickets/public/:slug/recall
 * body: { ticketShortId, payMode }
 */
router.post(
  "/public/:slug/recall",
  publicRateLimiter,
  body("ticketShortId").isString().notEmpty(),
  handleValidation,
  recallRequestPublic
);

/**
 * Valet updates a ticket
 * PUT /api/tickets/:ticketId/valet-update
 */
router.put(
  "/:ticketId/valet-update",
  param("ticketId").isString().notEmpty(),
  body("vehicleNumber").optional().isString(),
  body("etaMinutes").optional().isInt({ min: 0 }),
  body("parkedAt").optional().isString(),
  body("status").optional().isString(),
  body("paymentStatus").optional().isString(),
  body("paymentProvider").optional().isString(),
  handleValidation,
  valetUpdateTicket
);

/**
 * Valet fetch tickets by location
 * GET /api/tickets/location/:locationId
 */
router.get(
  "/location/:locationId",
  param("locationId").isString().notEmpty(),
  handleValidation,
  getTicketsByLocation
);

export default router;