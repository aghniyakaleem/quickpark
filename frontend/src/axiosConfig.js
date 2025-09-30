import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // e.g. https://quickpark-1-scq7.onrender.com/api
  withCredentials: true,
});

export default api;