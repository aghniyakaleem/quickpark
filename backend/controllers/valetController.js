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

// ✅ Car parked
export async function setVehicleAndPark(req, res) {
  const { ticketId } = req.params;
  const { vehicleNumber, parkedAt, eta } = req.body;
  const valet = req.user;
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

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

  // ✅ Send Hibot template: car_parked
  await whatsappService.sendTemplate(ticket.phone, "car_parked", [
    ticket.vehicleNumber || "N/A",
    ticket.etaMinutes || "0"
  ]);

  emitToLocation(ticket.locationId.toString(), "ticket:updated", { ticketId: ticket._id, status: ticket.status });
  res.json({ ticket });
}

// ✅ ETA update
export async function setEta(req, res) {
  const { ticketId } = req.params;
  const { eta } = req.body;
  const valet = req.user;
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

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

  // ✅ Send Hibot template: recall_request
  await whatsappService.sendTemplate(ticket.phone, "recall_request", [
    ticket.vehicleNumber || "N/A",
    eta
  ]);

  emitToLocation(ticket.locationId.toString(), "ticket:eta", { ticketId: ticket._id, eta });
  res.json({ ticket });
}

// ✅ Ready at gate
export async function markReadyAtGate(req, res) {
  const { ticketId } = req.params;
  const valet = req.user;
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  ticket.status = STATUSES.READY_AT_GATE;
  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: ticket.status,
    to: STATUSES.READY_AT_GATE,
    actor: `VALET:${valet.email}`,
    notes: "Ready at gate"
  });

  // ✅ Send Hibot template: ready_for_pickup
  await whatsappService.sendTemplate(ticket.phone, "ready_for_pickup", []);

  emitToLocation(ticket.locationId.toString(), "ticket:ready", { ticketId: ticket._id });
  res.json({ ticket });
}

// ✅ Delivered
export async function markDropped(req, res) {
  const { ticketId } = req.params;
  const { cashReceived } = req.body;
  const valet = req.user;
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  ticket.status = STATUSES.DROPPED;
  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: STATUSES.READY_AT_GATE,
    to: STATUSES.DROPPED,
    actor: `VALET:${valet.email}`,
    notes: "Car handed to user"
  });

  // ✅ Send Hibot template: delivered
  await whatsappService.sendTemplate(ticket.phone, "delivered", []);

  emitToLocation(ticket.locationId.toString(), "ticket:dropped", { ticketId: ticket._id });
  res.json({ ticket });
}

// ✅ Payment received
export async function markPaymentReceived(req, res) {
  const { ticketId } = req.params;
  const { method } = req.body;
  const valet = req.user;
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  ticket.paymentStatus = method;
  await ticket.save();

  await StatusLog.create({
    ticketId: ticket._id,
    from: ticket.paymentStatus,
    to: method,
    actor: `VALET:${valet.email}`,
    notes: "Payment confirmed by valet"
  });

  // ✅ Send Hibot template: payment_confirmation
  await whatsappService.sendTemplate(ticket.phone, "payment_confirmation", [
    ticket.ticketShortId
  ]);

  emitToLocation(ticket.locationId.toString(), "ticket:payment", { ticketId: ticket._id, paymentStatus: method });
  res.json({ ticket });
}