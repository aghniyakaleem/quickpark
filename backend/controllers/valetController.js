// backend/controllers/valetController.js
import Ticket from "../models/Ticket.js";
import StatusLog from "../models/StatusLog.js";
import Location from "../models/Location.js";
import { STATUSES, PAYMENT_STATUSES } from "../utils/enums.js";
import MSG91Service from "../services/MSG91Service.js";
import { emitToLocation } from "../services/socketService.js";

function allowedTransition(current, next) {
  const rules = {
    [STATUSES.AWAITING_VEHICLE]: [STATUSES.PARKED, STATUSES.AWAITING_VEHICLE],
    [STATUSES.PARKED]: [STATUSES.RECALLED, STATUSES.DROPPED, STATUSES.PARKED, STATUSES.READY_FOR_PICKUP],
    [STATUSES.RECALLED]: [STATUSES.READY_FOR_PICKUP],
    [STATUSES.READY_FOR_PICKUP]: [STATUSES.DROPPED],
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
 * Valet sets vehicle and parks ticket
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
  ticket.recall = false;

  if (eta && [2, 5, 10].includes(Number(eta))) {
    ticket.etaMinutes = Number(eta);
  }

  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: STATUSES.AWAITING_VEHICLE,
    to: ticket.status,
    actor: `VALET:${valet.email}`,
    notes: `Parked by valet ${valet.email}`
  });

  // notify user
  try {
    await MSG91Service.carParked(ticket.phone, ticket.vehicleNumber || "N/A", ticket.etaMinutes || 5);
  } catch (err) {
    console.error("WhatsApp send failed (carParked):", err?.response?.data || err?.message || err);
  }

  const emitPayload = { ticketId: ticket._id.toString(), ticket: ticket.toObject() };
  emitToLocation(ticket.locationId.toString(), "ticket:updated", emitPayload);
  res.json({ ticket: ticket.toObject() });
}

/**
 * Valet sets ETA (simple handler)
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
  const toStatus = current; // ETA doesn't necessarily change status in this flow

  ticket.etaMinutes = Number(eta);
  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: current,
    to: toStatus,
    actor: `VALET:${valet.email}`,
    notes: `ETA set to ${eta} minutes`
  });

  try {
    // Keep a simple notification to user for ETA (reuse recallRequest template as generic update if you prefer)
    await MSG91Service.recallRequest(ticket.phone, ticket.vehicleNumber || "N/A");
  } catch (err) {
    console.error("WhatsApp send failed (eta):", err?.response?.data || err?.message || err);
  }

  emitToLocation(ticket.locationId.toString(), "ticket:eta", { ticketId: ticket._id.toString(), eta });
  res.json({ ticket: ticket.toObject() });
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
  if (![STATUSES.PARKED, STATUSES.RECALLED].includes(current))
    return res.status(422).json({ message: "Cannot mark ready from current status" });

  ticket.status = STATUSES.READY_FOR_PICKUP;
  ticket.recall = false;
  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: current,
    to: STATUSES.READY_FOR_PICKUP,
    actor: `VALET:${valet.email}`,
    notes: "Ready at gate"
  });

  try {
    await MSG91Service.readyForPickup(ticket.phone, ticket.vehicleNumber);
  } catch (err) {
    console.error("WhatsApp send failed (readyForPickup):", err?.response?.data || err?.message || err);
  }

  emitToLocation(ticket.locationId.toString(), "ticket:ready", { ticketId: ticket._id.toString(), ticket: ticket.toObject() });
  res.json({ ticket: ticket.toObject() });
}

/**
 * Delivered / Dropped
 */
export async function markDropped(req, res) {
  const { ticketId } = req.params;
  const { cashReceived } = req.body;
  const valet = req.user;

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  if (ticket.locationId.toString() !== valet.locationId.toString())
    return res.status(403).json({ message: "Not authorized for this ticket" });

  const prev = ticket.status;
  ticket.status = STATUSES.DROPPED;
  ticket.recall = false;

  if (ticket.paymentStatus === PAYMENT_STATUSES.PAY_CASH_ON_DELIVERY && cashReceived) {
    ticket.paymentStatus = PAYMENT_STATUSES.PAID;
  }

  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: prev,
    to: ticket.status,
    actor: `VALET:${valet.email}`,
    notes: "Car handed to user"
  });

  try {
    await MSG91Service.delivered(ticket.phone, ticket.vehicleNumber);
  } catch (err) {
    console.error("WhatsApp send failed (delivered):", err?.response?.data || err?.message || err);
  }

  emitToLocation(ticket.locationId.toString(), "ticket:dropped", { ticketId: ticket._id.toString(), ticket: ticket.toObject() });
  res.json({ ticket: ticket.toObject() });
}