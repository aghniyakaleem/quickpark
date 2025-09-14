import Ticket from "../models/Ticket.js";
import { PAYMENT_STATUSES } from "../utils/enums.js";
import { emitToLocation } from "../services/socketService.js";
import whatsappService from "../services/whatsappService.js";
import Razorpay from "razorpay";
import dotenv from "dotenv";
dotenv.config();

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
let razor = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razor = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

/**
 * Razorpay webhook handler: updates ticket status to PAID_ONLINE on success
 */
export async function razorpayWebhook(req, res) {
  const payload = req.body;
  // For simplicity we trust webhook body; in production verify signature
  if (payload.event === "payment.captured" || payload.event === "order.paid") {
    const orderId = payload.payload?.payment?.entity?.order_id || payload.payload?.order?.entity?.id;
    if (orderId) {
      const ticket = await Ticket.findOne({ "paymentMeta.order.id": orderId });
      if (ticket) {
        ticket.paymentStatus = PAYMENT_STATUSES.PAID_ONLINE;
        await ticket.save();
        await whatsappService.sendTemplate(ticket.phone, whatsappService.WhatsAppTemplates.paymentConfirmation(ticket.ticketShortId));
        emitToLocation(ticket.locationId.toString(), "ticket:payment", { ticketId: ticket._id, paymentStatus: ticket.paymentStatus });
      }
    }
  }
  res.json({ ok: true });
}

/**
 * Create razorpay order for a given ticket (public endpoint fallback)
 */
export async function createRazorOrderForTicket(req, res) {
  const { ticketId } = req.params;
  const { amount } = req.body; // rupees
  if (!amount) return res.status(422).json({ message: "amount required" });
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  if (!razor) return res.status(500).json({ message: "Razorpay not configured" });
  const order = await razor.orders.create({
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: `ticket_${ticket._id}`,
    payment_capture: 1
  });
  ticket.paymentProvider = "RAZORPAY";
  ticket.paymentMeta = { order };
  await ticket.save();
  res.json({ order });
}