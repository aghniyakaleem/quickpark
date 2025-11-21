// backend/models/TicketStats.js
import mongoose from "mongoose";

const TicketStatsSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  count: { type: Number, default: 0 },
});

export default mongoose.model("TicketStats", TicketStatsSchema);