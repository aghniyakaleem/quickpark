// backend/controllers/msg91WebhookController.js
import Ticket from "../models/Ticket.js";
import { PAYMENT_STATUSES } from "../utils/enums.js";
import { emitToLocation } from "../services/socketService.js";
import MSG91Service from "../services/MSG91Service.js";

export const handleMsg91Inbound = async (req, res) => {
  try {
    console.log("📥 MSG91 RAW Inbound:", JSON.stringify(req.body, null, 2));

    // Normalise wrapper
    const payload = req.body?.payload || req.body || {};
    console.log("📥 Normalised Payload:", JSON.stringify(payload, null, 2));

    let message = "";

    // =======================================================
    // A) Handle MSG91 WhatsApp Interactive / Buttons
    // =======================================================
    if (Array.isArray(payload.messages) && payload.messages.length) {
      const m = payload.messages[0];

      // new interactive button payload
      if (m?.interactive?.button_reply) {
        message =
          m.interactive.button_reply.title ||
          m.interactive.button_reply.id ||
          "";
      }

      // older interactive
      else if (m?.button_reply) {
        message = m.button_reply.title || m.button_reply.id || "";
      }

      // legacy button
      else if (m?.button) {
        message = m.button.text || m.button.payload || "";
      }

      // plain text
      else if (m?.type === "text" && m.text?.body) {
        message = m.text.body;
      }
    }

    // =======================================================
    // B) Fallback top-level interactive/button fields
    // =======================================================
    if (!message) {
      const btn =
        payload?.interactive?.button_reply ||
        payload?.button_reply ||
        payload?.button ||
        payload?.btn;

      if (btn) {
        if (typeof btn === "object") {
          message = btn.title || btn.id || JSON.stringify(btn);
        } else {
          message = String(btn);
        }
      }
    }

    // =======================================================
    // C) Final fallback — normal text
    // =======================================================
    if (!message) {
      message =
        payload?.message ||
        payload?.text ||
        payload?.body ||
        payload?.message_text ||
        "";
    }

    message = String(message).trim();
    const lower = message.toLowerCase();

    // =======================================================
    // D) Normalize any button → recall
    // =======================================================
    if (
      lower.includes("vehicle") ||
      lower.includes("get") ||
      lower.includes("recall")
    ) {
      message = "get my vehicle";
    }

    console.log("📝 FINAL PARSED MESSAGE:", message);

    // =======================================================
    // Extract phone
    // =======================================================
    const from =
      payload?.from ||
      payload?.mobile ||
      payload?.sender ||
      payload?.phone ||
      payload?.customerNumber ||
      payload?.messages?.[0]?.from ||
      "";

    const phone = String(from).replace(/\D/g, "");

    if (!phone) {
      console.log("❌ NO PHONE IN PAYLOAD");
      return res.status(200).send("NO_PHONE");
    }

    // =======================================================
    // Find active ticket
    // =======================================================
    const ticket = await Ticket.findOne({
      phone,
      status: { $nin: ["COMPLETED", "DELIVERED"] },
    }).sort({ createdAt: -1 });

    if (!ticket) {
      console.log("❌ NO ACTIVE TICKET for", phone);
      return res.status(200).send("NO_ACTIVE_TICKET");
    }

    // =======================================================
    // RECALL
    // =======================================================
    if (message === "get my vehicle") {
      console.log("🚗 Recall triggered for", ticket._id);

      ticket.status = "RECALLED";
      await ticket.save();

      emitToLocation(ticket.locationId.toString(), "ticket:recalled", {
        ticketId: ticket._id,
        ticket: ticket.toObject(),
      });

      try {
        await MSG91Service.recallRequest(
          ticket.phone,
          ticket.vehicleNumber || "your car",
          ticket.etaMinutes || "few"
        );
      } catch (err) {
        console.error("MSG91 recallRequest error:", err?.response?.data || err);
      }

      return res.status(200).send("RECALL_OK");
    }

    // =======================================================
    // CASH
    // =======================================================
    if (lower.includes("cash")) {
      ticket.paymentStatus = PAYMENT_STATUSES.CASH;
      await ticket.save();
      emitToLocation(ticket.locationId.toString(), "ticket:updated", ticket);
      return res.status(200).send("CASH_OK");
    }

    // =======================================================
    // PAYMENT DONE
    // =======================================================
    if (lower.includes("paid") || lower.includes("done")) {
      ticket.paymentStatus = PAYMENT_STATUSES.PAID;
      await ticket.save();
      emitToLocation(ticket.locationId.toString(), "ticket:updated", ticket);

      try {
        await MSG91Service.paymentConfirmation(ticket.phone, ticket.ticketShortId);
      } catch (err) {
        console.error("paymentConfirmation error:", err?.response?.data || err);
      }

      return res.status(200).send("PAYMENT_OK");
    }

    return res.status(200).send("IGNORED");
  } catch (err) {
    console.error("❌ MSG91 webhook error", err);
    return res.status(500).send("ERR");
  }
};