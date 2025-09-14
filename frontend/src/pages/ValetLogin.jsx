import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";

export default function ValetLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("/api/valet/login", { email, password }); // ✅ fixed route
      login(res.data.token); // save token in context/localStorage
      navigate("/valet/dashboard"); // redirect
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert(err.response?.data?.message || "Login failed ❌");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20">
      <form onSubmit={handleSubmit} className="bg-white p-6 shadow rounded-lg">
        <h2 className="text-xl font-bold mb-4">Valet Login</h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 mb-3 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 mb-3 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full bg-gold text-white py-2 rounded hover:opacity-90 transition"
        >
          Login
        </button>
      </form>
    </div>
  );
}