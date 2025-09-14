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
    return jwtDecode(token);
  };

  return { token, login, logout, getUser };
};