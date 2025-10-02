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

  const getDisplayValue = () => (rawPhone ? "+91 " + rawPhone : "+91 ");

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
    try {
      const res = await api.post(`/api/tickets/public/${slug}`, { phone: rawPhone });
      const newTicket = res.data.ticket;
      setTicket(newTicket);

      // 🌟 Redirect to WhatsApp so user initiates conversation
      const hibotNumber = import.meta.env.VITE_HIBOT_NUMBER; // set in .env
      const message = `Hi QuickPark, my ticket ID is ${newTicket.ticketShortId}`;
      const whatsappUrl = `https://wa.me/${hibotNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");

      // Initialize Socket connection for this ticket
      const s = io(import.meta.env.VITE_API_URL_WS, {
        path: "/socket.io",
        transports: ["websocket"],
      });
      setSocket(s);

      s.on("connect", () => {
        console.log("Socket connected:", s.id);
        if (newTicket.locationId) s.emit("joinLocation", newTicket.locationId);
      });

      s.on("ticket:updated", (updatedTicket) => {
        if (updatedTicket._id === newTicket.id || updatedTicket.ticketId === newTicket.id) {
          setTicket((prev) => ({ ...prev, ...updatedTicket }));
        }
      });

      s.on("ticket:recalled", ({ ticketId }) => {
        if (ticketId === newTicket.id) {
          setTicket((prev) => ({ ...prev, status: "RECALLED" }));
        }
      });
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert(err.response?.data?.message || "Failed to create ticket ❌");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => socket?.disconnect(), [socket]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {!ticket ? (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            🚗 Get Your Valet Ticket
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-left">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (India)
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-yellow-500 overflow-hidden">
                <span className="px-3 text-gray-600 font-medium bg-gray-100">+91</span>
                <input
                  id="phone"
                  type="tel"
                  value={rawPhone}
                  onChange={handlePhoneChange}
                  placeholder="Enter 10-digit number"
                  className="flex-1 px-3 py-3 outline-none text-gray-800 font-medium"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Must be a valid 10-digit Indian mobile number.
              </p>
            </div>

            <button
              type="submit"
              className={`w-full py-3 rounded-lg font-semibold text-white transition ${
                loading ? "bg-yellow-400 cursor-not-allowed" : "bg-yellow-600 hover:bg-yellow-700"
              }`}
              disabled={loading}
            >
              {loading ? "Generating Ticket..." : "Get Ticket"}
            </button>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            🎟️ Ticket #{ticket.ticketShortId}
          </h2>
          <div className="mb-6">
            <TicketTimeline status={ticket.status} />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Status: <span className="font-semibold">{ticket.status}</span>
          </p>
          <p className="text-sm text-gray-500">
            Vehicle: <span className="font-semibold">{ticket.vehicleNumber || "Not assigned"}</span>
          </p>
        </div>
      )}
    </div>
  );
}