import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv";
dotenv.config();
import { Server as IOServer } from "socket.io";
import { attachIo, emitToLocation } from "./services/socketService.js";

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();
  const httpServer = http.createServer(app);
  const io = new IOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"]
    }
  });

  // attach socket instance to service
  // we'll attach minimal events and allow clients to join location rooms
  io.on("connection", (socket) => {
    socket.on("join", ({ locationId }) => {
      if (locationId) socket.join(`location:${locationId}`);
    });
  });

  // make emitToLocation use this instance by setting exported ioInstance
  // hack: override attachIo function to set internal instance
  import("./services/socketService.js").then(mod => {
    mod.attachIo(io);
  });

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error("Failed to start server", err);
  process.exit(1);
});