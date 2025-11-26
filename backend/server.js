// server.js
import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv";
import { initSocket } from "./services/socketService.js";

dotenv.config();
const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
async function start() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not set in .env");
    }

    await connectDB();

    const httpServer = http.createServer(app);

    // initialize socket.io with the http server
    // initSocket will create the Server once and return the singleton io
    const io = initSocket(httpServer);

    // NOTE: Do NOT attach a second io.on("connection") handler here.
    // socketService.js manages the connection lifecycle and logging to avoid duplicate listeners.

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