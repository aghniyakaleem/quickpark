// app.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import ticketRoutes from "./routes/ticket.js";
import valetRoutes from "./routes/valet.js";
import msg91WebhookRoutes from "./routes/msg91Webhook.js";
import locationRoutes from "./routes/location.js";

const app = express();

app.use(express.json());
app.use(morgan("dev"));
app.use(cors({
  origin: [
    "https://quickpark.co.in",
    "https://www.quickpark.co.in",
    "http://localhost:5173",
  ],
  credentials: true,
}));

app.use("/api/locations", locationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/valet", valetRoutes);
app.use("/api/webhooks", msg91WebhookRoutes);

app.get("/health", (req, res) => res.json({ ok: true, time: new Date() }));

export default app;