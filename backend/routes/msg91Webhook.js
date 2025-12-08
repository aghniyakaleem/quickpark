// backend/routes/msg91Webhook.js
import express from "express";
import { handleMsg91Inbound } from "../controllers/msg91WebhookController.js";

const router = express.Router();

// MSG91 sends text/plain → MUST use express.text()
router.post(
  "/webhook",
  express.text({ type: "*/*" }),
  async (req, res) => {
    console.log("🔥 MSG91 WEBHOOK HIT");
    // pass control to controller; controller will inspect req.body (string or object)
    try {
      await handleMsg91Inbound(req, res);
    } catch (err) {
      console.error("Error in webhook route wrapper:", err);
      res.status(500).json({ ok: false });
    }
  }
);

export default router;