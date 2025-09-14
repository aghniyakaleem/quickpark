import { Server } from "socket.io";

let io;

export const initSockets = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("joinLocation", (locationId) => {
      socket.join(locationId);
    });
  });
};

export { io };