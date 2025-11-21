// backend/routes/ticket.js
import express from "express";
import { 
  createTicketPublic, 
  valetUpdateTicket, 
  getTicketsByLocation,
  recallRequestPublic
} from "../controllers/ticketController.js";
import { publicRateLimiter } from "../middleware/rateLimiter.js";
import { body, param } from "express-validator";
import { handleValidation } from "../middleware/validate.js";

const router = express.Router();

// Public ticket creation
router.post(
  "/public/:slug",
  publicRateLimiter,
  body("phone").isString().notEmpty(),
  handleValidation,
  createTicketPublic
);

// Public recall
router.post(
  "/public/:slug/recall",
  body("ticketShortId").isString().notEmpty(),
  handleValidation,
  recallRequestPublic
);

// Valet updates a ticket
router.put(
  "/:ticketId/valet-update",
  param("ticketId").isString().notEmpty(),
  body("vehicleNumber").optional().isString(),
  body("etaMinutes").optional().isInt({ min: 0 }),
  body("status").optional().isString(),
  body("paymentStatus").optional().isString(),
  body("paymentProvider").optional().isString(),
  handleValidation,
  valetUpdateTicket
);

// Get tickets for a location
router.get(
  "/location/:locationId",
  param("locationId").isMongoId(),
  handleValidation,
  getTicketsByLocation
);

export default router;