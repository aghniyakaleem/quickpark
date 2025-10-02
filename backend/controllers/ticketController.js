import Ticket from "../models/Ticket.js";
import Location from "../models/Location.js";
import StatusLog from "../models/StatusLog.js";
import whatsappService from "../services/whatsappService.js";
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
      phone: phone.replace(/\D/g, ""), // normalize
      status: STATUSES.AWAITING_VEHICLE_NUMBER,
    });

    await StatusLog.create({
      ticketId: ticket._id,
      from: "NONE",
      to: STATUSES.AWAITING_VEHICLE_NUMBER,
      actor: "PUBLIC",
      notes: "Ticket created by public portal",
    });

    await whatsappService.sendTemplate(
      ticket.phone,
      whatsappService.WhatsAppTemplates.ticketCreated(ticketShort, location.name)
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

// Public recall
export async function recallRequestPublic(req, res) {
  try {
    const { slug } = req.params;
    const { ticketShortId } = req.body;

    if (!ticketShortId) return res.status(422).json({ message: "ticketShortId required" });

    const location = await Location.findOne({ slug });
    if (!location) return res.status(404).json({ message: "Location not found" });

    const ticket = await Ticket.findOne({ ticketShortId, locationId: location._id });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    ticket.status = STATUSES.RECALLED;
    await ticket.save();

    await StatusLog.create({
      ticketId: ticket._id,
      from: ticket.status,
      to: STATUSES.RECALLED,
      actor: "PUBLIC",
      notes: "Recall requested",
    });

    emitToLocation(location._id.toString(), "ticket:recalled", { ticketId: ticket._id });

    await whatsappService.sendTemplate(
      ticket.phone,
      whatsappService.WhatsAppTemplates.recallReceived(ticket.ticketShortId)
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

    // Send WhatsApp updates based on status
    switch (ticket.status) {
      case STATUSES.PARKED:
        await whatsappService.sendTemplate(
          ticket.phone,
          whatsappService.WhatsAppTemplates.carParked(ticket.vehicleNumber, "lot", ticket.etaMinutes || "N/A")
        );
        break;
      case STATUSES.READY_FOR_PICKUP:
        await whatsappService.sendTemplate(ticket.phone, whatsappService.WhatsAppTemplates.readyAtGate());
        break;
      case STATUSES.RECALLED:
        await whatsappService.sendTemplate(
          ticket.phone,
          whatsappService.WhatsAppTemplates.recallReceived(ticket.ticketShortId)
        );
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