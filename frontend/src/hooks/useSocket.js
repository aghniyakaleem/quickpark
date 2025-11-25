// frontend/src/hooks/useSocket.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export function useSocket(locationId, handlers = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!locationId) return;

    // FORCE WebSocket → Render works best this way
    const socket = io(import.meta.env.VITE_API_URL, {
      path: "/socket.io",
      transports: ["websocket"], 
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("⚡ Socket connected:", socket.id);
      socket.emit("joinLocation", locationId);
    });

    socket.on("connect_error", (err) => {
      console.warn("❌ Socket connect_error:", err.message);
    });

    // Register event handlers
    Object.entries(handlers).forEach(([event, fn]) => {
      socket.on(event, fn);
    });

    return () => {
      Object.entries(handlers).forEach(([event, fn]) => socket.off(event, fn));
      socket.disconnect();
    };
  }, [locationId]);

  return socketRef;
}