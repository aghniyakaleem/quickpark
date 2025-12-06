// backend/controllers/msg91WebhookController.js
import Ticket from "../models/Ticket.js";
import { PAYMENT_STATUSES } from "../utils/enums.js";
import { emitToLocation } from "../services/socketService.js";
import MSG91Service from "../services/MSG91Service.js";

/**
 * Robust body parser for MSG91 inbound payload.
 * MSG91 sometimes sends text/plain containing JSON, or key=value, or form-data.
 */
function parseInboundBody(raw) {
  if (!raw) return {};
  // If already an object, return it
  if (typeof raw === "object") return raw;

  // If string: try JSON
  if (typeof raw === "string") {
    const s = raw.trim();

    // Try direct JSON
    try {
      return JSON.parse(s);
    } catch (e) {
      // Not JSON — try urlencoded / key=value pairs
    }

    // Try decode URI style (a=...&b=...)
    if (s.includes("=") && s.includes("&")) {
      const obj = {};
      s.split("&").forEach(pair => {
        const [k, ...rest] = pair.split("=");
        if (!k) return;
        const val = rest.join("=");
        try {
          obj[k] = decodeURIComponent(val || "");
        } catch (e) {
          obj[k] = val || "";
        }
      });
      // Sometimes MSG91 wraps actual payload in 'payload' key
      if (obj.payload) {
        try { return JSON.parse(obj.payload); } catch(e) { return obj; }
      }
      return obj;
    }

    // Last fallback: return raw string in `message` field
    return { message: s };
  }

  return {};
}

export const handleMsg91Inbound = async (req, res) => {
  try {
    // req.body may be string (express.text) or parsed object
    console.log("📥 MSG91 RAW Inbound (raw):", typeof req.body === "string" ? req.body : JSON.stringify(req.body, null, 2));

    const payload = parseInboundBody(req.body) || {};
    console.log("📥 Normalised Payload:", JSON.stringify(payload, null, 2));

    let message = "";

    // =======================================================
    // A) Handle nested messages array (WhatsApp interactive/button)
    // =======================================================
    if (Array.isArray(payload.messages) && payload.messages.length) {
      const m = payload.messages[0];

      if (m?.interactive?.button_reply) {
        message = m.interactive.button_reply.title || m.interactive.button_reply.id || "";
      } else if (m?.button_reply) {
        message = m.button_reply.title || m.button_reply.id || "";
      } else if (m?.button) {
        message = m.button.text || m.button.payload || "";
      } else if (m?.type === "text" && m?.text?.body) {
        message = m.text.body;
      }
    }

    // =======================================================
    // B) Top-level button fields fallback
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
    // C) Final fallback — plain text fields
    // =======================================================
    if (!message) {
      message =
        payload?.message ||
        payload?.text ||
        payload?.body ||
        payload?.message_text ||
        payload?.template_name ||
        "";
    }

    message = String(message || "").trim();
    const lower = message.toLowerCase();

    // Normalize common recall button texts to canonical string
    if (
      lower.includes("vehicle") ||
      lower.includes("get") ||
      lower.includes("recall")
    ) {
      message = "get my vehicle";
    }

    console.log("📝 FINAL PARSED MESSAGE:", message);

    // =======================================================
    // Extract phone — try many shapes
    // =======================================================
    let from =
      payload?.from ||
      payload?.mobile ||
      payload?.sender ||
      payload?.phone ||
      payload?.customerNumber ||
      payload?.contacts?.[0]?.wa_id ||
      payload?.contacts?.[0]?.profile?.phone ||
      payload?.messages?.[0]?.from ||
      "";

    // If payload came as key/value map where sender is inside messages[0].contacts
    if (!from && Array.isArray(payload?.messages) && payload.messages[0]) {
      from = payload.messages[0]?.from || payload.messages[0]?.contacts?.[0]?.wa_id || "";
    }

    const phone = String(from || "").replace(/\D/g, "");

    if (!phone) {
      console.log("❌ NO PHONE IN PAYLOAD");
      return res.status(200).send("NO_PHONE");
    }

    // =======================================================
    // Find the latest active ticket for this phone (not finalised)
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
    // Handle "Get my vehicle" recall
    // =======================================================
    if (message === "get my vehicle") {
      console.log("🚗 Recall triggered for", ticket._id);

      ticket.status = "RECALLED";
      ticket.recall = true;
      await ticket.save();

      // Emit full ticket object to valets (frontend expects full ticket)
      emitToLocation(String(ticket.locationId), "ticket:recalled", ticket.toObject());
      emitToLocation(String(ticket.locationId), "ticket:updated", ticket.toObject());

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
    // CASH reply
    // =======================================================
    if (lower.includes("cash")) {
      ticket.paymentStatus = PAYMENT_STATUSES.CASH;
      await ticket.save();
      emitToLocation(String(ticket.locationId), "ticket:updated", ticket.toObject());
      return res.status(200).send("CASH_OK");
    }

    // =======================================================
    // PAYMENT confirmation reply
    // =======================================================
    if (lower.includes("paid") || lower.includes("done")) {
      ticket.paymentStatus = PAYMENT_STATUSES.PAID;
      await ticket.save();
      emitToLocation(String(ticket.locationId), "ticket:updated", ticket.toObject());

      try {
        await MSG91Service.paymentConfirmation(ticket.phone, ticket.ticketShortId);
      } catch (err) {
        console.error("paymentConfirmation error:", err?.response?.data || err);
      }

      return res.status(200).send("PAYMENT_OK");
    }

    // If we didn't match anything, acknowledge — don't treat as error
    return res.status(200).send("IGNORED");
  } catch (err) {
    console.error("❌ MSG91 webhook error", err);
    return res.status(500).send("ERR");
  }
};