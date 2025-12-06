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
      status: STATUSES.AWAITING_VEHICLE_NUMBER,
      paymentAmount: location.paymentAmount || 20,
    });

    await StatusLog.create({
      ticketId: ticket._id,
      from: "NONE",
      to: STATUSES.AWAITING_VEHICLE_NUMBER,
      actor: "PUBLIC",
      notes: "Ticket created by public portal",
    });

    // update daily count on location (simple)
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

    // best-effort templates
    try {
      await MSG91Service.ticketCreated(ticket.phone, ticketShort, location.name);
      await MSG91Service.carPicked(ticket.phone);
    } catch (err) {
      console.error("MSG91 send failed during ticket creation:", err?.response?.data || err.message || err);
    }

    // emit to valets with full ticket object (frontend expects full object)
    emitToLocation(String(location._id), "ticket:created", ticket.toObject());

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

// Recall request from public endpoint
export async function recallRequestPublic(req, res) {
  try {
    const { slug } = req.params;
    const { ticketShortId, button } = req.body;

    if (!ticketShortId) return res.status(422).json({ message: "ticketShortId required" });

    const location = await Location.findOne({ slug });
    if (!location) return res.status(404).json({ message: "Location not found" });

    const ticket = await Ticket.findOne({ ticketShortId, locationId: location._id });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // payment flow if required
    if (location.paymentRequired && ticket.paymentStatus === PAYMENT_STATUSES.UNPAID) {
      const amount = location.paymentAmount || ticket.paymentAmount || 20;
      if (button === "pay_online") {
        ticket.paymentStatus = PAYMENT_STATUSES.PAID;
        ticket.paymentProvider = "MSG91_LINK";
        await ticket.save();

        try {
          await MSG91Service.paymentConfirmation(ticket.phone, ticket.ticketShortId);
        } catch (e) {
          console.error("paymentConfirmation error:", e);
        }
      } else if (button === "pay_cash") {
        ticket.paymentStatus = PAYMENT_STATUSES.CASH;
        await ticket.save();
        try {
          await MSG91Service.paymentRequest(ticket.phone, amount, ticket.ticketShortId);
        } catch (e) {
          console.error("paymentRequest error:", e);
        }
      } else {
        try {
          await MSG91Service.paymentRequest(ticket.phone, amount, ticket.ticketShortId);
        } catch (e) {
          console.error("paymentRequest error:", e);
        }
        return res.json({ ok: true, message: "Payment requested" });
      }
    }

    // normal recall
    const prevStatus = ticket.status;
    ticket.status = STATUSES.RECALLED;
    ticket.recall = true;
    await ticket.save();

    await StatusLog.create({
      ticketId: ticket._id,
      from: prevStatus,
      to: STATUSES.RECALLED,
      actor: "PUBLIC",
      notes: "Recall requested",
    });

    // notify valets with explicit id + full ticket object
    emitToLocation(String(location._id), "ticket:recalled", ticket.toObject());
    emitToLocation(String(location._id), "ticket:updated", ticket.toObject());

    try {
      await MSG91Service.recallRequest(ticket.phone, ticket.vehicleNumber || "your car", ticket.etaMinutes || "few");
    } catch (err) {
      console.error("MSG91 recall send failed:", err?.response?.data || err.message || err);
    }

    res.json({ ok: true, message: "Recall requested" });
  } catch (err) {
    console.error("Error in recallRequestPublic:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Valet update endpoint (used by valet dashboard Save)
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
      // maintain recall boolean
      if (status === STATUSES.RECALLED) ticket.recall = true;
      if (status === STATUSES.READY_FOR_PICKUP || status === STATUSES.PARKED) ticket.recall = false;
    }

    if (paymentStatus !== undefined && Object.values(PAYMENT_STATUSES).includes(paymentStatus))
      ticket.paymentStatus = paymentStatus;

    if (paymentProvider !== undefined) ticket.paymentProvider = paymentProvider;

    await ticket.save();

    await StatusLog.create({
      ticketId: ticket._id,
      from: previousStatus,
      to: ticket.status,
      actor: "VALET",
      notes: "Valet updated ticket",
    });

    // Emit full ticket object (frontend expects full ticket)
    emitToLocation(String(ticket.locationId), "ticket:updated", ticket.toObject());

    // send appropriate WhatsApp templates
    try {
      switch (ticket.status) {
        case STATUSES.PARKED:
          await MSG91Service.carParked(ticket.phone, ticket.vehicleNumber, ticket.etaMinutes || "N/A");
          break;
        case STATUSES.RECALLED:
          await MSG91Service.recallRequest(ticket.phone, ticket.vehicleNumber || "Unknown", ticket.etaMinutes || "few");
          break;
        case STATUSES.READY_FOR_PICKUP:
          await MSG91Service.readyForPickup(ticket.phone, ticket.vehicleNumber);
          break;
        case STATUSES.COMPLETED:
        case STATUSES.DELIVERED:
          await MSG91Service.delivered(ticket.phone, ticket.vehicleNumber);
          break;
        default:
          break;
      }

      // payment notifications
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

// get tickets by location
export async function getTicketsByLocation(req, res) {
  try {
    const { locationId } = req.params;
    if (!locationId) return res.status(400).json({ message: "Location ID required" });

    // TTL on ticket collection will remove older than 24h
    const tickets = await Ticket.find({ locationId }).sort({ createdAt: -1 }).lean();
    res.json({ tickets });
  } catch (err) {
    console.error("Error in getTicketsByLocation:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}