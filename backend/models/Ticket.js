// models/Ticket.js
import mongoose from "mongoose";
import { STATUSES, PAYMENT_STATUSES } from "../utils/enums.js";

const TicketSchema = new mongoose.Schema({
  ticketShortId: { type: String, required: true, index: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
  phone: { type: String, required: true },
  vehicleNumber: { type: String, default: "" },
  status: { type: String, enum: Object.values(STATUSES), default: STATUSES.AWAITING_VEHICLE_NUMBER },
  recall: { type: Boolean, default: false },
  etaMinutes: { type: Number, enum: [2, 5, 10, null], default: null },
  parkedAt: { type: String, default: "" },
  // payment
  paymentStatus: { type: String, enum: Object.values(PAYMENT_STATUSES), default: PAYMENT_STATUSES.UNPAID },
  paymentProvider: { type: String, default: "" },
  // amount that applies to this ticket (copy from location.paymentAmount on create if desired)
  paymentAmount: { type: Number, default: 20 },
  paymentMeta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

TicketSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("Ticket", TicketSchema);