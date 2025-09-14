import Ticket from "../models/Ticket.js";
import Location from "../models/Location.js";
import StatusLog from "../models/StatusLog.js";
import { shortId } from "../utils/helpers.js";
import whatsappService from "../services/whatsappService.js";
import { STATUSES, PAYMENT_STATUSES } from "../utils/enums.js";
import { emitToLocation } from "../services/socketService.js";

/**
 * Public: create ticket from location slug context
 */
export async function createTicketPublic(req, res) {
  const { slug } = req.params;
  const { phone } = req.body;
  if (!phone) return res.status(422).json({ message: "Phone required" });
  const location = await Location.findOne({ slug });
  if (!location) return res.status(404).json({ message: "Location not found" });

  const ticketShort = shortId("QK-");
  const ticket = await Ticket.create({
    ticketShortId: ticketShort,
    locationId: location._id,
    phone,
    status: STATUSES.AWAITING_VEHICLE_NUMBER
  });

  await StatusLog.create({
    ticketId: ticket._id,
    from: "NONE",
    to: STATUSES.AWAITING_VEHICLE_NUMBER,
    actor: "PUBLIC",
    notes: "Ticket created by public portal"
  });

  // notify user via WhatsApp
  const msg = whatsappService.WhatsAppTemplates.ticketCreated(ticketShort, location.name);
  await whatsappService.sendTemplate(phone, msg);

  // emit socket event to location room
  emitToLocation(location._id.toString(), "ticket:created", { ticketId: ticket._id, shortId: ticketShort });

  res.json({ ticket: { id: ticket._id, ticketShortId: ticketShort, publicUrl: `${process.env.PUBLIC_URL}/l/${location.slug}` } });
}

/**
 * Public: recall flow initiation (payment gating happens here)
 */
import LocationModel from "../models/Location.js";
export async function recallRequestPublic(req, res) {
  const { slug } = req.params;
  const { ticketShortId, payMode } = req.body; // payMode: "ONLINE" or "CASH"
  if (!ticketShortId) return res.status(422).json({ message: "ticketShortId required" });
  const location = await LocationModel.findOne({ slug });
  if (!location) return res.status(404).json({ message: "Location not found" });

  const ticket = await Ticket.findOne({ ticketShortId, locationId: location._id });
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  // If paymentRequired true, require selection
  if (location.paymentRequired) {
    if (!payMode) return res.status(422).json({ message: "payMode required for paid locations" });
    if (payMode === "ONLINE") {
      // create a Razorpay order (default test amount ₹50)
      const amount = 50;
      const { createRazorpayOrder } = await import("../services/paymentService.js");
      const order = await createRazorpayOrder(amount, "INR", `ticket_${ticket._id}`);
      ticket.paymentProvider = "RAZORPAY";
      ticket.paymentMeta = { order };
      await ticket.save();
      // Return payment info to client
      return res.json({ payment: { provider: "RAZORPAY", order } });
    } else if (payMode === "CASH") {
      ticket.paymentStatus = PAYMENT_STATUSES.PAY_CASH_ON_DELIVERY;
      ticket.recall = true;
      await ticket.save();
      await StatusLog.create({
        ticketId: ticket._id,
        from: ticket.status,
        to: STATUSES.RECALLED,
        actor: "PUBLIC",
        notes: "Recall requested (cash on delivery)"
      });
      emitToLocation(location._id.toString(), "ticket:recalled", { ticketId: ticket._id });
      // send whatsapp template
      await whatsappService.sendTemplate(ticket.phone, whatsappService.WhatsAppTemplates.recallReceived(ticket.ticketShortId));
      return res.json({ ok: true, message: "Recall requested; pay at pickup (cash)" });
    } else {
      return res.status(422).json({ message: "Invalid payMode" });
    }
  } else {
    // free model: immediate recall request
    ticket.recall = true;
    await ticket.save();
    await StatusLog.create({
      ticketId: ticket._id,
      from: ticket.status,
      to: STATUSES.RECALLED,
      actor: "PUBLIC",
      notes: "Recall requested (free model)"
    });
    emitToLocation(location._id.toString(), "ticket:recalled", { ticketId: ticket._id });
    await whatsappService.sendTemplate(ticket.phone, whatsappService.WhatsAppTemplates.recallReceived(ticket.ticketShortId));
    return res.json({ ok: true, message: "Recall requested" });
  }
}