import { useState, useMemo } from "react";
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

  // Memoize decoded user so it does NOT change every render
  const user = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);

      // Normalize locationId to plain string
      if (decoded.locationId?.$oid) {
        decoded.locationId = decoded.locationId.$oid;
      }
      return decoded;

    } catch (err) {
      console.error("Invalid token", err);
      return null;
    }
  }, [token]);

  return { token, login, logout, user };
};