// backend/controllers/msg91WebhookController.js
import Ticket from "../models/Ticket.js";
import { PAYMENT_STATUSES } from "../utils/enums.js";
import { emitToLocation } from "../services/socketService.js";
import MSG91Service from "../services/MSG91Service.js";

export const handleMsg91Inbound = async (req, res) => {
  try {
    console.log("📥 MSG91 Inbound:", JSON.stringify(req.body, null, 2));

    // MSG91 inbound payload shape varies; check payload keys
    const message =
      req.body?.payload?.message ||
      req.body?.payload?.text ||
      req.body?.payload?.message_text ||
      "";
    const from =
      req.body?.payload?.from ||
      req.body?.payload?.mobile ||
      req.body?.payload?.sender ||
      "";
    const phone = String(from || "").replace(/\D/g, "");
    if (!phone) return res.status(200).send("NO_PHONE");

    // Find most recent active ticket for this phone (not COMPLETED)
    const ticket = await Ticket.findOne({
      phone,
      status: { $ne: "COMPLETED" },
    }).sort({ createdAt: -1 });

    if (!ticket) return res.status(200).send("NO ACTIVE TICKET");

    const lower = String(message || "").trim().toLowerCase();

    // USER → RECALL CAR
    if (lower.includes("recall")) {
      ticket.status = "RECALLED";
      await ticket.save();

      // notify valets with the ticket id + object so dashboard knows which car
      emitToLocation(ticket.locationId.toString(), "ticket:recalled", { ticketId: ticket._id, ticket });

      // send confirmation to user
      try {
        await MSG91Service.recallRequest(ticket.phone, ticket.vehicleNumber || "your car", ticket.etaMinutes || "few");
      } catch (err) {
        console.error("MSG91 recallRequest error:", err?.response?.data || err.message || err);
      }

      return res.status(200).send("RECALL_DONE");
    }

    // USER → PAY CASH
    if (lower.includes("cash")) {
      ticket.paymentStatus = PAYMENT_STATUSES.PAY_CASH_ON_DELIVERY || "PAY_CASH_ON_DELIVERY";
      await ticket.save();

      emitToLocation(ticket.locationId.toString(), "ticket:updated", ticket);
      return res.status(200).send("CASH_REQUESTED");
    }

    // USER → PAID (simple heuristic)
    if (lower.includes("paid") || lower.includes("payment done") || lower.includes("done")) {
      ticket.paymentStatus = PAYMENT_STATUSES.PAID || "PAID";
      await ticket.save();

      emitToLocation(ticket.locationId.toString(), "ticket:updated", ticket);
      return res.status(200).send("PAYMENT_CONFIRMED");
    }

    return res.status(200).send("IGNORED");
  } catch (err) {
    console.error("❌ MSG91 webhook error", err);
    res.status(500).send("ERR");
  }
};