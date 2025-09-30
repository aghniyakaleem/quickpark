import axios from "axios";

// Use env variable, fallback to localhost for local dev
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

export default api;