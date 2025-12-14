import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../axiosConfig";
import { io } from "socket.io-client";
import TicketTimeline from "../components/TicketTimeline";

export default function PublicLocationPage() {
  const { slug } = useParams();
  const [rawPhone, setRawPhone] = useState("");
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) setRawPhone(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rawPhone.length !== 10) {
      alert("Please enter a valid 10-digit Indian phone number 📱");
      return;
    }

    setLoading(true);
    const whatsappNumber = "918247767904";
    const whatsappWindow = window.open("about:blank", "_blank");

    try {
      const res = await api.post(`/api/tickets/public/${slug}`, { phone: rawPhone });
      const newTicket = res.data.ticket;
      setTicket(newTicket);

      const message = `Hi QuickPark, my ticket ID is ${newTicket.ticketShortId}`;
      whatsappWindow.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      const s = io(import.meta.env.VITE_API_URL_WS, { path: "/socket.io", transports: ["websocket"] });
      setSocket(s);

      s.on("connect", () => {
        if (newTicket.locationId) s.emit("joinLocation", newTicket.locationId);
      });

      s.on("ticket:updated", (updatedTicket) => {
        if (updatedTicket._id === newTicket.id || updatedTicket._id === newTicket._id) {
          setTicket((prev) => ({ ...prev, ...updatedTicket }));
        }
      });

      s.on("ticket:recalled", ({ ticketId }) => {
        if (ticketId === newTicket.id || ticketId === newTicket._id) {
          setTicket((prev) => ({ ...prev, status: "RECALLED" }));
        }
      });
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert(err.response?.data?.message || "Failed to create ticket ❌");
      whatsappWindow.close();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => socket?.disconnect(), [socket]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.05),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.03),transparent_50%),linear-gradient(180deg,#0b1020,#020617)] p-6 text-white">
      {!ticket ? (
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-center mb-6">🚗 Get Your Valet Ticket</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-left">
              <label htmlFor="phone" className="block text-sm font-medium mb-2">Phone Number (India)</label>
              <div className="flex items-center border border-white/20 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-400">
                <span className="px-3 bg-white/10 text-white">+91</span>
                <input
                  type="tel"
                  id="phone"
                  value={rawPhone}
                  onChange={handlePhoneChange}
                  placeholder="Enter 10-digit phone"
                  className="w-full p-3 bg-transparent text-white placeholder-white/50 focus:outline-none"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 py-3 rounded-xl shadow-lg hover:scale-105 transition transform text-white font-semibold"
            >
              {loading ? "Processing..." : "Get My Ticket"}
            </button>
          </form>
        </div>
      ) : (
        <TicketTimeline ticket={ticket} />
      )}
    </div>
  );
}