import express from "express";
import { getLocationById } from "../controllers/locationController.js";

const router = express.Router();

/**
 * GET /api/locations/:id
 * Returns a location by ID
 */
router.get("/:id", getLocationById);

export default router;