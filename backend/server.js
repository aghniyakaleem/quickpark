// server.js
import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv";
import { initSocket } from "./services/socketService.js";

dotenv.config();
const PORT = process.env.PORT || 4000;

async function start() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not set in .env");
    }

    await connectDB();

    // Create HTTP server ONCE
    const httpServer = http.createServer(app);

    // Initialize socket ONCE
    const io = initSocket(httpServer);

    // Listen ONCE
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Socket.IO ready`);
    });

  } catch (err) {
    console.error("❌ Failed to start server", err);
    process.exit(1);
  }
}

start();