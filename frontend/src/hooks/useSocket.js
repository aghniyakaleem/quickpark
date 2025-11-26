// src/hooks/useSocket.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

let globalSocket = null;

export default function useSocket(locationId, handlers = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!locationId) return;

    // create a single global socket instance (singleton)
    if (!globalSocket) {
      globalSocket = io(import.meta.env.VITE_API_URL, {
        path: "/socket.io",           // must match server exactly
        transports: ["websocket"],    // match server: websocket-only
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        pingInterval: 25000,
        pingTimeout: 60000,
        autoConnect: true,
      });

      // client lifecycle debug
      globalSocket.on("connect", () => {
        console.log("client: connected", globalSocket.id, "transport:", globalSocket.io?.engine?.transport?.name);
      });
      globalSocket.on("connect_error", (err) => {
        console.error("socket connect_error", err);
      });
      globalSocket.on("reconnect_attempt", (n) => {
        console.warn("socket reconnect_attempt", n);
      });
      globalSocket.on("reconnect_error", (err) => {
        console.error("socket reconnect_error", err);
      });
      globalSocket.on("error", (err) => {
        console.error("socket error", err);
      });
      globalSocket.on("disconnect", (reason) => {
        console.warn("client: disconnect", reason, "transport:", globalSocket.io?.engine?.transport?.name);
      });

      // Respond to server heartbeat to keep connection alive from client side
      globalSocket.on("server:ping", () => {
        try {
          globalSocket.emit("client:pong");
        } catch (err) {
          // ignore
        }
      });
    }

    const socket = globalSocket;
    socketRef.current = socket;

    // Ensure we join the location room once we're connected
    const joinRoom = () => {
      try {
        socket.emit("joinLocation", locationId);
      } catch (err) {
        console.error("Failed to emit joinLocation", err);
      }
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once("connect", joinRoom);
    }

    // Attach provided handlers (component-specific)
    Object.entries(handlers).forEach(([event, fn]) => {
      socket.on(event, fn);
    });

    // cleanup: remove the handlers we attached. Do NOT disconnect the global socket.
    return () => {
      Object.entries(handlers).forEach(([event, fn]) => {
        try {
          socket.off(event, fn);
        } catch (err) {
          // ignore
        }
      });
      // don't disconnect globalSocket here
    };
  }, [locationId]);

  return socketRef;
}