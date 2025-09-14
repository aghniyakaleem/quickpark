import React, { useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
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
    const res = await axios.post(`/api/tickets/l/${slug}/tickets`, { phone });
    setTicket(res.data);
    setLoading(false);
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
          >
            Get Ticket
          </button>
        </form>
      ) : loading ? (
        <Loader />
      ) : (
        <div>
          <h2 className="text-xl font-bold">Ticket #{ticket._id.slice(-6)}</h2>
          <TicketTimeline status={ticket.status} />
          <button
            className="mt-6 px-4 py-2 bg-gold text-white rounded"
            onClick={() => alert("Recall requested (handled in backend)")}
          >
            Recall Car
          </button>
        </div>
      )}
    </div>
  );
}