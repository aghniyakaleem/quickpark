import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function useSocket(locationId, handlers = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!locationId) return;

    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"],
      path: "/socket.io/",
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      pingInterval: 25000,
      pingTimeout: 60000,
      withCredentials: false,
      extraHeaders: {
        Origin: import.meta.env.VITE_PUBLIC_URL,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socket.emit("join-location", locationId);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    // Attach all handlers dynamically
    Object.entries(handlers).forEach(([event, fn]) => {
      socket.on(event, fn);
    });

    return () => {
      socket.disconnect();
    };
  }, [locationId]);

  return socketRef;
}