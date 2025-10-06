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
import whatsappService from "../services/whatsappService.js";
import Ticket from "../models/Ticket.js";

const router = express.Router();

// -------------------- PUBLIC ROUTES --------------------

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

// -------------------- VALET UPDATES --------------------

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
      // Update the ticket
      const { ticket } = await valetUpdateTicket(req, res, next);

      // Emit live socket update
      emitToLocation(ticket.locationId, "ticket:updated", ticket);

      // ---- Send WhatsApp updates ----
      try {
        const updates = req.body;

        // Handle status changes
        if (updates.status) {
          switch (updates.status) {
            case "CREATED":
              await whatsappService.ticketCreated(
                ticket.phone,
                ticket.ticketShortId || ticket._id,
                ticket.locationName || "QuickPark"
              );
              break;

            case "PARKED":
              await whatsappService.carParked(
                ticket.phone,
                updates.vehicleNumber || ticket.vehicleNumber || "Unknown",
                updates.etaMinutes || "-"
              );
              break;

            case "READY_FOR_PICKUP":
              await whatsappService.readyForPickup(ticket.phone);
              break;

            case "RECALLED":
              await whatsappService.recallRequest(
                ticket.phone,
                updates.vehicleNumber || ticket.vehicleNumber || "Unknown",
                updates.etaMinutes || "-"
              );
              break;

            case "DELIVERED":
              await whatsappService.delivered(ticket.phone);
              break;
          }
        }

        // ETA update (if valet updates time without changing status)
        if (updates.etaMinutes && !updates.status) {
          await whatsappService.carParked(
            ticket.phone,
            ticket.vehicleNumber || "Unknown",
            updates.etaMinutes
          );
        }

        // Payment status updates
        if (updates.paymentStatus) {
          switch (updates.paymentStatus) {
            case "PAID":
              await whatsappService.paymentConfirmation(ticket.phone, ticket.ticketShortId);
              break;
            case "UNPAID":
              await whatsappService.paymentRequest(
                ticket.phone,
                ticket.paymentAmount || 20,
                ticket.ticketShortId
              );
              break;
          }
        }
      } catch (whatsappErr) {
        console.error("❌ WhatsApp send error:", whatsappErr);
      }

      res.json({ ok: true, ticket });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------- WHATSAPP WEBHOOK --------------------

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
        await whatsappService.paymentRequest(
          ticket.phone,
          ticket.paymentAmount || 20,
          ticket.ticketShortId
        );
      } else {
        // Normal recall flow
        ticket.status = "RECALLED";
        await ticket.save();
        emitToLocation(locationId.toString(), "ticket:updated", ticket);

        await whatsappService.recallRequest(
          ticket.phone,
          ticket.vehicleNumber || "Unknown",
          ticket.etaMinutes || "-"
        );
      }
    }

    // ---- Handle Payment Online ----
    if (button === "pay_online") {
      const razorpayLink = `${process.env.PUBLIC_URL}/pay/${ticket._id}`;
      await whatsappService.paymentRequest(ticket.phone, ticket.paymentAmount || 20, ticket.ticketShortId);
      await whatsappService.sendWhatsAppTemplate(
        ticket.phone,
        "payment_link",
        [razorpayLink]
      );
    }

    // ---- Handle Payment in Cash ----
    if (button === "pay_cash") {
      ticket.paymentStatus = "CASH";
      await ticket.save();
      emitToLocation(locationId.toString(), "ticket:updated", ticket);

      await whatsappService.paymentRequest(
        ticket.phone,
        ticket.paymentAmount || 20,
        ticket.ticketShortId
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

export default router;