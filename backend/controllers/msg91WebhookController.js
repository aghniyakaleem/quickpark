import Ticket from "../models/Ticket.js";
import { MSG91Service } from "../services/MSG91Service.js";
import { emitToLocation } from "../services/socketService.js";

export const handleMsg91Inbound = async (req, res) => {
  try {
    console.log("📥 MSG91 Inbound:", JSON.stringify(req.body, null, 2));

    const message = req.body?.payload?.message || "";
    const from = req.body?.payload?.from || "";
    const phone = from.replace(/\D/g, "");

    if (!message) return res.status(200).send("OK");

    // Find active ticket for this phone
    const ticket = await Ticket.findOne({
      phone,
      status: { $ne: "COMPLETED" }
    });

    if (!ticket) return res.status(200).send("NO ACTIVE TICKET");

    const lower = message.trim().toLowerCase();

    // USER → RECALL CAR
    if (lower.includes("recall")) {
      ticket.status = "RECALLED";
      await ticket.save();

      // notify valet dashboard
      sendSocketUpdate(ticket.locationId, "ticket:updated", ticket);

      // send confirmation
      MSG91Service.recallRequest(ticket.phone, ticket.vehicleNumber, ticket.etaMinutes);

      return res.status(200).send("RECALL DONE");
    }

    // USER → PAY CASH
    if (lower.includes("cash")) {
      ticket.paymentStatus = "CASH_REQUESTED";
      await ticket.save();

      sendSocketUpdate(ticket.locationId, "ticket:updated", ticket);

      return res.status(200).send("CASH REQUESTED");
    }

    // USER → PAID ONLINE
    if (lower.includes("paid") || lower.includes("payment done")) {
      ticket.paymentStatus = "PAID";
      await ticket.save();

      sendSocketUpdate(ticket.locationId, "ticket:updated", ticket);

      return res.status(200).send("PAYMENT CONFIRMED");
    }

    return res.status(200).send("IGNORED");
  } catch (err) {
    console.error("❌ MSG91 webhook error", err);
    res.status(500).send("ERR");
  }
};