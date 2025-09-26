import Location from "../models/Location.js";

/**
 * Get location by ID
 */
export async function getLocationById(req, res) {
  try {
    const { id } = req.params;
    console.log("Fetching location with ID:", id); // debug log

    const location = await Location.findById(id);
    if (!location) return res.status(404).json({ message: "Location not found" });

    res.json({ location });
  } catch (err) {
    console.error("Error fetching location:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}