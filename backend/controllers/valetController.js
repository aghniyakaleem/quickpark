import Ticket from "../models/Ticket.js";
import StatusLog from "../models/StatusLog.js";
import Location from "../models/Location.js";
import { STATUSES, PAYMENT_STATUSES } from "../utils/enums.js";
import whatsappService from "../services/whatsappService.js";
import { emitToLocation } from "../services/socketService.js";

/**
 * Helper: verify transition allowed
 */
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
 * Get tickets for valet (scoped by user.locationId)
 * supports search and filters
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
  if (ticket.locationId.toString() !== valet.locationId.toString()) return res.status(403).json({ message: "Not authorized for this ticket" });

  if (![STATUSES.AWAITING_VEHICLE_NUMBER].includes(ticket.status)) {
    return res.status(422).json({ message: "Cannot set vehicle number in current state" });
  }

  ticket.vehicleNumber = vehicleNumber || ticket.vehicleNumber;
  ticket.parkedAt = parkedAt || ticket.parkedAt;
  ticket.status = STATUSES.PARKED;
  if (eta && [2,5,10].includes(Number(eta))) {
    ticket.etaMinutes = Number(eta);
    ticket.status = {2: STATUSES.ETA_2,5: STATUSES.ETA_5,10: STATUSES.ETA_10}[Number(eta)] || ticket.status;
  }
  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: STATUSES.AWAITING_VEHICLE_NUMBER,
    to: ticket.status,
    actor: `VALET:${valet.email}`,
    notes: `Parked by valet ${valet.email}`
  });

  // send WhatsApp: Car Parked
  await whatsappService.sendTemplate(ticket.phone, whatsappService.WhatsAppTemplates.carParked(ticket.vehicleNumber || "", ticket.parkedAt || "parking area", ticket.etaMinutes || 0));
  emitToLocation(ticket.locationId.toString(), "ticket:updated", { ticketId: ticket._id, status: ticket.status });
  res.json({ ticket });
}

/**
 * Valet sets ETA (2/5/10) — used for recalled or parked
 */
export async function setEta(req, res) {
  const { ticketId } = req.params;
  const { eta } = req.body;
  const valet = req.user;
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  if (ticket.locationId.toString() !== valet.locationId.toString()) return res.status(403).json({ message: "Not authorized for this ticket" });
  if (![2,5,10].includes(Number(eta))) return res.status(422).json({ message: "Invalid ETA" });

  // allowed transitions: from PARKED or RECALLED to ETA_X
  const current = ticket.status;
  const toStatus = {2: STATUSES.ETA_2,5: STATUSES.ETA_5,10: STATUSES.ETA_10}[Number(eta)];
  if (!allowedTransition(current, toStatus)) return res.status(422).json({ message: `Cannot set ETA from ${current}` });

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

  await whatsappService.sendTemplate(ticket.phone, whatsappService.WhatsAppTemplates.etaX(eta));
  emitToLocation(ticket.locationId.toString(), "ticket:eta", { ticketId: ticket._id, eta });
  res.json({ ticket });
}

/**
 * Valet marks Ready at Gate
 */
export async function markReadyAtGate(req, res) {
  const { ticketId } = req.params;
  const valet = req.user;
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  if (ticket.locationId.toString() !== valet.locationId.toString()) return res.status(403).json({ message: "Not authorized for this ticket" });

  const current = ticket.status;
  if (![STATUSES.ETA_2, STATUSES.ETA_5, STATUSES.ETA_10, STATUSES.RECALLED].includes(current)) {
    return res.status(422).json({ message: "Cannot mark ready from current status" });
  }

  ticket.status = STATUSES.READY_AT_GATE;
  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: current,
    to: STATUSES.READY_AT_GATE,
    actor: `VALET:${valet.email}`,
    notes: "Ready at gate"
  });

  await whatsappService.sendTemplate(ticket.phone, whatsappService.WhatsAppTemplates.readyAtGate());
  emitToLocation(ticket.locationId.toString(), "ticket:ready", { ticketId: ticket._id });
  res.json({ ticket });
}

/**
 * Valet marks Dropped (handed over). If cash flow: set PAID_CASH before dropping
 */
export async function markDropped(req, res) {
  const { ticketId } = req.params;
  const { cashReceived } = req.body;
  const valet = req.user;
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  if (ticket.locationId.toString() !== valet.locationId.toString()) return res.status(403).json({ message: "Not authorized for this ticket" });

  if (ticket.status !== STATUSES.READY_AT_GATE) {
    return res.status(422).json({ message: "Can only drop after Ready at Gate" });
  }

  // If payment was cash on delivery and cashReceived true, mark PAID_CASH
  if (ticket.paymentStatus === PAYMENT_STATUSES.PAY_CASH_ON_DELIVERY && cashReceived) {
    ticket.paymentStatus = PAYMENT_STATUSES.PAID_CASH;
  }

  ticket.status = STATUSES.DROPPED;
  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: STATUSES.READY_AT_GATE,
    to: STATUSES.DROPPED,
    actor: `VALET:${valet.email}`,
    notes: "Car handed to user"
  });

  await whatsappService.sendTemplate(ticket.phone, whatsappService.WhatsAppTemplates.dropped());
  emitToLocation(ticket.locationId.toString(), "ticket:dropped", { ticketId: ticket._id });
  res.json({ ticket });
}

/**
 * Valet marks recalled handled (used when valet accepts recall and will set ETA)
 */
export async function markRecalledHandled(req, res) {
  const { ticketId } = req.params;
  const valet = req.user;
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  if (ticket.locationId.toString() !== valet.locationId.toString()) return res.status(403).json({ message: "Not authorized for this ticket" });

  if (!ticket.recall) return res.status(422).json({ message: "Ticket is not recalled" });

  ticket.status = STATUSES.RECALLED;
  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: ticket.status,
    to: STATUSES.RECALLED,
    actor: `VALET:${valet.email}`,
    notes: "Recall acknowledged by valet"
  });

  emitToLocation(ticket.locationId.toString(), "ticket:recalled:handled", { ticketId: ticket._id });
  res.json({ ticket });
}

/**
 * Mark payment received (for cash) or update payment status (admin/valet)
 */
export async function markPaymentReceived(req, res) {
  const { ticketId } = req.params;
  const { method } = req.body; // PAID_CASH, PAID_ONLINE
  const valet = req.user;
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  if (ticket.locationId.toString() !== valet.locationId.toString()) return res.status(403).json({ message: "Not authorized for this ticket" });

  if (![PAYMENT_STATUSES.PAID_CASH, PAYMENT_STATUSES.PAID_ONLINE].includes(method)) return res.status(422).json({ message: "Invalid payment status" });
  ticket.paymentStatus = method;
  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: ticket.paymentStatus,
    to: method,
    actor: `VALET:${valet.email}`,
    notes: "Payment confirmed by valet"
  });

  await whatsappService.sendTemplate(ticket.phone, whatsappService.WhatsAppTemplates.paymentConfirmation(ticket.ticketShortId));
  emitToLocation(ticket.locationId.toString(), "ticket:payment", { ticketId: ticket._id, paymentStatus: method });
  res.json({ ticket });
}