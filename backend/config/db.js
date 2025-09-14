import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

export async function connectDB() {
  if (!MONGO_URI) {
    console.error("MONGO_URI not set in environment");
    process.exit(1);
  }
  try {
    await mongoose.connect(MONGO_URI, {
      dbName: "quickpark",
      autoIndex: true
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}