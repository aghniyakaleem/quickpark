// backend/services/socketService.js
import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
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
    transports: ["polling", "websocket"], // polling first is more stable behind proxies
    path: "/socket.io",
    // render-friendly tuning
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log("🔌 New socket connected:", socket.id);

    socket.on("joinLocation", (locationId) => {
      // Accept string or object with id
      const room = typeof locationId === "object" && locationId?.locationId ? locationId.locationId : locationId;
      if (room) {
        socket.join(room);
        console.log(`🔒 Socket ${socket.id} joined room: ${room}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", socket.id, reason);
    });
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