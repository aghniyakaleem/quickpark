import shortId from "shortid";
import Ticket from "../models/Ticket.js";
import Location from "../models/Location.js";
import StatusLog from "../models/StatusLog.js";
import whatsappService from "../services/whatsappService.js";
import { STATUSES, PAYMENT_STATUSES } from "../utils/enums.js";
import { emitToLocation } from "../services/socketService.js";

/**
 * Public: create ticket from location slug
 */
export async function createTicketPublic(req, res) {
  try {
    const { slug } = req.params;
    const { phone } = req.body;

    if (!phone) return res.status(422).json({ message: "Phone required" });

    const location = await Location.findOne({ slug });
    if (!location) return res.status(404).json({ message: "Location not found" });

    const ticketShort = shortId.generate();

    const ticket = await Ticket.create({
      ticketShortId: ticketShort,
      locationId: location._id,
      phone,
      status: STATUSES.AWAITING_VEHICLE_NUMBER || "AWAITING_VEHICLE_NUMBER"
    });

    // Debug log
    console.log("Creating StatusLog for ticket:", ticket._id);

    await StatusLog.create({
      ticketId: ticket._id,
      from: "NONE",
      to: STATUSES.AWAITING_VEHICLE_NUMBER || "AWAITING_VEHICLE_NUMBER",
      actor: "PUBLIC",
      notes: "Ticket created by public portal"
    });

    const msg = whatsappService.WhatsAppTemplates.ticketCreated(ticketShort, location.name);
    await whatsappService.sendTemplate(phone, msg);

    emitToLocation(location._id.toString(), "ticket:created", { ticketId: ticket._id, shortId: ticketShort });

    res.json({
      ticket: {
        id: ticket._id,
        ticketShortId: ticketShort,
        publicUrl: `${process.env.PUBLIC_URL}/l/${location.slug}`
      }
    });
  } catch (err) {
    console.error("Error in createTicketPublic:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Public: recall flow initiation
 */
export async function recallRequestPublic(req, res) {
  try {
    const { slug } = req.params;
    const { ticketShortId, payMode } = req.body;

    if (!ticketShortId) return res.status(422).json({ message: "ticketShortId required" });

    const location = await Location.findOne({ slug });
    if (!location) return res.status(404).json({ message: "Location not found" });

    const ticket = await Ticket.findOne({ ticketShortId, locationId: location._id });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const previousStatus = ticket.status || "NONE";

    if (location.paymentRequired) {
      if (!payMode) return res.status(422).json({ message: "payMode required for paid locations" });

      if (payMode === "ONLINE") {
        const amount = 50;
        const { createRazorpayOrder } = await import("../services/paymentService.js");
        const order = await createRazorpayOrder(amount, "INR", `ticket_${ticket._id}`);

        ticket.paymentProvider = "RAZORPAY";
        ticket.paymentMeta = { order };
        await ticket.save();

        return res.json({ payment: { provider: "RAZORPAY", order } });

      } else if (payMode === "CASH") {
        ticket.paymentStatus = PAYMENT_STATUSES.PAY_CASH_ON_DELIVERY;
        ticket.recall = true;
        await ticket.save();

        console.log("Creating StatusLog for CASH recall:", ticket._id);

        await StatusLog.create({
          ticketId: ticket._id,
          from: previousStatus,
          to: STATUSES.RECALLED || "RECALLED",
          actor: "PUBLIC",
          notes: "Recall requested (cash on delivery)"
        });

        emitToLocation(location._id.toString(), "ticket:recalled", { ticketId: ticket._id });
        await whatsappService.sendTemplate(ticket.phone, whatsappService.WhatsAppTemplates.recallReceived(ticket.ticketShortId));

        return res.json({ ok: true, message: "Recall requested; pay at pickup (cash)" });

      } else {
        return res.status(422).json({ message: "Invalid payMode" });
      }
    } else {
      // free model
      ticket.recall = true;
      await ticket.save();

      console.log("Creating StatusLog for free recall:", ticket._id);

      await StatusLog.create({
        ticketId: ticket._id,
        from: previousStatus,
        to: STATUSES.RECALLED || "RECALLED",
        actor: "PUBLIC",
        notes: "Recall requested (free model)"
      });

      emitToLocation(location._id.toString(), "ticket:recalled", { ticketId: ticket._id });
      await whatsappService.sendTemplate(ticket.phone, whatsappService.WhatsAppTemplates.recallReceived(ticket.ticketShortId));

      return res.json({ ok: true, message: "Recall requested" });
    }

  } catch (err) {
    console.error("Error in recallRequestPublic:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}