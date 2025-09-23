import Location from "../models/Location.js";
import User from "../models/User.js";
/**
 * Create a location and return public URL (/l/:slug)
 */
export async function createLocation(req, res) {
  const { name, paymentRequired = false, address = "" } = req.body;
  if (!name) return res.status(422).json({ message: "Name required" });
  const loc = await Location.createWithSlug(name, paymentRequired, req.user._id);
  const publicUrl = `${process.env.PUBLIC_URL.replace(/\/$/, "")}/l/${loc.slug}`;
  res.json({ location: loc, publicUrl });
}

/**
 * Create a valet user assigned to a location
 */
export async function createValet(req, res) {
  const { name, email, password, locationId } = req.body;
  if (!name || !email || !password || !locationId) return res.status(422).json({ message: "Missing fields" });
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(422).json({ message: "User with that email exists" });
  const valet = new User({ name, email: email.toLowerCase(), role: "VALET", locationId });
  await valet.setPassword(password);
  await valet.save();
  res.json({ valet: { id: valet._id, email: valet.email, name: valet.name, locationId: valet.locationId } });
}

/**
 * List locations (super admin)
 */
export async function listLocations(req, res) {
  const list = await Location.find().lean();
  const mapped = list.map(l => ({
    ...l,
    publicUrl: `${process.env.PUBLIC_URL.replace(/\/$/, "")}/l/${l.slug}`
  }));
  res.json({ locations: mapped });
}

/**
 * Create super admin user (only used via seed script normally)
 */
export async function createSuperAdmin(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(422).json({ message: "Missing fields" });
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(422).json({ message: "User exists" });
  const user = new User({ name, email: email.toLowerCase(), role: "SUPER_ADMIN" });
  await user.setPassword(password);
  await user.save();
  res.json({ ok: true, user: { id: user._id, email: user.email } });
}