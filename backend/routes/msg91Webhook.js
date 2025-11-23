// backend/routes/msg91Webhook.js
import express from "express";
import { handleMsg91Inbound } from "../controllers/msg91WebhookController.js";

const router = express.Router();

router.post("/inbound", express.json({ type: "*/*" }), handleMsg91Inbound);

export default router;