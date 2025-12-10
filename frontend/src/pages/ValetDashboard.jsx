// frontend/src/pages/ValetDashboard.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import useSocket from "../hooks/useSocket";

function normalizeIncomingPayload(payload) {
  if (!payload) return null;

  if (payload.ticket && payload.ticketId) {
    return { id: String(payload.ticketId), ticket: payload.ticket };
  }

  if (payload._id || payload.id) {
    const id = String(payload._id || payload.id);
    return { id, ticket: payload };
  }

  if (payload.ticketId && !payload.ticket) {
    return { id: String(payload.ticketId), ticket: null };
  }

  return null;
}

export default function ValetDashboard() {
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState({});
  const [highlighted, setHighlighted] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL"); // ⭐ NEW FILTER STATE

  const locationId = user?.locationId || null;
  const rowRefs = useRef({});

  // Fetch location + tickets
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

  // 🔊 Beep on recall
  const playBeep = () => {
    try {
      const audio = new Audio("/alert.mp3");
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // SOCKET HANDLERS
  const socketHandlers = useMemo(
    () => ({
      "ticket:updated": (payload) => {
        const normalized = normalizeIncomingPayload(payload) || {};
        const id = normalized?.id || (payload?._id && String(payload._id));
        const updatedTicket = normalized?.ticket || payload?.ticket || payload;

        if (!id && !updatedTicket) return;

        setTickets((prev) => {
          if (updatedTicket && updatedTicket._id) {
            const rid = String(updatedTicket._id);
            return prev.map((t) => (String(t._id) === rid ? updatedTicket : t));
          }
          return prev.map((t) =>
            String(t._id) === String(id) ? (updatedTicket || { ...t, ...payload }) : t
          );
        });

        try {
          const short =
            (updatedTicket && updatedTicket.ticketShortId) ||
            (payload?.ticket?.ticketShortId) ||
            "";
          toast.success(`Ticket updated${short ? ": " + short : ""}`);
        } catch (e) {}
      },

      "ticket:created": (payload) => {
        const normalized = normalizeIncomingPayload(payload) || {};
        const newTicket = normalized.ticket || payload;
        if (!newTicket) return;

        setTickets((prev) => [...prev, newTicket]);
        toast.success(`New ticket created: ${newTicket.ticketShortId || ""}`);
      },

      "ticket:recalled": (payload) => {
        const normalized = normalizeIncomingPayload(payload) || {};
        const id = normalized?.id || (payload?._id && String(payload._id));
        const ticketObj = normalized?.ticket || payload?.ticket || payload;

        if (ticketObj && ticketObj._id) {
          setTickets((prev) =>
            prev.map((t) =>
              String(t._id) === String(ticketObj._id) ? ticketObj : t
            )
          );
        }

        const targetId = id || (ticketObj && String(ticketObj._id));
        if (targetId) {
          setHighlighted(targetId);
          playBeep();
          toast("🚗 User requested their car!", { icon: "⚠️" });

          setTimeout(() => {
            rowRefs.current[targetId]?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 200);
        }
      },
    }),
    []
  );

  useSocket(locationId, socketHandlers);

  // ⭐ LOCAL EDITS
  const handleLocalChange = (ticketId, field, value) => {
    setPendingUpdates((prev) => ({
      ...prev,
      [ticketId]: {
        ...(prev[ticketId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveTicket = async (ticketId) => {
    const updateData = pendingUpdates[ticketId];
    if (!updateData) return toast("No changes to save");

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/tickets/${ticketId}/valet-update`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = res.data.ticket || res.data;

      setTickets((prev) =>
        prev.map((t) => (String(t._id) === String(ticketId) ? updated : t))
      );

      const updatedObj = { ...pendingUpdates };
      delete updatedObj[ticketId];
      setPendingUpdates(updatedObj);

      toast.success("Saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!location) return <div>No location found.</div>;

  // ⭐ FILTERED + SORTED TICKETS
  const filteredTickets = useMemo(() => {
    if (statusFilter === "ALL") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (a.status === "DELIVERED" && b.status !== "DELIVERED") return 1;
    if (a.status !== "DELIVERED" && b.status === "DELIVERED") return -1;
    return 0;
  });

  // RENDER ROW
  const renderTicketRow = (t) => {
    const id = String(t._id);

    return (
      <tr
        key={id}
        ref={(el) => (rowRefs.current[id] = el)}
        className={`transition-all ${
          highlighted === id
            ? "bg-red-200 animate-pulse"
            : t.status === "RECALLED"
            ? "bg-yellow-200"
            : t.status === "DELIVERED"
            ? "bg-gray-200 opacity-60"
            : "bg-white"
        }`}
      >
        <td className="px-4 py-2 font-semibold">{t.ticketShortId}</td>
        <td className="px-4 py-2">{t.phone?.replace(/.(?=.{4})/g, "*") || "N/A"}</td>

        <td className="px-4 py-2">
          <input
            defaultValue={t.vehicleNumber}
            onChange={(e) => handleLocalChange(id, "vehicleNumber", e.target.value)}
            className="border p-2 rounded w-full"
          />
        </td>

        <td className="px-4 py-2">
          <select
            defaultValue={t.etaMinutes || ""}
            onChange={(e) => handleLocalChange(id, "etaMinutes", Number(e.target.value))}
            className="border p-2 rounded w-full"
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
            className="border p-2 rounded w-full"
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
              className="border p-2 rounded w-full"
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
          >
            Save
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">
        Valet Dashboard – {location.name}
      </h1>

      {/* ⭐ DAILY COUNTER */}
      <p className="text-xl font-semibold text-gray-600 mb-6">
        Cars processed today: <span className="text-blue-600">{tickets.length}</span>
      </p>

      {/* ⭐ FILTER UI */}
      <div className="flex gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-3 rounded-lg shadow bg-white text-gray-700"
        >
          <option value="ALL">All Tickets</option>
          <option value="AWAITING_VEHICLE_NUMBER">Awaiting Vehicle</option>
          <option value="PARKED">Parked</option>
          <option value="RECALLED">Recalled</option>
          <option value="READY_FOR_PICKUP">Ready for Pickup</option>
          <option value="DELIVERED">Delivered</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto shadow-lg rounded-xl">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100 text-gray-700 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Ticket</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-left">Vehicle</th>
              <th className="px-4 py-3 text-left">ETA</th>
              <th className="px-4 py-3 text-left">Status</th>
              {location.paymentRequired && (
                <th className="px-4 py-3 text-left">Payment</th>
              )}
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>{sortedTickets.map(renderTicketRow)}</tbody>
        </table>
      </div>
    </div>
  );
}