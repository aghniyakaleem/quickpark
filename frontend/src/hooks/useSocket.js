import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export function useSocket(locationId, handlers = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!locationId) return;
    const socket = io(import.meta.env.VITE_API_URL_WS || import.meta.env.VITE_API_URL, {
      transports: ["websocket"]
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join", { locationId });
    });

    // attach handlers
    Object.entries(handlers).forEach(([event, fn]) => {
      socket.on(event, fn);
    });

    return () => {
      Object.entries(handlers).forEach(([event, fn]) => {
        socket.off(event, fn);
      });
      socket.disconnect();
    };
  }, [locationId]);

  return socketRef;
}