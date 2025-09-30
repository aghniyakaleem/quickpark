// === FILE: src/pages/PublicLocationPage.jsx ===
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import api from "../axiosConfig";
import TicketTimeline from "../components/TicketTimeline";

export default function PublicLocationPage() {
  const { slug } = useParams();
  const [rawPhone, setRawPhone] = useState(""); // only digits
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);

  // Format display as +91 XXXXXXXXXX (no hyphen)
  const getDisplayValue = () => {
    if (!rawPhone) return "+91 ";
    return "+91 " + rawPhone;
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // keep digits only
    if (value.length <= 10) {
      setRawPhone(value);
    }
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
      setTicket(res.data.ticket);
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert(err.response?.data?.message || "Failed to create ticket ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {!ticket ? (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            🚗 Get Your Valet Ticket
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-left">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Phone Number (India)
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-yellow-500 overflow-hidden">
                <span className="px-3 text-gray-600 font-medium bg-gray-100">
                  +91
                </span>
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
                loading
                  ? "bg-yellow-400 cursor-not-allowed"
                  : "bg-yellow-600 hover:bg-yellow-700"
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
          <button
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
            onClick={() =>
              alert("Recall requested (handled in backend automatically)")
            }
          >
            Recall Car
          </button>
        </div>
      )}
    </div>
  );
}