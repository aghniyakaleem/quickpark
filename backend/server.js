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

    const httpServer = http.createServer(app);

    // initialize socket.io with the http server
    const io = initSocket(httpServer);

    io.on("connection", (socket) => {
      console.log(`✅ Socket connected: ${socket.id}`);
    });

    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Socket.IO ready`);
    });
  } catch (err) {
    console.error("❌ Failed to start server", err);
    process.exit(1);
  }
}

start();