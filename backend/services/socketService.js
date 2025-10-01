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
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"], // allow fallback
    path: "/socket.io", // IMPORTANT: match default path
  });

  io.on("connection", (socket) => {
    console.log("🔌 New socket connected:", socket.id);

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
    console.error("Socket.io not initialized");
    return;
  }
  io.to(locationId).emit(event, data);
};