// services/socketService.js
import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "https://quickpark.co.in",
        "https://www.quickpark.co.in",
        "http://localhost:5173",
        "http://localhost:3000"
      ],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ["websocket", "polling"], // fallback support for iOS/4G
    path: "/socket.io"
  });

  io.on("connection", (socket) => {
    console.log("🔌 New socket connected:", socket.id);

    // User/Valet joins a room based on location
    socket.on("joinLocation", (locationId) => {
      socket.join(locationId);
      console.log(`🔒 Socket ${socket.id} joined room: ${locationId}`);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export const emitToLocation = (locationId, event, data) => {
  if (!io) {
    console.error("❌ emitToLocation failed: Socket.io not initialized");
    return;
  }

  console.log(`📢 Emitting to location ${locationId} | event: ${event}`);
  io.to(locationId).emit(event, data);
};