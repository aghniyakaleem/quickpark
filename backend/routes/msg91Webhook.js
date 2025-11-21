import express from "express";
import { handleMsg91Inbound } from "../controllers/msg91WebhookController.js";

const router = express.Router();

// MSG91 inbound message webhook
router.post(
  "/msg91/inbound", 
  express.json({ type: "*/*" }), 
  handleMsg91Inbound
);

export default router;