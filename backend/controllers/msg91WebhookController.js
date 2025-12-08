// backend/controllers/msg91WebhookController.js
import Ticket from "../models/Ticket.js";
import { PAYMENT_STATUSES } from "../utils/enums.js";
import { emitToLocation } from "../services/socketService.js";
import MSG91Service from "../services/MSG91Service.js";
 // Normalize WhatsApp wa_id to match DB format (remove +91 or 91)
function normalizePhone(num) {
  if (!num) return "";
  num = String(num).replace(/\D/g, "");
  if (num.startsWith("91") && num.length === 12) {
    return num.substring(2);
  }
  return num;
}
/**
 * Parse inbound body that may be JSON (sent as text), urlencoded, or object.
 */
function parseInboundBody(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;

  const s = String(raw).trim();

  // Try JSON
  try {
    return JSON.parse(s);
  } catch (e) {}

  // urlencoded k=v&k2=v2
  if (s.includes("=") && s.includes("&")) {
    const obj = {};
    s.split("&").forEach((pair) => {
      const [k, ...rest] = pair.split("=");
      if (!k) return;
      const val = rest.join("=");
      try {
        obj[k] = decodeURIComponent(val || "");
      } catch (e) {
        obj[k] = val || "";
      }
    });
    if (obj.payload) {
      try {
        return JSON.parse(obj.payload);
      } catch (e) {
        return obj;
      }
    }
    return obj;
  }

  return { message: s };
}

export const handleMsg91Inbound = async (req, res) => {
  try {
    console.log(
      "📥 MSG91 RAW Inbound (raw):",
      typeof req.body === "string" ? req.body : JSON.stringify(req.body, null, 2)
    );

    const payload = parseInboundBody(req.body) || {};
    console.log("📥 Normalised Payload:", JSON.stringify(payload, null, 2));

    // Attempt to extract message/button text
    let message = "";

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

    if (!message) {
      const btn =
        payload?.interactive?.button_reply ||
        payload?.button_reply ||
        payload?.button ||
        payload?.btn;
      if (btn) {
        message = typeof btn === "object" ? (btn.title || btn.id || JSON.stringify(btn)) : String(btn);
      }
    }

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

    // Normalize recall button text
    if (lower.includes("vehicle") || lower.includes("get") || lower.includes("recall")) {
      message = "get my vehicle";
    }

    console.log("📝 FINAL PARSED MESSAGE:", message);

    // Extract phone from many possible fields
    let from =
      payload?.from ||
      payload?.mobile ||
      payload?.sender ||
      payload?.phone ||
      payload?.customerNumber ||
      payload?.contacts?.[0]?.wa_id ||
      payload?.messages?.[0]?.from ||
      "";

    if (!from && Array.isArray(payload?.messages) && payload.messages[0]) {
      from = payload.messages[0]?.from || payload.messages[0]?.contacts?.[0]?.wa_id || "";
    }

    const phone = normalizePhone(from);
    if (!phone) {
      console.log("❌ NO PHONE IN PAYLOAD");
      return res.status(200).send("NO_PHONE");
    }

    // Find latest active ticket for phone (exclude final states)
    const ticket = await Ticket.findOne({
      phone,
      status: { $nin: ["DROPPED"] }, // treat DROPPED as final in this unpaid flow
    }).sort({ createdAt: -1 });

    if (!ticket) {
      console.log("❌ NO ACTIVE TICKET for", phone);
      return res.status(200).send("NO_ACTIVE_TICKET");
    }
    // === HANDLE: USER SENDS VEHICLE NUMBER (4 digits) ===
    const vehicleMatch = message.match(/^\d{4}$/);
    if (vehicleMatch) {
      const vehicleNumber = vehicleMatch[0];
      console.log("🚗 User sent vehicle number:", vehicleNumber);

      ticket.vehicleNumber = vehicleNumber;

      // If ticket was awaiting vehicle number → mark as parked
      if (ticket.status === "AWAITING_VEHICLE_NUMBER" || !ticket.status) {
        ticket.status = "PARKED";
      }

      await ticket.save();

      const emitPayload = {
        ticketId: ticket._id.toString(),
        ticket: ticket.toObject(),
      };

      emitToLocation(String(ticket.locationId), "ticket:updated", emitPayload);

      // Optional: Send confirmation message
      try {
        await MSG91Service.vehicleNumberConfirmed(ticket.phone, vehicleNumber);
      } catch (err) {
        console.error("vehicleNumberConfirmed error:", err?.response?.data || err);
      }

      return res.status(200).send("VEHICLE_NUMBER_OK");
    }
    // === HANDLE: Get My Vehicle (user pressed button) ===
    if (message === "get my vehicle") {
      console.log("🚗 Recall BUTTON pressed by user for ticket", ticket._id);

      // DO NOT change ticket.status. Only mark recall flag and emit a notification.
      ticket.recall = true;
      await ticket.save();

      // Emit notification payload expected by frontend: { ticketId, ticket }
      const emitPayload = { ticketId: ticket._id.toString(), ticket: ticket.toObject() };
      emitToLocation(String(ticket.locationId), "ticket:recalled", emitPayload);
      emitToLocation(String(ticket.locationId), "ticket:updated", emitPayload);

      // Important: do NOT send recall WhatsApp template automatically here.
      // Valet must manually set status to RECALLED and click Save to trigger the template.
      // (This prevents race conditions and ensures valet confirmation.)

      return res.status(200).send("RECALL_NOTIFIED");
    }

    // === CASH ===
    if (lower.includes("cash")) {
      ticket.paymentStatus = PAYMENT_STATUSES.CASH;
      await ticket.save();
      emitToLocation(String(ticket.locationId), "ticket:updated", { ticketId: ticket._id.toString(), ticket: ticket.toObject() });
      return res.status(200).send("CASH_OK");
    }

    // === PAYMENT CONFIRM ===
    if (lower.includes("paid") || lower.includes("done")) {
      ticket.paymentStatus = PAYMENT_STATUSES.PAID;
      await ticket.save();
      emitToLocation(String(ticket.locationId), "ticket:updated", { ticketId: ticket._id.toString(), ticket: ticket.toObject() });

      try {
        await MSG91Service.paymentConfirmation(ticket.phone, ticket.ticketShortId);
      } catch (err) {
        console.error("paymentConfirmation error:", err?.response?.data || err);
      }

      return res.status(200).send("PAYMENT_OK");
    }

    // otherwise acknowledge
    return res.status(200).send("IGNORED");
  } catch (err) {
    console.error("❌ MSG91 webhook error", err);
    return res.status(500).send("ERR");
  }
};