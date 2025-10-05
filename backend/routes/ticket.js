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
      // Update the ticket
      const { ticket } = await valetUpdateTicket(req, res, next);

      // Emit socket update
      emitToLocation(ticket.locationId, "ticket:updated", ticket);

      // ---- Send WhatsApp updates ----
      try {
        const updates = req.body;

        // Send ETA update
        if (updates.etaMinutes) {
          await whatsappService.sendTemplate(
            ticket.phone,
            `⏱️ Your car will be ready in ${updates.etaMinutes} minutes.`
          );
        }

        // Send vehicle number update
        if (updates.vehicleNumber) {
          await whatsappService.sendTemplate(
            ticket.phone,
            `🚗 Your car number is updated to ${updates.vehicleNumber}.`
          );
        }

        // Send status updates
        if (updates.status) {
          switch (updates.status) {
            case "PARKED":
              await whatsappService.sendTemplate(
                ticket.phone,
                `✅ Your car has been parked successfully.`
              );
              break;
            case "READY_FOR_PICKUP":
              await whatsappService.sendTemplate(
                ticket.phone,
                `🔔 Your car is ready for pickup. Please come to the valet.`
              );
              break;
            case "RECALLED":
              await whatsappService.sendTemplate(
                ticket.phone,
                `🔔 Your car recall request is registered. Please wait for updates.`
              );
              break;
          }
        }

        // Payment status updates
        if (updates.paymentStatus) {
          switch (updates.paymentStatus) {
            case "PAID":
              await whatsappService.sendTemplate(
                ticket.phone,
                `💰 Payment received. Thank you!`
              );
              break;
            case "CASH":
              await whatsappService.sendTemplate(
                ticket.phone,
                `💵 Please pay cash to the valet. Your car will be ready shortly.`
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