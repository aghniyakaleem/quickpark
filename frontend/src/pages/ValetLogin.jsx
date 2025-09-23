// === FILE: src/pages/ValetLogin.jsx ===
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../axiosConfig";

export default function ValetLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/api/auth/login", { email, password });
      login(res.data.token, res.data.user);

      if (res.data.user.role === "VALET") {
        navigate("/valet/dashboard");
      } else {
        alert("Unauthorized: Not a valet account ❌");
      }
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert(err.response?.data?.message || "Login failed ❌");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 via-white to-yellow-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-3xl font-extrabold text-yellow-700 text-center mb-6">
          Valet Login
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full bg-yellow-600 text-white py-3 rounded-xl shadow hover:bg-yellow-700 transition"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-center text-gray-600">
          <p>
            Forgot password?{" "}
            <Link to="/forgot-password" className="text-yellow-700 font-semibold hover:underline">
              Reset here
            </Link>
          </p>
          <p className="mt-2">
            Back to{" "}
            <Link to="/" className="text-yellow-700 font-semibold hover:underline">
              Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}