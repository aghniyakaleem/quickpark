// frontend/src/services/socket.js
import { io } from "socket.io-client";

/**
 * Use VITE_API_URL_WS for the socket server (wss or ws)
 * Fallback to VITE_API_URL if not present (will automatically upgrade).
 */
const WS_URL = import.meta.env.VITE_API_URL_WS || import.meta.env.VITE_API_URL;

const socket = io(WS_URL, {
  path: "/socket.io",
  transports: ["polling", "websocket"], // polling first is more stable behind proxies
  withCredentials: true,

  // reconnection tuning
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

// Logging
socket.on("connect", () => console.log("🟢 Socket connected:", socket.id));
socket.on("disconnect", (reason) => console.log("🔴 Socket disconnected:", reason));
socket.on("connect_error", (err) => console.log("⚠️ Socket connect error:", err.message));

export default socket;