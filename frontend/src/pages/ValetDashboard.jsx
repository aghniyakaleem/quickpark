import React, { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import useSocket from "../hooks/useSocket";

function normalizeIncomingPayload(payload) {
  if (!payload) return null;
  const ticket = payload.ticket || payload || null;
  const id = String(
    payload.ticketId ||
    payload._id ||
    payload.id ||
    payload.ticket?._id ||
    payload.ticket?.id
  );
  return { id, ticket };
}

export default function ValetDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState({});
  const [highlighted, setHighlighted] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const locationId = user?.locationId || null;
  const rowRefs = useRef({});

  useEffect(() => {
    if (!locationId) return;
    async function fetchData() {
      try {
        const locRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/locations/${locationId}`);
        setLocation(locRes.data.location);

        const ticketRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/tickets/location/${locationId}`);
        setTickets(ticketRes.data.tickets || []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [locationId]);

  const playBeep = () => {
    try {
      const audio = new Audio("/alert.mp3");
      audio.play().catch(() => {});
    } catch (e) {}
  };

  const socketHandlers = useMemo(() => ({
    "ticket:updated": (payload) => {
      const normalized = normalizeIncomingPayload(payload);
      if (!normalized) return;
      const id = normalized.id;
      const updatedTicket = normalized.ticket;

      setTickets((prev) => prev.map((t) => String(t._id) === id ? updatedTicket : t));
      toast.success(`Ticket updated ${updatedTicket?.ticketShortId ? ": " + updatedTicket.ticketShortId : ""}`);
    },
    "ticket:created": (payload) => {
      const normalized = normalizeIncomingPayload(payload);
      if (!normalized?.ticket) return;
      setTickets((prev) => [...prev, normalized.ticket]);
      toast.success(`New ticket created: ${normalized.ticket.ticketShortId}`);
    },
    "ticket:recalled": (payload) => {
      const normalized = normalizeIncomingPayload(payload);
      if (!normalized) return;
      const id = normalized.id;
      const ticketObj = normalized.ticket;
      if (ticketObj?._id) {
        setTickets((prev) => prev.map((t) => String(t._id) === id ? ticketObj : t));
      }
      setHighlighted((prev) => (prev.includes(id) ? prev : [...prev, id]));
      playBeep();
      toast("User requested their car!", { icon: "⚠️" });

      setTimeout(() => {
        rowRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }), []);

  useSocket(locationId, socketHandlers);

  const handleLocalChange = (ticketId, field, value) => {
    setPendingUpdates((prev) => ({ ...prev, [ticketId]: { ...(prev[ticketId] || {}), [field]: value } }));
  };

  const handleSaveTicket = async (ticketId) => {
    const updateData = pendingUpdates[ticketId];
    if (!updateData) return toast("No changes to save");

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/tickets/${ticketId}/valet-update`, updateData, { headers: { Authorization: `Bearer ${token}` } });
      const updated = res.data.ticket;

      setTickets((prev) => prev.map((t) => String(t._id) === ticketId ? updated : t));

      if (updateData.status === "DELIVERED") {
        setHighlighted((prev) => prev.filter((h) => h !== ticketId));
      }

      const copy = { ...pendingUpdates };
      delete copy[ticketId];
      setPendingUpdates(copy);

      toast.success("Saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");
    }
  };

  if (loading) return <div className="text-white text-center mt-20">Loading...</div>;
  if (!location) return <div className="text-white text-center mt-20">No location found.</div>;

  const filteredTickets = statusFilter === "ALL" ? tickets : tickets.filter((t) => t.status === statusFilter);
  const sortedTickets = [...filteredTickets].sort((a, b) => (a.status === "DELIVERED" && b.status !== "DELIVERED" ? 1 : a.status !== "DELIVERED" && b.status === "DELIVERED" ? -1 : 0));

  return (
    <div className="p-6 min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.05),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.03),transparent_50%),linear-gradient(180deg,#0b1020,#020617)] text-white">
      <h1 className="text-3xl font-bold mb-2">{`Valet Dashboard – ${location.name}`}</h1>
      <p className="text-xl font-semibold mb-6">Cars processed today: <span className="text-indigo-400">{tickets.length}</span></p>

      <div className="flex gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-white/20 px-4 py-3 rounded-xl bg-white/5 text-black font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        >
          <option value="ALL">All Tickets</option>
          <option value="AWAITING_VEHICLE_NUMBER">Awaiting Vehicle</option>
          <option value="PARKED">Parked</option>
          <option value="RECALLED">Recalled</option>
          <option value="READY_FOR_PICKUP">Ready for Pickup</option>
          <option value="DELIVERED">Delivered</option>
        </select>
      </div>

      <div className="overflow-x-auto shadow-2xl rounded-xl">
        <table className="w-full border-collapse bg-white/5 text-white">
          <thead className="bg-white/10 text-white/70 border-b border-white/20">
            <tr>
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">ETA</th>
              <th className="px-4 py-3">Status</th>
              {location.paymentRequired && <th className="px-4 py-3">Payment</th>}
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedTickets.map((t) => {
              const id = String(t._id);
              return (
                <tr key={id} ref={(el) => el && (rowRefs.current[id] = el)}
                  className={`transition-all ${
                    highlighted.includes(id)
                      ? "bg-red-500/30 animate-pulse"
                      : t.status === "RECALLED"
                      ? "bg-yellow-500/20"
                      : t.status === "DELIVERED"
                      ? "bg-gray-500/20 line-through text-white/50"
                      : ""
                  }`}
                >
                  <td className="px-4 py-2 font-semibold">{t.ticketShortId}</td>
                  <td className="px-4 py-2">{t.phone?.replace(/.(?=.{4})/g, "*") || "N/A"}</td>
                  <td className="px-4 py-2">
                    <input
                      defaultValue={t.vehicleNumber}
                      onChange={(e) => handleLocalChange(id, "vehicleNumber", e.target.value)}
                      className="border p-2 rounded w-full bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      defaultValue={t.etaMinutes || ""}
                      onChange={(e) => handleLocalChange(id, "etaMinutes", Number(e.target.value))}
                      className="border p-2 rounded w-full bg-white/10 text-black focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                    >
                      <option value="">Select ETA</option>
                      <option value={2}>2 mins</option>
                      <option value={5}>5 mins</option>
                      <option value={10}>10 mins</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      defaultValue={t.status}
                      onChange={(e) => handleLocalChange(id, "status", e.target.value)}
                      className="border border-white/20 p-2 rounded-lg w-full bg-white/5 text-black focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                    >
                      <option value="AWAITING_VEHICLE_NUMBER">Awaiting Vehicle</option>
                      <option value="PARKED">Parked</option>
                      <option value="RECALLED">Recalled</option>
                      <option value="READY_FOR_PICKUP">Ready for Pickup</option>
                      <option value="DELIVERED">Delivered</option>
                    </select>
                  </td>
                  {location.paymentRequired && (
                    <td className="px-4 py-2">
                      <select
                        defaultValue={t.paymentStatus}
                        onChange={(e) => handleLocalChange(id, "paymentStatus", e.target.value)}
                        className="border p-2 rounded w-full bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                      >
                        <option value="UNPAID">Unpaid</option>
                        <option value="PAID">Paid</option>
                        <option value="CASH">Cash</option>
                      </select>
                    </td>
                  )}
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleSaveTicket(id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow transition"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}