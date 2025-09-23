import dotenv from "dotenv";
dotenv.config();import express from "express";
import cors from "cors";
import morgan from "morgan";
console.log("Loaded JWT_SECRET:", process.env.JWT_SECRET);
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import ticketRoutes from "./routes/ticket.js";
import valetRoutes from "./routes/valet.js";
import paymentRoutes from "./routes/payment.js";
import webhookRoutes from "./routes/webhooks.js";

const app = express();
app.use(express.json());
app.use(morgan("dev"));
app.use(cors({
  origin: "http://localhost:3000", // your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true, time: new Date() }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/valet", valetRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhookRoutes);

// Public location page can be served by frontend; backend provides API only
export default app;