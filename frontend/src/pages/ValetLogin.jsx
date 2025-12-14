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
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.1),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.08),transparent_50%),linear-gradient(180deg,#0b1020,#020617)] px-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8">
        <h2 className="text-3xl font-extrabold text-white text-center mb-6">
          Valet Login
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border border-white/20 rounded-xl px-4 py-2 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border border-white/20 rounded-xl px-4 py-2 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 py-3 rounded-xl shadow-lg hover:scale-105 transition transform text-white font-semibold"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-center text-white/70">
          <p>
            Forgot password?{" "}
            <Link to="/forgot-password" className="text-indigo-400 font-semibold hover:underline">
              Reset here
            </Link>
          </p>
          <p className="mt-2">
            Back to{" "}
            <Link to="/" className="text-indigo-400 font-semibold hover:underline">
              Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}