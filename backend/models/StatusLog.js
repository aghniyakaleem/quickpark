import mongoose from "mongoose";

const StatusLogSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  actor: { type: String, required: true },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("StatusLog", StatusLogSchema);