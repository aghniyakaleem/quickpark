import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function useSocket(locationId, onTicketUpdate) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!locationId) return;

    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ["websocket"], // 🔥 FORCE WEBSOCKET ONLY
      path: "/socket.io/",       // 🔥 Required for Render
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      pingInterval: 25000,       // 🔥 Prevent "transport close"
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

    socket.on("ticket:updated", (ticket) => {
      console.log("Received ticket update:", ticket);
      onTicketUpdate(ticket);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [locationId]);

  return socketRef;
}