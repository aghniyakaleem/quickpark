// backend/controllers/msg91WebhookController.js
import Ticket from "../models/Ticket.js";
import { PAYMENT_STATUSES } from "../utils/enums.js";
import { emitToLocation } from "../services/socketService.js";
import MSG91Service from "../services/MSG91Service.js";

export const handleMsg91Inbound = async (req, res) => {
  try {
    console.log("📥 MSG91 Inbound:", JSON.stringify(req.body, null, 2));

    // flexible extraction for MSG91 payloads
    const payload = req.body?.payload || req.body;
    const message =
      String(payload?.message || payload?.text || payload?.body || "").trim();
    const from = String(payload?.from || payload?.mobile || payload?.sender || payload?.phone || "").trim();

    const phone = from.replace(/\D/g, "");
    if (!phone) {
      console.log("No phone found in inbound payload");
      return res.status(200).send("NO_PHONE");
    }

    // find last active ticket for this phone (not COMPLETED/DELIVERED)
    const ticket = await Ticket.findOne({
      phone,
      status: { $nin: ["COMPLETED", "DELIVERED"] },
    }).sort({ createdAt: -1 });

    if (!ticket) {
      console.log("No active ticket found for phone:", phone);
      return res.status(200).send("NO_ACTIVE_TICKET");
    }

    const lower = (message || "").toLowerCase();

    // RECALL
    if (lower.includes("recall") || /get my vehicle|get my car|i want my car/i.test(lower)) {
      ticket.status = "RECALLED";
      await ticket.save();

      // notify valet(s) with ticket id and full ticket data
      emitToLocation(ticket.locationId.toString(), "ticket:recalled", {
        ticketId: ticket._id,
        ticket: ticket.toObject ? ticket.toObject() : ticket,
      });

      // confirmation back to user
      try {
        await MSG91Service.recallRequest(
          ticket.phone,
          ticket.vehicleNumber || "your car",
          ticket.etaMinutes || "few"
        );
      } catch (err) {
        console.error("MSG91 recallRequest error:", err?.response?.data || err.message || err);
      }

      return res.status(200).send("RECALL_DONE");
    }

    // PAY CASH (user indicates cash)
    if (lower.includes("cash") || /pay cash/i.test(lower)) {
      ticket.paymentStatus = PAYMENT_STATUSES.CASH;
      await ticket.save();

      emitToLocation(ticket.locationId.toString(), "ticket:updated", ticket);
      return res.status(200).send("CASH_REQUESTED");
    }

    // PAID confirmation
    if (lower.includes("paid") || lower.includes("payment done") || lower.includes("done")) {
      ticket.paymentStatus = PAYMENT_STATUSES.PAID;
      await ticket.save();

      emitToLocation(ticket.locationId.toString(), "ticket:updated", ticket);

      try {
        await MSG91Service.paymentConfirmation(ticket.phone, ticket.ticketShortId);
      } catch (err) {
        console.error("MSG91 paymentConfirmation error:", err?.response?.data || err.message || err);
      }

      return res.status(200).send("PAYMENT_CONFIRMED");
    }

    return res.status(200).send("IGNORED");
  } catch (err) {
    console.error("❌ MSG91 webhook error", err);
    res.status(500).send("ERR");
  }
};