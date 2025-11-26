import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

let globalSocket = null;

export default function useSocket(locationId, handlers = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!locationId) return;

    if (!globalSocket) {
      globalSocket = io(import.meta.env.VITE_API_URL, {
        path: "/socket.io",           // must match server exactly
        transports: ["polling", "websocket"], // polling first to be proxy-friendly
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        pingInterval: 25000,
        pingTimeout: 60000,
        // DO NOT set extraHeaders unless absolutely necessary (CDNs can block)
        // extraHeaders: { Origin: import.meta.env.VITE_PUBLIC_URL },
        // withCredentials: true, // enable only if you need cookies
      });

      // debug listeners for reconnect lifecycle
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
      globalSocket.on("connect", () => {
        console.log("client: connected", globalSocket.id, "transport:", globalSocket.io.engine.transport.name);
      });
      globalSocket.on("disconnect", (reason) => {
        console.warn("client: disconnect", reason, "transport:", globalSocket.io.engine.transport.name);
      });
    }

    const socket = globalSocket;
    socketRef.current = socket;

    // join the room exactly once per location
    socket.emit("joinLocation", locationId);

    // Attach handlers for this component
    Object.entries(handlers).forEach(([event, fn]) => socket.on(event, fn));

    return () => {
      // cleanup handlers only
      Object.entries(handlers).forEach(([event, fn]) => socket.off(event, fn));
    };
  }, [locationId]);

  return socketRef;
}