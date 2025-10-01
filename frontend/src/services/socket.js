// src/services/socket.js
import { io } from "socket.io-client";

// VITE_API_URL must be set in your .env file
// Example: VITE_API_URL=https://quickpark-1-scq7.onrender.com
const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
  path: "/socket.io",   // must match backend
});

export default socket;