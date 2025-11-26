import express from "express";
import { handleMsg91Inbound } from "../controllers/msg91WebhookController.js";

const router = express.Router();

// Msg91 sends webhook as text/plain or form-data, NOT JSON
router.post(
 "/inbound",
  express.text({ type: "*/*" }),
  handleMsg91Inbound
);

export default router;