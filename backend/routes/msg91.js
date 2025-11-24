import express from "express";
import { handleMsg91Inbound } from "../controllers/msg91WebhookController.js";

const router = express.Router();

router.post("/webhook", handleMsg91Inbound);

export default router;