// backend/models/Ticket.js
import mongoose from "mongoose";
import { STATUSES, PAYMENT_STATUSES } from "../utils/enums.js";

const TicketSchema = new mongoose.Schema({
  ticketShortId: { type: String, required: true, index: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
  phone: { type: String, required: true },
  vehicleNumber: { type: String, default: "" },
  status: {
    type: String,
    enum: Object.values(STATUSES),
    default: STATUSES.AWAITING_VEHICLE,
  },
  recall: { type: Boolean, default: false }, // used to flag a user-initiated recall notification
  etaMinutes: { type: Number, enum: [2, 5, 10, null], default: null },
  parkedAt: { type: String, default: "" },

  // payment
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUSES),
    default: PAYMENT_STATUSES.UNPAID,
  },
  paymentProvider: { type: String, default: "" },
  paymentAmount: { type: Number, default: 20 },
  paymentMeta: { type: Object, default: {} },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// update updatedAt on save
TicketSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// TTL: delete ticket documents 86400 seconds (24 hours) after createdAt
TicketSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model("Ticket", TicketSchema);