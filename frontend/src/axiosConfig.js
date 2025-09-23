import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000", // backend server
});

export default api;