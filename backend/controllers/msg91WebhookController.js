// backend/controllers/msg91WebhookController.js
import Ticket from "../models/Ticket.js";
import { PAYMENT_STATUSES } from "../utils/enums.js";
import { emitToLocation } from "../services/socketService.js";
import MSG91Service from "../services/MSG91Service.js";

export const handleMsg91Inbound = async (req, res) => {
  try {
    console.log("📥 MSG91 Inbound:", JSON.stringify(req.body, null, 2));

    const payload = req.body?.payload || req.body;

    // -----------------------------------------------
    // EXTRACT MESSAGE + DETECT BUTTONS
    // -----------------------------------------------
    let message =
      String(
        payload?.message ||
          payload?.text ||
          payload?.body ||
          payload?.message_text ||
          ""
      ).trim();

    const from = String(
      payload?.from ||
        payload?.mobile ||
        payload?.sender ||
        payload?.phone ||
        ""
    ).trim();

    const phone = from.replace(/\D/g, "");
    if (!phone) return res.status(200).send("NO_PHONE");

    // ------------------------------------------------
    // 1️⃣ Detect MSG91 button click
    // ------------------------------------------------
    const button =
      payload?.button ||
      payload?.btn ||
      payload?.interactive_button ||
      payload?.interactiveButton;

    if (button) {
      console.log("🟦 Button clicked:", button);

      const b = String(button).toLowerCase();

      // If user clicked Get Vehicle button
      if (b.includes("vehicle") || b.includes("get")) {
        message = "get my vehicle"; // Force recall handling
      }
    }

    // ------------------------------------------------
    // Fetch active ticket
    // ------------------------------------------------
    const ticket = await Ticket.findOne({
      phone,
      status: { $nin: ["COMPLETED", "DELIVERED"] },
    }).sort({ createdAt: -1 });

    if (!ticket) return res.status(200).send("NO_ACTIVE_TICKET");

    const lower = message.toLowerCase();
    console.log("📝 Final parsed message:", message);

    // ------------------------------------------------
    // 2️⃣ Recall request (via text OR button)
    // ------------------------------------------------
    if (
      lower.includes("recall") ||
      lower.includes("get my vehicle") ||
      lower.includes("get my car") ||
      /get.*vehicle/i.test(lower)
    ) {
      console.log("🚗 Recall triggered for ticket", ticket._id);

      ticket.status = "RECALLED";
      await ticket.save();

      // Emit live update to dashboard
      emitToLocation(ticket.locationId.toString(), "ticket:recalled", {
        ticketId: ticket._id,
        ticket: ticket.toObject(),
      });

      // Send confirmation back to user
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

    // ------------------------------------------------
    // 3️⃣ User says they will pay by cash
    // ------------------------------------------------
    if (lower.includes("cash")) {
      ticket.paymentStatus = PAYMENT_STATUSES.CASH;
      await ticket.save();

      emitToLocation(ticket.locationId.toString(), "ticket:updated", ticket);

      return res.status(200).send("CASH_OK");
    }

    // ------------------------------------------------
    // 4️⃣ Payment done
    // ------------------------------------------------
    if (
      lower.includes("paid") ||
      lower.includes("payment done") ||
      lower.includes("done")
    ) {
      ticket.paymentStatus = PAYMENT_STATUSES.PAID;
      await ticket.save();

      emitToLocation(ticket.locationId.toString(), "ticket:updated", ticket);

      try {
        await MSG91Service.paymentConfirmation(
          ticket.phone,
          ticket.ticketShortId
        );
      } catch (err) {
        console.error(
          "MSG91 paymentConfirmation error:",
          err?.response?.data || err
        );
      }

      return res.status(200).send("PAYMENT_OK");
    }

    return res.status(200).send("IGNORED");
  } catch (err) {
    console.error("❌ MSG91 webhook error", err);
    res.status(500).send("ERR");
  }
};