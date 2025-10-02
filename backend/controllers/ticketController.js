import Ticket from "../models/Ticket.js";
import Location from "../models/Location.js";
import StatusLog from "../models/StatusLog.js";
import whatsappService, { WhatsAppTemplates } from "../services/whatsappService.js";
import { STATUSES, PAYMENT_STATUSES } from "../utils/enums.js";
import { emitToLocation } from "../services/socketService.js";
import shortId from "shortid";

// Public ticket creation
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
      phone: phone.replace(/\D/g, ""),
      status: STATUSES.AWAITING_VEHICLE_NUMBER,
    });

    await StatusLog.create({
      ticketId: ticket._id,
      from: "NONE",
      to: STATUSES.AWAITING_VEHICLE_NUMBER,
      actor: "PUBLIC",
      notes: "Ticket created by public portal",
    });

    // Send ticket created + picked up messages
    await whatsappService.sendTemplate(
      ticket.phone,
      WhatsAppTemplates.ticketCreated(ticketShort, location.name)
    );

    await whatsappService.sendTemplate(
      ticket.phone,
      WhatsAppTemplates.carPicked()
    );

    emitToLocation(location._id.toString(), "ticket:created", {
      ticketId: ticket._id,
      shortId: ticketShort,
      phone: ticket.phone,
      status: ticket.status,
    });

    res.json({
      ticket: {
        id: ticket._id,
        ticketShortId: ticketShort,
        locationId: location._id,
        publicUrl: `${process.env.PUBLIC_URL}/l/${location.slug}`,
      },
    });
  } catch (err) {
    console.error("Error in createTicketPublic:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Recall request from user (via WhatsApp button)
export async function recallRequestPublic(req, res) {
  try {
    const { slug } = req.params;
    const { ticketShortId, button } = req.body;

    if (!ticketShortId) return res.status(422).json({ message: "ticketShortId required" });

    const location = await Location.findOne({ slug });
    if (!location) return res.status(404).json({ message: "Location not found" });

    const ticket = await Ticket.findOne({ ticketShortId, locationId: location._id });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Payment flow
    if (location.paymentRequired && ticket.paymentStatus === PAYMENT_STATUSES.UNPAID) {
      if (button === "pay_online") {
        ticket.paymentStatus = PAYMENT_STATUSES.PAID;
        await ticket.save();
        await whatsappService.sendTemplate(ticket.phone, WhatsAppTemplates.paymentConfirmation(ticket.ticketShortId));
        // continue recall flow
      } else if (button === "pay_cash") {
        ticket.paymentStatus = PAYMENT_STATUSES.UNPAID;
        await ticket.save();
        await whatsappService.sendTemplate(ticket.phone, `💰 Please pay ₹${location.paymentAmount || 20} to the valet. Your car will be ready shortly.`);
        // continue recall flow
      } else {
        // Send payment request
        await whatsappService.sendTemplate(
          ticket.phone,
          WhatsAppTemplates.paymentRequest(location.paymentAmount || 20, ticket.ticketShortId),
          [
            { type: "reply", reply: { id: "pay_online", title: "Pay Online" } },
            { type: "reply", reply: { id: "pay_cash", title: "Pay Cash to Valet" } },
          ]
        );
        return res.json({ ok: true, message: "Payment requested" });
      }
    }

    // Normal recall flow
    const prevStatus = ticket.status;
    ticket.status = STATUSES.RECALLED;
    await ticket.save();

    await StatusLog.create({
      ticketId: ticket._id,
      from: prevStatus,
      to: STATUSES.RECALLED,
      actor: "PUBLIC",
      notes: "Recall requested",
    });

    emitToLocation(location._id.toString(), "ticket:recalled", { ticketId: ticket._id });

    await whatsappService.sendTemplate(
      ticket.phone,
      WhatsAppTemplates.recallRequest(ticket.vehicleNumber || "your car", ticket.etaMinutes || "few")
    );

    res.json({ ok: true, message: "Recall requested" });
  } catch (err) {
    console.error("Error in recallRequestPublic:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Valet updates ticket
export async function valetUpdateTicket(req, res) {
  try {
    const { ticketId } = req.params;
    const { vehicleNumber, etaMinutes, status, paymentStatus, paymentProvider } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const previousStatus = ticket.status;

    if (vehicleNumber !== undefined) ticket.vehicleNumber = vehicleNumber;
    if (etaMinutes !== undefined) ticket.etaMinutes = etaMinutes;
    if (status !== undefined && STATUSES[status]) ticket.status = status;
    if (paymentStatus !== undefined && PAYMENT_STATUSES[paymentStatus]) ticket.paymentStatus = paymentStatus;
    if (paymentProvider !== undefined) ticket.paymentProvider = paymentProvider;

    await ticket.save();

    await StatusLog.create({
      ticketId: ticket._id,
      from: previousStatus,
      to: ticket.status,
      actor: "VALET",
      notes: "Valet updated ticket",
    });

    emitToLocation(ticket.locationId.toString(), "ticket:updated", ticket);

    // WhatsApp updates per valet status
    switch (ticket.status) {
      case STATUSES.PARKED:
        await whatsappService.sendTemplate(
          ticket.phone,
          WhatsAppTemplates.carParked(ticket.vehicleNumber, ticket.etaMinutes || "N/A"),
          [
            { type: "reply", reply: { id: "recall_car", title: "Recall Car" } },
          ]
        );
        break;

      case STATUSES.RECALLED:
        await whatsappService.sendTemplate(
          ticket.phone,
          WhatsAppTemplates.recallRequest(ticket.vehicleNumber, ticket.etaMinutes || "few")
        );
        break;

      case STATUSES.READY_FOR_PICKUP:
        await whatsappService.sendTemplate(ticket.phone, WhatsAppTemplates.readyForPickup());
        break;

      case STATUSES.DELIVERED:
        await whatsappService.sendTemplate(ticket.phone, WhatsAppTemplates.delivered());
        break;
    }

    return { ticket };
  } catch (err) {
    console.error("Error in valetUpdateTicket:", err);
    throw err;
  }
}

// Fetch all tickets by location
export async function getTicketsByLocation(req, res) {
  try {
    const { locationId } = req.params;
    if (!locationId) return res.status(400).json({ message: "Location ID required" });

    const tickets = await Ticket.find({ locationId }).sort({ createdAt: -1 }).lean();
    res.json({ tickets });
  } catch (err) {
    console.error("Error in getTicketsByLocation:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}