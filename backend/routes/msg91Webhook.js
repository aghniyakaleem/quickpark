import express from "express";
import { handleMsg91Inbound } from "../controllers/msg91WebhookController.js";

const router = express.Router();

// MSG91 sends text/plain → MUST use express.text()
router.post(
  "/webhook",
  express.text({ type: "*/*" }),  // <-- IMPORTANT
  (req, res) => {
    console.log("🔥 MSG91 WEBHOOK HIT");
    console.log("Raw Body:", req.body);

    res.status(200).json({ status: "received" });
  }
);

export default router;