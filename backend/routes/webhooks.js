import express from "express";
import { razorpayWebhook } from "../controllers/paymentController.js";
const router = express.Router();

/**
 * Webhook endpoints for payments
 * Note: Make sure provider sends proper JSON body.
 */
router.post("/razorpay", express.json({ type: "*/*" }), razorpayWebhook);

export default router;