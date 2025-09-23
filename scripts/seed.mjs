// === FILE: scripts/seed.mjs ===
import mongoose from "../backend/db.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config({ path: ".env" });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) throw new Error("MONGO_URI missing");

async function seed() {
  try {
    // Connect first
    await mongoose.connect(MONGO_URI, {
      dbName: "quickpark",
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB connected (readyState =", mongoose.connection.readyState, ")");

    // Import models AFTER connection so they register on the same default mongoose connection
    const { default: Location } = await import("../backend/models/Location.js");
    const { default: User } = await import("../backend/models/User.js");

    // DEBUG: double-check model connection state
    console.log("Models loaded. Collections:", (await mongoose.connection.db.listCollections().toArray()).map(c=>c.name));

    // Clear existing data
    await User.deleteMany({});
    await Location.deleteMany({});
    console.log("🧹 Cleared existing users and locations");

    // (rest of your seeding: super admin, locations, valets)
    const superAdminPasswordHash = await bcrypt.hash("SuperAdmin123!", 10);
    const superAdmin = await User.create({
      name: "Super Admin",
      email: "admin@quickpark.co.in",
      passwordHash: superAdminPasswordHash,
      role: "SUPER_ADMIN",
    });

    const freeLocation = await Location.create({
      name: "Cafe Deluxe",
      slug: "cafe-deluxe",
      paymentRequired: false,
    });
    const paidLocation = await Location.create({
      name: "Grand Hotel",
      slug: "grand-hotel",
      paymentRequired: true,
    });

    const valetPasswordHash = await bcrypt.hash("Valet123!", 10);
    await User.create({ name: "Valet 1", email: "valet1@quickpark.co.in", passwordHash: valetPasswordHash, role: "VALET", locationId: freeLocation._id });
    await User.create({ name: "Valet 2", email: "valet2@quickpark.co.in", passwordHash: valetPasswordHash, role: "VALET", locationId: paidLocation._id });

    console.log("🌱 Seed completed successfully!");
  } catch (err) {
    console.error("❌ Seeding error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
    process.exit(0);
  }
}

seed();