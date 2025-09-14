// === FILE: scripts/seed.mjs ===
import mongoose from "../backend/node_modules/mongoose/index.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Location from "../backend/models/Location.js";
import User from "../backend/models/User.js";

dotenv.config({ path: ".env" });

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear old data
    await User.deleteMany({});
    await Location.deleteMany({});

    // Create Super Admin
    const superAdminPassword = await bcrypt.hash("SuperAdmin123!", 10);
    const superAdmin = await User.create({
      email: "admin@quickpark.co.in",
      password: superAdminPassword,
      role: "superadmin",
    });

    // Create Locations
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

    // Create Valet Users
    const valet1Password = await bcrypt.hash("Valet123!", 10);
    const valet2Password = await bcrypt.hash("Valet123!", 10);

    const valet1 = await User.create({
      email: "valet1@quickpark.co.in",
      password: valet1Password,
      role: "valet",
      locationId: freeLocation._id,
    });

    const valet2 = await User.create({
      email: "valet2@quickpark.co.in",
      password: valet2Password,
      role: "valet",
      locationId: paidLocation._id,
    });

    console.log("🌱 Seed completed successfully!");
    console.log("\n--- Accounts Created ---");
    console.log("Super Admin:");
    console.log("  Email: admin@quickpark.co.in");
    console.log("  Password: SuperAdmin123!\n");

    console.log("Valets:");
    console.log("  Email: valet1@quickpark.co.in | Password: Valet123! | Location: Cafe Deluxe (Free)");
    console.log("  Email: valet2@quickpark.co.in | Password: Valet123! | Location: Grand Hotel (Paid)\n");

    console.log("--- Public Location URLs ---");
    console.log(`Cafe Deluxe: ${process.env.PUBLIC_URL}/l/${freeLocation.slug}`);
    console.log(`Grand Hotel: ${process.env.PUBLIC_URL}/l/${paidLocation.slug}\n`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
};

seed();