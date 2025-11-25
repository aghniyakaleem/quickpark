// backend/controllers/msg91WebhookController.js
import Ticket from "../models/Ticket.js";
import { PAYMENT_STATUSES } from "../utils/enums.js";
import { emitToLocation } from "../services/socketService.js";
import MSG91Service from "../services/MSG91Service.js";

export const handleMsg91Inbound = async (req, res) => {
  try {
    console.log("📥 MSG91 Inbound:", JSON.stringify(req.body, null, 2));

    // MSG91 sends payload in various shapes. Try payload wrapper first then raw.
    const payload = req.body?.payload || req.body || {};

    // 1) Try common fields (text, message, body)
    let message =
      String(
        payload?.message ||
        payload?.text ||
        payload?.body ||
        payload?.message_text ||
        payload?.messages?.[0]?.text?.body ||
        ""
      ).trim();

    // 2) Detect interactive/button payloads (MSG91 may use `interactive` / `button` / `button_reply`)
    // Check messages array (newer WhatsApp payload shape)
    const messagesArray = Array.isArray(payload?.messages) ? payload.messages : null;
    if (messagesArray && messagesArray.length) {
      const m = messagesArray[0];
      if (m?.type === "button" || m?.type === "interactive" || m?.type === "button_reply") {
        // message text can be button reply text or id
        message = (m?.button_reply?.title || m?.button_reply?.id || m?.button?.text || m?.interactive?.button_reply?.id || m?.interactive?.button_reply?.title || "").toString().trim();
      } else if (m?.type === "text" && m?.text?.body) {
        message = m.text.body.toString().trim();
      }
    }

    // 3) Also check top-level `interactive`/`button` fields
    const button =
      payload?.button ||
      payload?.btn ||
      payload?.interactive ||
      payload?.interactive_button ||
      payload?.interactive?.button_reply ||
      payload?.interactive?.button_reply?.id ||
      payload?.interactive?.button_reply?.title;

    if (button) {
      // normalise to a short string
      const bstr = (typeof button === "object" ? JSON.stringify(button) : String(button)).toLowerCase();
      if (bstr) {
        // If user hits a button labelled with anything vehicle/recall-like, force recall
        if (bstr.includes("vehicle") || bstr.includes("get") || bstr.includes("recall")) {
          message = "get my vehicle";
        }
      }
    }

    // get from number
    const from =
      String(
        payload?.from ||
        payload?.mobile ||
        payload?.sender ||
        payload?.phone ||
        payload?.customerNumber ||
        payload?.messages?.[0]?.from ||
        ""
      ).trim();

    const phone = from.replace(/\D/g, "");
    if (!phone) {
      console.log("No phone found in inbound payload");
      return res.status(200).send("NO_PHONE");
    }

    // find last active ticket for this phone (exclude completed)
    const ticket = await Ticket.findOne({
      phone,
      status: { $nin: ["COMPLETED", "DELIVERED"] },
    }).sort({ createdAt: -1 });

    if (!ticket) {
      console.log("No active ticket found for phone:", phone);
      return res.status(200).send("NO_ACTIVE_TICKET");
    }

    const lower = (message || "").toLowerCase();
    console.log("📝 Parsed inbound message:", message);

    // --- RECALL (text OR button)
    if (
      lower.includes("recall") ||
      lower.includes("get my vehicle") ||
      lower.includes("get my car") ||
      /get.*vehicle/i.test(lower)
    ) {
      console.log("🚗 Recall triggered for ticket", ticket._id);

      ticket.status = "RECALLED";
      await ticket.save();

      // Emit update to dashboard(s)
      emitToLocation(ticket.locationId.toString(), "ticket:recalled", {
        ticketId: ticket._id,
        ticket: ticket.toObject ? ticket.toObject() : ticket,
      });

      // send confirmation back to user (best-effort)
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

    // --- PAY CASH
    if (lower.includes("cash") || /pay cash/i.test(lower)) {
      ticket.paymentStatus = PAYMENT_STATUSES.CASH;
      await ticket.save();
      emitToLocation(ticket.locationId.toString(), "ticket:updated", ticket);
      return res.status(200).send("CASH_OK");
    }

    // --- PAYMENT CONFIRMED
    if (lower.includes("paid") || lower.includes("payment done") || lower.includes("done")) {
      ticket.paymentStatus = PAYMENT_STATUSES.PAID;
      await ticket.save();
      emitToLocation(ticket.locationId.toString(), "ticket:updated", ticket);
      try {
        await MSG91Service.paymentConfirmation(ticket.phone, ticket.ticketShortId);
      } catch (err) {
        console.error("MSG91 paymentConfirmation error:", err?.response?.data || err);
      }
      return res.status(200).send("PAYMENT_OK");
    }

    return res.status(200).send("IGNORED");
  } catch (err) {
    console.error("❌ MSG91 webhook error", err);
    return res.status(500).send("ERR");
  }
};