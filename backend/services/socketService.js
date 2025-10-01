import { Server } from "socket.io";

let ioInstance = null;

export function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("✅ WebSocket connected:", socket.id);

    socket.on("joinLocation", (locationId) => {
      if (!locationId) return;
      socket.join(`location:${locationId}`);
      console.log(`Socket ${socket.id} joined room location:${locationId}`);
    });

    socket.on("disconnect", () => console.log("❌ Client disconnected:", socket.id));
  });

  return io;
}

export function emitToLocation(locationId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`location:${locationId}`).emit(event, payload);
}