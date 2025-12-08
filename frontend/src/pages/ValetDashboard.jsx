// frontend/src/pages/ValetDashboard.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import useSocket from "../hooks/useSocket";

function normalizeIncomingPayload(payload) {
  // payload may be:
  // 1) full ticket object (old)
  // 2) { ticketId, ticket }
  // 3) { ticketId, ... } or { ticket: {...} }
  if (!payload) return null;

  if (payload.ticket && payload.ticketId) {
    return { id: String(payload.ticketId), ticket: payload.ticket };
  }

  // If the server sent a plain ticket object
  if (payload._id || payload.id) {
    const id = String(payload._id || payload.id);
    return { id, ticket: payload };
  }

  // If server sent only ticketId string and maybe ticket nested
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

  // 🔊 Play alert sound
  const playBeep = () => {
    try {
      const audio = new Audio("/alert.mp3"); // put this file in public folder
      audio.play().catch(() => {});
    } catch (e) {}
  };

  // Handlers for socket events
  const socketHandlers = useMemo(() => ({
    "ticket:updated": (payload) => {
      const normalized = normalizeIncomingPayload(payload) || {};
      const id = normalized?.id || (payload?._id && String(payload._id));
      const updatedTicket = normalized?.ticket || payload?.ticket || payload;

      if (!id && !updatedTicket) return;

      setTickets((prev) => {
        // if we have a ticket object with _id use that
        if (updatedTicket && updatedTicket._id) {
          const rid = String(updatedTicket._id);
          return prev.map((t) => (String(t._id) === rid ? updatedTicket : t));
        }
        // otherwise match by id
        return prev.map((t) => (String(t._id) === String(id) ? (updatedTicket || { ...t, ...payload }) : t));
      });

      // small toast
      try {
        const short = (updatedTicket && updatedTicket.ticketShortId) || (payload && payload.ticket && payload.ticket.ticketShortId) || "";
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
      // payload may come as { ticketId, ticket } or as ticket object
      const normalized = normalizeIncomingPayload(payload) || {};
      const id = normalized?.id || (payload?._id && String(payload._id));
      const ticketObj = normalized?.ticket || payload?.ticket || payload;

      // Update local tickets array only if a full ticket object is provided
      if (ticketObj && ticketObj._id) {
        setTickets((prev) =>
          prev.map((t) => {
            if (String(t._id) === String(ticketObj._id)) {
              return ticketObj;
            }
            return t;
          })
        );
      }

      // Highlight + beep + toast — even if we didn't update DB
      const targetId = id || (ticketObj && String(ticketObj._id));
      if (targetId) {
        setHighlighted(targetId);
        playBeep();
        toast("🚗 User requested their car!", { icon: "⚠️" });

        // Scroll to that row
        setTimeout(() => {
          rowRefs.current[targetId]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 200);
      }
    }
  }), []);

  useSocket(locationId, socketHandlers);

  // Local edits
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
      setTickets((prev) => prev.map((t) => (String(t._id) === String(ticketId) ? updated : t)));

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

  // Render row
  const renderTicketRow = (t) => {
    const id = String(t._id);
    return (
      <tr
        key={id}
        ref={(el) => (rowRefs.current[id] = el)}
        className={
          highlighted === id
            ? "bg-red-200 animate-pulse"
            : t.status === "RECALLED"
            ? "bg-yellow-200"
            : ""
        }
      >
        <td>{t.ticketShortId}</td>
        <td>{t.phone?.replace(/.(?=.{4})/g, "*") || "N/A"}</td>

        <td>
          <input
            defaultValue={t.vehicleNumber}
            onChange={(e) => handleLocalChange(id, "vehicleNumber", e.target.value)}
            className="border p-1"
          />
        </td>

        <td>
          <select
            defaultValue={t.etaMinutes || ""}
            onChange={(e) => handleLocalChange(id, "etaMinutes", Number(e.target.value))}
            className="border p-1"
          >
            <option value="">Select ETA</option>
            <option value={2}>2 mins</option>
            <option value={5}>5 mins</option>
            <option value={10}>10 mins</option>
          </select>
        </td>

        <td>
          <select
            defaultValue={t.status}
            onChange={(e) => handleLocalChange(id, "status", e.target.value)}
            className="border p-1"
          >
            <option value="AWAITING_VEHICLE_NUMBER">Awaiting Vehicle</option>
            <option value="PARKED">Parked</option>
            <option value="READY_FOR_PICKUP">Ready for Pickup</option>
            <option value="RECALLED">Recalled</option>
            <option value="DROPPED">Dropped</option>
            <option value="DELIVERED">Delivered</option>
            {/* add other statuses if needed */}
          </select>
        </td>

        {location.paymentRequired && (
          <td>
            <select
              defaultValue={t.paymentStatus}
              onChange={(e) => handleLocalChange(id, "paymentStatus", e.target.value)}
              className="border p-1"
            >
              <option value="UNPAID">Unpaid</option>
              <option value="PAID">Paid</option>
              <option value="CASH">Cash</option>
            </select>
          </td>
        )}

        <td>
          <button onClick={() => handleSaveTicket(id)} className="bg-blue-600 text-white px-3 py-1 rounded">
            Save
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Valet Dashboard – {location.name}</h1>

      <table className="w-full border border-gray-300 mb-4">
        <thead className="bg-gray-100">
          <tr>
            <th>Ticket</th>
            <th>Phone</th>
            <th>Vehicle</th>
            <th>ETA</th>
            <th>Status</th>
            {location.paymentRequired && <th>Payment</th>}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>{tickets.map(renderTicketRow)}</tbody>
      </table>
    </div>
  );
}