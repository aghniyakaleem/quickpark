// backend/controllers/ticketController.js
import Ticket from "../models/Ticket.js";
import Location from "../models/Location.js";
import StatusLog from "../models/StatusLog.js";
import MSG91Service from "../services/MSG91Service.js";
import { STATUSES, PAYMENT_STATUSES } from "../utils/enums.js";
import { emitToLocation } from "../services/socketService.js";
import shortId from "shortid";

// Create ticket public
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
      status: STATUSES.AWAITING_VEHICLE,
      paymentAmount: location.paymentAmount || 20,
    });

    await StatusLog.create({
      ticketId: ticket._id,
      from: "NONE",
      to: ticket.status,
      actor: "PUBLIC",
      notes: "Ticket created by public portal",
    });

    // daily count update
    const today = new Date();
    const last = location.lastCountDate;
    const sameDay = last && new Date(last).toDateString() === today.toDateString();
    if (sameDay) {
      location.todayTicketCount = (location.todayTicketCount || 0) + 1;
    } else {
      location.todayTicketCount = 1;
      location.lastCountDate = today;
    }
    await location.save();

    // send initial templates
    try {
      await MSG91Service.ticketCreated(ticket.phone, ticketShort, location.name);
      await MSG91Service.carPicked(ticket.phone);
    } catch (err) {
      console.error("MSG91 send failed during ticket creation:", err?.response?.data || err.message || err);
    }

    // emit to valets with full ticket object
    emitToLocation(String(location._id), "ticket:created", { ticketId: ticket._id.toString(), ticket: ticket.toObject() });

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

// Public recall endpoint (web)
export async function recallRequestPublic(req, res) {
  try {
    const { slug } = req.params;
    const { ticketShortId } = req.body;

    if (!ticketShortId) return res.status(422).json({ message: "ticketShortId required" });

    const location = await Location.findOne({ slug });
    if (!location) return res.status(404).json({ message: "Location not found" });

    const ticket = await Ticket.findOne({ ticketShortId, locationId: location._id });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Mark recall flag but do NOT change status
    ticket.recall = true;
    await ticket.save();

    await StatusLog.create({
      ticketId: ticket._id,
      from: ticket.status,
      to: ticket.status,
      actor: "PUBLIC",
      notes: "Recall requested (notification only)",
    });

    emitToLocation(String(location._id), "ticket:recalled", { ticketId: ticket._id.toString(), ticket: ticket.toObject() });
    emitToLocation(String(location._id), "ticket:updated", { ticketId: ticket._id.toString(), ticket: ticket.toObject() });

    // do not send recall template here — valet must confirm and send
    res.json({ ok: true, message: "Recall requested (valet notified)" });
  } catch (err) {
    console.error("Error in recallRequestPublic:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Valet update endpoint
export async function valetUpdateTicket(req, res) {
  try {
    const { ticketId } = req.params;
    const { vehicleNumber, etaMinutes, status, paymentStatus, paymentProvider } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const previousStatus = ticket.status;

    if (vehicleNumber !== undefined) ticket.vehicleNumber = vehicleNumber;
    if (etaMinutes !== undefined) ticket.etaMinutes = etaMinutes;

    // Accept status only if it's one of STATUSES values
    if (status !== undefined && Object.values(STATUSES).includes(status)) {
      ticket.status = status;

      // when valet confirms RECALLED, ensure recall flag exists
      if (status === STATUSES.RECALLED) ticket.recall = true;
      if (status === STATUSES.READY_FOR_PICKUP || status === STATUSES.PARKED) ticket.recall = false;
    }

    if (paymentStatus !== undefined && Object.values(PAYMENT_STATUSES).includes(paymentStatus)) {
      ticket.paymentStatus = paymentStatus;
    }
    if (paymentProvider !== undefined) ticket.paymentProvider = paymentProvider;

    await ticket.save();

    await StatusLog.create({
      ticketId: ticket._id,
      from: previousStatus,
      to: ticket.status,
      actor: "VALET",
      notes: "Valet updated ticket",
    });

    const emitPayload = { ticketId: ticket._id.toString(), ticket: ticket.toObject() };
    emitToLocation(String(ticket.locationId), "ticket:updated", emitPayload);

    // send WhatsApp templates only when valet actually set statuses
    try {
      switch (ticket.status) {
        case STATUSES.PARKED:
          await MSG91Service.carParked(ticket.phone, ticket.vehicleNumber, ticket.etaMinutes || "N/A");
          break;
        case STATUSES.RECALLED:
          // valet confirmed recall -> send recall template
          await MSG91Service.recallRequest(ticket.phone, ticket.vehicleNumber || "Unknown", ticket.etaMinutes || "few");
          break;
        case STATUSES.READY_FOR_PICKUP:
          await MSG91Service.readyForPickup(ticket.phone, ticket.vehicleNumber);
          break;
        case STATUSES.DELIVERED:
          await MSG91Service.delivered(ticket.phone, ticket.vehicleNumber);
          break;
        default:
          break;
      }

      // payment notifications (kept for future)
      if (paymentStatus) {
        if (paymentStatus === PAYMENT_STATUSES.PAID) {
          await MSG91Service.paymentConfirmation(ticket.phone, ticket.ticketShortId);
        } else if (paymentStatus === PAYMENT_STATUSES.CASH || paymentStatus === "CASH") {
          await MSG91Service.paymentRequest(ticket.phone, ticket.paymentAmount || 20, ticket.ticketShortId);
        }
      }
    } catch (err) {
      console.error("MSG91 send failed after valet update:", err?.response?.data || err.message || err);
    }

    res.json({ ticket: ticket.toObject() });
  } catch (err) {
    console.error("Error in valetUpdateTicket:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// get tickets by location (used by dashboard fetch)
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