// backend/services/socketService.js
import { Server } from "socket.io";

let io;

/**
 * Initialize and return a singleton Socket.IO server instance.
 * Safe to call multiple times (will return same io if already created).
 */
export const initSocket = (server) => {
  if (io) {
    return io;
  }

  io = new Server(server, {
    cors: {
      origin: [
        "https://quickpark.co.in",
        "https://www.quickpark.co.in",
        "http://localhost:5173",
        "http://localhost:3000",
        // add any other client origins here
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },

    // Render-specific robust options:
    transports: ["websocket"], // FORCE websocket only (prevents polling -> upgrade handshake issues)
    upgrade: false,            // disable Engine.IO upgrade flow (avoid polling)
    path: "/socket.io",
    pingTimeout: 60000,
    pingInterval: 25000,
    perMessageDeflate: false,  // avoid compressed frames issues on some proxies
    maxHttpBufferSize: 1e8,
  });

  io.on("connection", (socket) => {
    console.log("🔌 New socket connected:", socket.id, "transport:", socket.conn?.transport?.name);

    // Join room from client
    socket.on("joinLocation", (locationId) => {
      const room = typeof locationId === "object" && locationId?.locationId ? locationId.locationId : locationId;
      if (room) {
        socket.join(String(room));
        console.log(`🔒 Socket ${socket.id} joined room: ${room}`);
      }
    });

    // client heartbeat reply (we optionally log)
    socket.on("client:pong", () => {
      // optional: uncomment to see pongs
      // console.log("client:pong from", socket.id);
    });

    // Server-side custom heartbeat to keep Render from closing idle connections
    const heartbeatInterval = setInterval(() => {
      try {
        if (socket.connected) {
          socket.emit("server:ping", Date.now());
        }
      } catch (err) {
        // swallow errors but log optionally
        console.warn("heartbeat emit failed for", socket.id, err?.message || err);
      }
    }, 10000); // every 10s

    socket.on("disconnect", (reason) => {
      clearInterval(heartbeatInterval);
      console.log("❌ Socket disconnected:", socket.id, reason, "transport:", socket.conn?.transport?.name);
    });

    // Low-level close debug
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