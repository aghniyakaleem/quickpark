// backend/services/socketService.js
import { Server } from "socket.io";

let io;

/**
 * Initialize Socket.IO server
 * - Accepts connections from frontend (polling first -> websocket)
 * - Rooms are locationId
 */
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.CORS_ORIGIN || "https://quickpark.co.in",
        "https://quickpark.co.in",
        "https://www.quickpark.co.in",
        "http://localhost:5173",
        "http://localhost:3000",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },

    // polling first is more stable behind proxies (Render)
    transports: ["polling", "websocket"],
    path: "/socket.io",

    // Stability tuning for Render / proxies
    pingInterval: 25000,
    pingTimeout: 30000,
    allowEIO3: true,
  });

  io.on("connection", (socket) => {
    console.log("🔌 New socket connected:", socket.id);

    socket.on("joinLocation", (locationId) => {
      try {
        socket.join(locationId);
        console.log(`🔒 Socket ${socket.id} joined room: ${locationId}`);
      } catch (e) {
        console.error("joinLocation error:", e);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};

export const emitToLocation = (locationId, event, data) => {
  if (!io) {
    console.error("❌ emitToLocation failed: Socket.io not initialized");
    return;
  }
  try {
    console.log(`📢 Emitting to location ${locationId} | event: ${event}`);
    io.to(locationId).emit(event, data);
  } catch (err) {
    console.error("emitToLocation error:", err);
  }
};