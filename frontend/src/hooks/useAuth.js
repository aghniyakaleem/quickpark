import { useState } from "react";
import jwtDecode from "jwt-decode";

export const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem("token"));

  const login = (jwt) => {
    localStorage.setItem("token", jwt);
    setToken(jwt);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  const getUser = () => {
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      // Ensure locationId is accessible as a string
      if (decoded.locationId && decoded.locationId.$oid) {
        decoded.locationId = decoded.locationId.$oid;
      }
      return decoded;
    } catch (err) {
      console.error("Invalid token", err);
      return null;
    }
  };

  return { token, login, logout, getUser };
};