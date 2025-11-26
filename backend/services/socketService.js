// backend/services/socketService.js
import { Server } from "socket.io";
import os from "os";

let io = null;

export const initSocket = (server) => {
  if (io) return io; // singleton guard

  io = new Server(server, {
    cors: {
      origin: [
        "https://quickpark.co.in",
        "https://www.quickpark.co.in",
        "http://localhost:5173",
        "http://localhost:3000",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },

    // Render-hardened options
    transports: ["websocket"],   // force WebSocket
    upgrade: false,              // avoid polling->upgrade handshake
    path: "/socket.io",
    pingTimeout: 120000,         // allow 120s before engine.io decides it's timed out
    pingInterval: 25000,
    perMessageDeflate: false,
    maxHttpBufferSize: 1e8,
  });

  io.on("connection", (socket) => {
    const pid = process.pid;
    const uptime = process.uptime();
    const mem = process.memoryUsage();
    console.log(
      `🔌 New socket connected: ${socket.id} transport: ${socket.conn?.transport?.name} pid:${pid} up:${Math.round(uptime)}s mem:${Math.round(mem.rss / 1024 / 1024)}MB host:${os.hostname()}`
    );

    // Join room handler
    socket.on("joinLocation", (locationId) => {
      const room = typeof locationId === "object" && locationId?.locationId ? locationId.locationId : locationId;
      if (room) {
        socket.join(String(room));
        console.log(`🔒 Socket ${socket.id} joined room: ${room}`);
      }
    });

    // client pong debug (optional)
    socket.on("client:pong", () => {
      // no-op: keeps connection alive
    });

    // Keepalive: proactive server heartbeats
    const heartbeatInterval = setInterval(() => {
      try {
        if (socket.connected) {
          socket.emit("server:ping", Date.now());
        }
      } catch (err) {
        // don't crash
        console.warn("heartbeat emit failed for", socket.id, err?.message || err);
      }
    }, 5000); // emit every 5s

    socket.on("disconnect", (reason) => {
      clearInterval(heartbeatInterval);
      console.log("❌ Socket disconnected:", socket.id, reason, "transport:", socket.conn?.transport?.name);
    });

    if (socket.conn) {
      socket.conn.on("close", (reason) => {
        console.log("socket.conn close:", socket.id, reason);
      });
    }
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

export const emitToLocation = (locationId, event, data) => {
  if (!io) {
    console.error("❌ emitToLocation failed: io not initialized");
    return;
  }
  try {
    console.log(`📢 Emitting ${event} to location ${locationId}`);
    io.to(String(locationId)).emit(event, data);
  } catch (err) {
    console.error("❌ emitToLocation error:", err);
  }
};