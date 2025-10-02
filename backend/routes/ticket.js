import express from "express";
import { 
  createTicketPublic, 
  valetUpdateTicket, 
  getTicketsByLocation
} from "../controllers/ticketController.js"; // remove recall if not exported yet
import { publicRateLimiter } from "../middleware/rateLimiter.js";
import { body, param } from "express-validator";
import { handleValidation } from "../middleware/validate.js";
import { emitToLocation } from "../services/socketService.js";
import whatsappService from "../services/whatsappService.js";

const router = express.Router();

// Public ticket creation
router.post(
  "/public/:slug",
  publicRateLimiter,
  body("phone").isString().notEmpty(),
  handleValidation,
  createTicketPublic
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
  async (req, res, next) => {
    try {
      const { ticket } = await valetUpdateTicket(req, res, next);

      emitToLocation(ticket.locationId, "ticket:updated", ticket);

      if (req.body.status && ticket.phone) {
        await whatsappService.sendTemplate(
          ticket.phone,
          `Your ticket status is now: ${req.body.status}`
        );
      }

      res.json({ ok: true, ticket });
    } catch (err) {
      next(err);
    }
  }
);

// Valet fetch tickets
router.get(
  "/location/:locationId",
  param("locationId").isString().notEmpty(),
  handleValidation,
  getTicketsByLocation
);

// WhatsApp webhook
router.post("/whatsapp-webhook", async (req, res, next) => {
  try {
    const { phone, message } = req.body;
    if (!phone) return res.status(422).json({ message: "Phone required" });

    const normalized = phone.replace(/\D/g, "");
    const Ticket = (await import("../models/Ticket.js")).default;
    const ticket = await Ticket.findOne({ phone: normalized }).sort({ createdAt: -1 });

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
    next(err);
  }
});

export default router;