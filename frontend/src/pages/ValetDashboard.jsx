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

        const short =
          updatedTicket?.ticketShortId ||
          payload?.ticket?.ticketShortId ||
          "";

        toast.success(`Ticket updated${short ? ": " + short : ""}`);
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
        const id = normalized?.id;
        const ticketObj = normalized?.ticket || payload?.ticket || payload;

        if (ticketObj && ticketObj._id) {
          setTickets((prev) =>
            prev.map((t) =>
              String(t._id) === String(ticketObj._id) ? ticketObj : t
            )
          );
        }

        const targetId = id || ticketObj?._id;
        if (targetId) {
          setHighlighted((prev) => {
            if (prev.includes(targetId)) return prev; // already highlighted
            return [...prev, targetId];               // add multiple
          });
          playBeep();
          toast("User requested their car!", { icon: "⚠️" });

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
  
      // Update UI
      setTickets((prev) =>
        prev.map((t) => (String(t._id) === String(ticketId) ? updated : t))
      );
  
      // REMOVE highlight **only after success**
      if (updateData.status === "DELIVERED") {
        setHighlighted((prev) => prev.filter((hid) => hid !== ticketId));
      }
  
      // Clear pending updates
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

  const filteredTickets = statusFilter === "ALL"
    ? tickets
    : tickets.filter((t) => t.status === statusFilter);

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (a.status === "DELIVERED" && b.status !== "DELIVERED") return 1;
    if (a.status !== "DELIVERED" && b.status === "DELIVERED") return -1;
    return 0;
  });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">
        Valet Dashboard – {location.name}
      </h1>

      <p className="text-xl font-semibold text-gray-600 mb-6">
        Cars processed today: <span className="text-blue-600">{tickets.length}</span>
      </p>

      <div className="flex gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="
    border border-gray-300
    px-4 py-3
    rounded-xl
    bg-white
    text-gray-800
    shadow
    font-semibold
    focus:outline-none
    focus:ring-2 focus:ring-blue-400
    transition-all
  "
>
          <option value="ALL">All Tickets</option>
          <option value="AWAITING_VEHICLE_NUMBER">Awaiting Vehicle</option>
          <option value="PARKED">Parked</option>
          <option value="RECALLED">Recalled</option>
          <option value="READY_FOR_PICKUP">Ready for Pickup</option>
          <option value="DELIVERED">Delivered</option>
        </select>
      </div>

      {/* ⭐ SINGLE CLEAN TABLE (no nesting!) */}
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

          <tbody>
            {sortedTickets.map((t) => {
              const id = String(t._id);
              return (
                <tr
                  key={id}
                  ref={(el) => (rowRefs.current[id] = el)}
                  className={`transition-all ${
                    highlighted.includes(id)
                      ? "bg-red-200 animate-pulse"
                      : t.status === "RECALLED"
                      ? "bg-yellow-200"
                      : t.status === "DELIVERED"
                      ? "bg-gray-300 text-gray-500 line-through"
                      : " "
                  }`}
                >
                  <td className="px-4 py-2 font-semibold">{t.ticketShortId}</td>
                  <td className="px-4 py-2">
                    {t.phone?.replace(/.(?=.{4})/g, "*") || "N/A"}
                  </td>

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
                      className="
    border border-gray-300
    p-2 rounded-lg
    w-full
    bg-white
    text-gray-800
    shadow-sm
    focus:outline-none
    focus:ring-2 focus:ring-blue-400
    transition-all
  "
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}