// === FILE: src/pages/PublicLocationPage.jsx ===
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import api from "../axiosConfig"; // make sure baseURL points to backend
import TicketTimeline from "../components/TicketTimeline";
import Loader from "../components/Loader";

export default function PublicLocationPage() {
  const { slug } = useParams();
  const [phone, setPhone] = useState("");
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      const res = await api.post(`/api/tickets/public/${slug}`, { phone });
      setTicket(res.data.ticket); // matches ticketController response
    } catch (err) {
      console.error(err.response?.data || err.message);
      alert(err.response?.data?.message || "Failed to create ticket ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 text-center">
      {!ticket ? (
        <form onSubmit={handleSubmit} className="max-w-sm mx-auto">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone"
            className="w-full p-3 border rounded-lg mb-4"
            required
          />
          <button
            type="submit"
            className="w-full bg-gold text-white py-3 rounded-lg"
            disabled={loading}
          >
            {loading ? "Generating Ticket..." : "Get Ticket"}
          </button>
        </form>
      ) : (
        <div>
          <h2 className="text-xl font-bold mb-4">
            Ticket #{ticket.ticketShortId}
          </h2>
          <TicketTimeline status={ticket.status} />
          <button
            className="mt-6 px-4 py-2 bg-gold text-white rounded"
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