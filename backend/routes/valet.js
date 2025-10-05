import express from "express";
import { authMiddleware, requireRole, requireLocationScope } from "../middleware/auth.js";
import {
  getTicketsForValet,
  setVehicleAndPark,
  setEta,
  markReadyAtGate,
  markDropped,
  markPaymentReceived,
  saveAllUpdates
} from "../controllers/valetController.js";
import { body } from "express-validator";
import { handleValidation } from "../middleware/validate.js";

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole("VALET"));
router.use(requireLocationScope());

router.get("/tickets", getTicketsForValet);

router.post("/tickets/:ticketId/set-vehicle",
  body("vehicleNumber").isString().notEmpty(),
  handleValidation,
  setVehicleAndPark
);

router.post("/tickets/:ticketId/set-eta",
  body("eta").isInt({ min: 2, max: 10 }),
  handleValidation,
  setEta
);

router.post("/tickets/:ticketId/ready", markReadyAtGate);

router.post("/tickets/:ticketId/dropped",
  body("cashReceived").optional().isBoolean(),
  handleValidation,
  markDropped
);
router.post("/save", saveAllUpdates);
// Removed the recalled-handled route since it's not defined/needed

router.post("/tickets/:ticketId/payment",
  body("method").isIn(["PAID_CASH","PAID_ONLINE"]),
  handleValidation,
  markPaymentReceived
);

export default router;