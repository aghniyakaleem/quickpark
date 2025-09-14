import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await axios.post("/api/auth/login", { email, password });
    login(res.data.token);
    navigate("/admin/locations");
  };

  return (
    <div className="max-w-sm mx-auto mt-20">
      <form onSubmit={handleSubmit} className="bg-white p-6 shadow rounded-lg">
        <h2 className="text-xl font-bold mb-4">Admin Login</h2>
        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 mb-3 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 mb-3 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="w-full bg-gold text-white py-2 rounded">Login</button>
      </form>
    </div>
  );
}