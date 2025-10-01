// routes/ticket.js
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
import { emitToLocation } from "../services/socketService.js";
import whatsappService from "../services/whatsappService.js"; // ✅ default import

const router = express.Router();

/**
 * Public ticket creation
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
  async (req, res, next) => {
    try {
      const result = await valetUpdateTicket(req, res, next);

      // Emit updated ticket via socket
      emitToLocation(result.ticket.locationId, "ticket:updated", result.ticket);

      // Send WhatsApp message if status changed
      if (req.body.status && result.ticket.phone) {
        await whatsappService.sendTemplate(
          result.ticket.phone,
          `Your ticket status is now: ${req.body.status}`
        );
      }

      return result;
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Valet fetch tickets by location
 */
router.get(
  "/location/:locationId",
  param("locationId").isString().notEmpty(),
  handleValidation,
  getTicketsByLocation
);

/**
 * WhatsApp webhook for user-triggered actions (recall, ready)
 */
router.post("/whatsapp-webhook", async (req, res) => {
  const { phone, message } = req.body;

  try {
    // Find latest ticket by phone
    // Adjust this according to your Ticket model
    const tickets = await getTicketsByLocation({ phone });
    const ticket = tickets?.[0];
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    let statusUpdate = null;
    if (/recall/i.test(message)) statusUpdate = "RECALLED";
    if (/ready/i.test(message)) statusUpdate = "READY_FOR_PICKUP";

    if (statusUpdate) {
      ticket.status = statusUpdate;
      await ticket.save();
      emitToLocation(ticket.locationId, "ticket:updated", ticket);
      await whatsappService.sendTemplate(
        phone,
        `Your ticket status is now: ${statusUpdate}`
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

export default router;