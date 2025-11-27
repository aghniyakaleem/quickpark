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
app.set("trust proxy", 1); 
// ----- FIXED CORS -----
const allowedOrigins = [
  "https://quickpark.co.in",
  "https://www.quickpark.co.in",
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow mobile apps / WhatsApp pings / curl
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("❌ BLOCKED ORIGIN:", origin);
    return callback(new Error("Not allowed by CORS"));
  },

  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(morgan("dev"));

// ----- ROUTES -----
app.use("/api/locations", locationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/valet", valetRoutes);
app.use("/webhook/msg91", msg91WebhookRoutes);
app.get("/health", (req, res) => res.json({ ok: true, time: new Date() }));

export default app;