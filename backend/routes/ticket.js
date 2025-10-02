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
import { emitToLocation } from "../services/socketService.js";
import whatsappService, { WhatsAppTemplates } from "../services/whatsappService.js";
import Ticket from "../models/Ticket.js";

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
  async (req, res, next) => {
    try {
      const { ticket } = await valetUpdateTicket(req, res, next);
      emitToLocation(ticket.locationId, "ticket:updated", ticket);
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
    const { phone, message, button } = req.body;
    if (!phone) return res.status(422).json({ message: "Phone required" });

    const normalized = phone.replace(/\D/g, "");
    const ticket = await Ticket.findOne({ phone: normalized }).sort({ createdAt: -1 });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const locationId = ticket.locationId;

    // ---- Handle Recall ----
    if (/recall/i.test(message) || button === "recall_car") {
      // If payment required and unpaid
      if (ticket.paymentStatus === "UNPAID" && ticket.paymentRequired) {
        await whatsappService.sendTemplate(
          ticket.phone,
          WhatsAppTemplates.paymentRequest(ticket.paymentAmount || 20, ticket.ticketShortId),
          [
            { type: "reply", reply: { id: "pay_online", title: "Pay Online" } },
            { type: "reply", reply: { id: "pay_cash", title: "Pay Cash to Valet" } },
          ]
        );
      } else {
        // Normal recall flow
        ticket.status = "RECALLED";
        await ticket.save();
        emitToLocation(locationId.toString(), "ticket:updated", ticket);

        await whatsappService.sendTemplate(
          ticket.phone,
          `🔔 Your recall request for car ${ticket.vehicleNumber || ""} is registered. Please wait for updates.`
        );
      }
    }

    // ---- Handle Payment Online ----
    if (button === "pay_online") {
      // Generate Razorpay link (replace with real link generator)
      const razorpayLink = `${process.env.PUBLIC_URL}/pay/${ticket._id}`;
      await whatsappService.sendTemplate(
        ticket.phone,
        `💳 Please complete your payment using this link: ${razorpayLink}`
      );
    }

    // ---- Handle Payment in Cash ----
    if (button === "pay_cash") {
      ticket.paymentStatus = "CASH";
      await ticket.save();
      emitToLocation(locationId.toString(), "ticket:updated", ticket);

      await whatsappService.sendTemplate(
        ticket.phone,
        `💵 Please pay ₹${ticket.paymentAmount || 20} to the valet. Your car will be ready shortly.`
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

export default router;