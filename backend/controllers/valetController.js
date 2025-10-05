import Ticket from "../models/Ticket.js";
import StatusLog from "../models/StatusLog.js";
import Location from "../models/Location.js";
import { STATUSES, PAYMENT_STATUSES } from "../utils/enums.js";
import whatsappService from "../services/whatsappService.js";
import { emitToLocation } from "../services/socketService.js";

function allowedTransition(current, next) {
  const rules = {
    [STATUSES.AWAITING_VEHICLE_NUMBER]: [STATUSES.PARKED, STATUSES.AWAITING_VEHICLE_NUMBER],
    [STATUSES.PARKED]: [STATUSES.RECALLED, STATUSES.DROPPED, STATUSES.PARKED, STATUSES.ETA_2, STATUSES.ETA_5, STATUSES.ETA_10],
    [STATUSES.RECALLED]: [STATUSES.ETA_2, STATUSES.ETA_5, STATUSES.ETA_10],
    [STATUSES.ETA_2]: [STATUSES.READY_AT_GATE],
    [STATUSES.ETA_5]: [STATUSES.READY_AT_GATE],
    [STATUSES.ETA_10]: [STATUSES.READY_AT_GATE],
    [STATUSES.READY_AT_GATE]: [STATUSES.DROPPED],
    [STATUSES.DROPPED]: []
  };
  const allowed = rules[current] || [];
  return allowed.includes(next);
}

/**
 * Get tickets for valet
 */
export async function getTicketsForValet(req, res) {
  const locationId = req.user.locationId;
  if (!locationId) return res.status(403).json({ message: "Valet not assigned" });
  const { q, status, recall } = req.query;

  const filter = { locationId };
  if (status) filter.status = status;
  if (typeof recall !== "undefined") filter.recall = recall === "true";
  if (q) {
    const regex = new RegExp(q, "i");
    filter.$or = [{ phone: regex }, { vehicleNumber: regex }, { ticketShortId: regex }];
  }

  const tickets = await Ticket.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ tickets });
}

/**
 * Valet sets vehicle number and parks ticket
 */
export async function setVehicleAndPark(req, res) {
  const { ticketId } = req.params;
  const { vehicleNumber, parkedAt, eta } = req.body;
  const valet = req.user;

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  if (ticket.locationId.toString() !== valet.locationId.toString())
    return res.status(403).json({ message: "Not authorized for this ticket" });

  ticket.vehicleNumber = vehicleNumber || ticket.vehicleNumber;
  ticket.parkedAt = parkedAt || ticket.parkedAt;
  ticket.status = STATUSES.PARKED;
  if (eta && [2, 5, 10].includes(Number(eta))) {
    ticket.etaMinutes = Number(eta);
    ticket.status = { 2: STATUSES.ETA_2, 5: STATUSES.ETA_5, 10: STATUSES.ETA_10 }[Number(eta)] || ticket.status;
  }

  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: STATUSES.AWAITING_VEHICLE_NUMBER,
    to: ticket.status,
    actor: `VALET:${valet.email}`,
    notes: `Parked by valet ${valet.email}`
  });

  // WhatsApp send
  try {
    await whatsappService.carParked(ticket.phone, ticket.vehicleNumber || "N/A", ticket.etaMinutes || 0);
  } catch (err) {
    console.error("WhatsApp send failed:", err.message);
  }

  emitToLocation(ticket.locationId.toString(), "ticket:updated", { ticketId: ticket._id, status: ticket.status });
  res.json({ ticket });
}

/**
 * Valet sets ETA
 */
export async function setEta(req, res) {
  const { ticketId } = req.params;
  const { eta } = req.body;
  const valet = req.user;

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  if (ticket.locationId.toString() !== valet.locationId.toString())
    return res.status(403).json({ message: "Not authorized for this ticket" });

  const current = ticket.status;
  const toStatus = { 2: STATUSES.ETA_2, 5: STATUSES.ETA_5, 10: STATUSES.ETA_10 }[Number(eta)];
  if (!allowedTransition(current, toStatus))
    return res.status(422).json({ message: `Cannot set ETA from ${current}` });

  ticket.etaMinutes = Number(eta);
  ticket.status = toStatus;
  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: current,
    to: toStatus,
    actor: `VALET:${valet.email}`,
    notes: `ETA set to ${eta} minutes`
  });

  try {
    await whatsappService.recallRequest(ticket.phone, ticket.vehicleNumber || "N/A", eta);
  } catch (err) {
    console.error("WhatsApp send failed:", err.message);
  }

  emitToLocation(ticket.locationId.toString(), "ticket:eta", { ticketId: ticket._id, eta });
  res.json({ ticket });
}

/**
 * Ready at Gate
 */
export async function markReadyAtGate(req, res) {
  const { ticketId } = req.params;
  const valet = req.user;

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  if (ticket.locationId.toString() !== valet.locationId.toString())
    return res.status(403).json({ message: "Not authorized for this ticket" });

  const current = ticket.status;
  if (![STATUSES.ETA_2, STATUSES.ETA_5, STATUSES.ETA_10, STATUSES.RECALLED].includes(current))
    return res.status(422).json({ message: "Cannot mark ready from current status" });

  ticket.status = STATUSES.READY_AT_GATE;
  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: current,
    to: STATUSES.READY_AT_GATE,
    actor: `VALET:${valet.email}`,
    notes: "Ready at gate"
  });

  try {
    await whatsappService.readyForPickup(ticket.phone);
  } catch (err) {
    console.error("WhatsApp send failed:", err.message);
  }

  emitToLocation(ticket.locationId.toString(), "ticket:ready", { ticketId: ticket._id });
  res.json({ ticket });
}

/**
 * Delivered
 */
export async function markDropped(req, res) {
  const { ticketId } = req.params;
  const { cashReceived } = req.body;
  const valet = req.user;

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  if (ticket.locationId.toString() !== valet.locationId.toString())
    return res.status(403).json({ message: "Not authorized for this ticket" });

  ticket.status = STATUSES.DROPPED;

  // Cash handling
  if (ticket.paymentStatus === PAYMENT_STATUSES.PAY_CASH_ON_DELIVERY && cashReceived) {
    ticket.paymentStatus = PAYMENT_STATUSES.PAID_CASH;
  }

  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: STATUSES.READY_AT_GATE,
    to: STATUSES.DROPPED,
    actor: `VALET:${valet.email}`,
    notes: "Car handed to user"
  });

  try {
    await whatsappService.delivered(ticket.phone);
  } catch (err) {
    console.error("WhatsApp send failed:", err.message);
  }

  emitToLocation(ticket.locationId.toString(), "ticket:dropped", { ticketId: ticket._id });
  res.json({ ticket });
}

/**
 * Payment received
 */
export async function markPaymentReceived(req, res) {
  const { ticketId } = req.params;
  const { method } = req.body;
  const valet = req.user;

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  if (ticket.locationId.toString() !== valet.locationId.toString())
    return res.status(403).json({ message: "Not authorized for this ticket" });

  ticket.paymentStatus = method;
  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: ticket.paymentStatus,
    to: method,
    actor: `VALET:${valet.email}`,
    notes: "Payment confirmed by valet"
  });

  try {
    await whatsappService.paymentConfirmation(ticket.phone, ticket.ticketShortId);
  } catch (err) {
    console.error("WhatsApp send failed:", err.message);
  }

  emitToLocation(ticket.locationId.toString(), "ticket:payment", { ticketId: ticket._id, paymentStatus: method });
  res.json({ ticket });
}
export async function saveAllUpdates(req, res) {
  try {
    const { updates } = req.body;
    const valet = req.user;

    if (!Array.isArray(updates)) return res.status(400).json({ message: "Invalid updates array" });

    const updated = [];

    for (const change of updates) {
      const { ticketId, vehicleNumber, etaMinutes, status, paymentStatus } = change;
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) continue;

      if (ticket.locationId.toString() !== valet.locationId.toString()) continue;

      const prevStatus = ticket.status;
      if (vehicleNumber) ticket.vehicleNumber = vehicleNumber;
      if (etaMinutes) ticket.etaMinutes = etaMinutes;
      if (status) ticket.status = status;
      if (paymentStatus) ticket.paymentStatus = paymentStatus;

      await ticket.save();
      updated.push(ticket);

      // WhatsApp messages
      switch (ticket.status) {
        case STATUSES.PARKED:
          await whatsappService.carParked(ticket.phone, ticket.vehicleNumber, ticket.etaMinutes);
          break;
        case STATUSES.READY_AT_GATE:
        case STATUSES.READY_FOR_PICKUP:
          await whatsappService.readyForPickup(ticket.phone);
          break;
        case STATUSES.RECALLED:
          await whatsappService.recallRequest(ticket.phone, ticket.vehicleNumber, ticket.etaMinutes);
          break;
        case STATUSES.DROPPED:
          await whatsappService.delivered(ticket.phone);
          break;
      }

      emitToLocation(ticket.locationId.toString(), "ticket:updated", ticket);

      await StatusLog.create({
        ticketId: ticket._id,
        from: prevStatus,
        to: ticket.status,
        actor: `VALET:${valet.email}`,
        notes: "Updated in batch save",
      });
    }

    res.json({ updated });
  } catch (err) {
    console.error("Error in saveAllUpdates:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}