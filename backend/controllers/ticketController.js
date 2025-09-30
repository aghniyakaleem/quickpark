// controllers/ticketController.js
import Ticket from "../models/Ticket.js";
import Location from "../models/Location.js";
import StatusLog from "../models/StatusLog.js";
import whatsappService from "../services/whatsappService.js";
import { STATUSES, PAYMENT_STATUSES } from "../utils/enums.js";
import { emitToLocation } from "../services/socketService.js";
import shortId from "shortid";

/**
 * Public: create ticket from location slug
 * POST /api/tickets/public/:slug
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
      phone,
      whatsappService.WhatsAppTemplates.ticketCreated(ticketShort, location.name)
    );

    emitToLocation(location._id.toString(), "ticket:created", {
      ticketId: ticket._id,
      shortId: ticketShort,
      phone,
      status: ticket.status,
    });

    res.json({
      ticket: {
        id: ticket._id,
        ticketShortId: ticketShort,
        publicUrl: `${process.env.PUBLIC_URL}/l/${location.slug}`,
      },
    });
  } catch (err) {
    console.error("Error in createTicketPublic:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Public: recall flow initiation
 * POST /api/tickets/public/:slug/recall
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

    const previousStatus = ticket.status;

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

        await StatusLog.create({
          ticketId: ticket._id,
          from: previousStatus,
          to: STATUSES.RECALLED,
          actor: "PUBLIC",
          notes: "Recall requested (cash on delivery)",
        });

        emitToLocation(location._id.toString(), "ticket:recalled", { ticketId: ticket._id });
        await whatsappService.sendTemplate(
          ticket.phone,
          whatsappService.WhatsAppTemplates.recallReceived(ticket.ticketShortId)
        );

        return res.json({ ok: true, message: "Recall requested; pay at pickup (cash)" });
      } else {
        return res.status(422).json({ message: "Invalid payMode" });
      }
    } else {
      // Free model
      ticket.recall = true;
      await ticket.save();

      await StatusLog.create({
        ticketId: ticket._id,
        from: previousStatus,
        to: STATUSES.RECALLED,
        actor: "PUBLIC",
        notes: "Recall requested (free model)",
      });

      emitToLocation(location._id.toString(), "ticket:recalled", { ticketId: ticket._id });
      await whatsappService.sendTemplate(
        ticket.phone,
        whatsappService.WhatsAppTemplates.recallReceived(ticket.ticketShortId)
      );

      return res.json({ ok: true, message: "Recall requested" });
    }
  } catch (err) {
    console.error("Error in recallRequestPublic:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Valet updates ticket (vehicle number, ETA, status, payment)
 * PUT /api/tickets/:ticketId/valet-update
 */
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

    switch (ticket.status) {
      case STATUSES.PARKED:
        await whatsappService.sendTemplate(
          ticket.phone,
          whatsappService.WhatsAppTemplates.carParked(
            ticket.vehicleNumber,
            "lot",
            ticket.etaMinutes || "N/A"
          )
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
      default:
        break;
    }

    res.json({ ok: true, ticket });
  } catch (err) {
    console.error("Error in valetUpdateTicket:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}