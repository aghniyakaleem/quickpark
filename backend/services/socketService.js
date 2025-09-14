let ioInstance = null;

export function initSocket(server) {
  const { Server } = await import("socket.io");
  // Not used directly because server sets up socket in server.js
}

export function attachIo(io) {
  ioInstance = io;
  // room structure: location:<locationId>
  ioInstance.on("connection", (socket) => {
    // expect client to join rooms with socket.emit('join', { locationId })
    socket.on("join", ({ locationId }) => {
      if (!locationId) return;
      socket.join(`location:${locationId}`);
    });
  });
}

export function emitToLocation(locationId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`location:${locationId}`).emit(event, payload);
}