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

    // ✅ WhatsApp: send via HIBOT templates
    console.log("📩 Sending WhatsApp template: ticket_created");
    await whatsappService.sendTemplate(
      ticket.phone,
      "ticket_created",
      [ticketShort, location.name]
    );

    console.log("📩 Sending WhatsApp template: car_picked");
    await whatsappService.sendTemplate(ticket.phone, "car_picked");

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
        console.log("📩 Sending WhatsApp template: payment_confirmation");
        await whatsappService.sendTemplate(ticket.phone, "payment_confirmation", [ticket.ticketShortId]);
      } else if (button === "pay_cash") {
        ticket.paymentStatus = PAYMENT_STATUSES.UNPAID;
        await ticket.save();
        console.log("📩 Sending WhatsApp: pay_cash");
        await whatsappService.sendTemplate(ticket.phone, "payment_request", [location.paymentAmount || 20, ticket.ticketShortId]);
      } else {
        // Send payment request
        console.log("📩 Sending WhatsApp template: payment_request");
        await whatsappService.sendTemplate(
          ticket.phone,
          "payment_request",
          [location.paymentAmount || 20, ticket.ticketShortId]
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

    console.log("📩 Sending WhatsApp template: recall_request");
    await whatsappService.sendTemplate(
      ticket.phone,
      "recall_request",
      [ticket.vehicleNumber || "your car", ticket.etaMinutes || "few"]
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

    // ✅ WhatsApp updates per valet status (template names)
    switch (ticket.status) {
      case STATUSES.PARKED:
        console.log("📩 Sending WhatsApp template: car_parked");
        await whatsappService.sendTemplate(
          ticket.phone,
          "car_parked",
          [ticket.vehicleNumber, ticket.etaMinutes || "N/A"]
        );
        break;

      case STATUSES.RECALLED:
        console.log("📩 Sending WhatsApp template: recall_request");
        await whatsappService.sendTemplate(
          ticket.phone,
          "recall_request",
          [ticket.vehicleNumber, ticket.etaMinutes || "few"]
        );
        break;

      case STATUSES.READY_FOR_PICKUP:
        console.log("📩 Sending WhatsApp template: ready_for_pickup");
        await whatsappService.sendTemplate(ticket.phone, "ready_for_pickup");
        break;

      case STATUSES.DELIVERED:
        console.log("📩 Sending WhatsApp template: delivered");
        await whatsappService.sendTemplate(ticket.phone, "delivered");
        break;
    }

    res.json({ ticket });
  } catch (err) {
    console.error("Error in valetUpdateTicket:", err);
    res.status(500).json({ message: "Internal server error" });
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