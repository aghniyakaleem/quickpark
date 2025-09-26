import { Server } from "socket.io";

let ioInstance = null;

export function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"]
    }
  });

  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Listen for frontend to join a location room
    socket.on("joinLocation", (locationId) => {
      if (!locationId) return;
      const roomName = `location:${locationId}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room ${roomName}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
}

// Emit event to all clients in a location room
export function emitToLocation(locationId, event, payload) {
  if (!ioInstance) return;
  const roomName = `location:${locationId}`;
  ioInstance.to(roomName).emit(event, payload);
}