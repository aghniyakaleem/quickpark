// routes/paymentWebhookRoutes.js
import express from "express";
import { razorpayWebhook } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/razorpay", express.json({ type: "*/*" }), razorpayWebhook);

export default router;