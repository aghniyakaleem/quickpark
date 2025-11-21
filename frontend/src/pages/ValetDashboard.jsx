// frontend/src/pages/ValetDashboard.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import socket from "../services/socket";
import toast from "react-hot-toast";

export default function ValetDashboard() {
  const { getUser } = useAuth();
  const user = getUser();

  const [tickets, setTickets] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState({});

  // Fetch location & tickets
  useEffect(() => {
    async function fetchData() {
      if (!user?.locationId) return setLoading(false);

      const locationId =
        user.locationId?.$oid || user.locationId._id || user.locationId;
      console.log("🧩 User object:", user);
      console.log("🧭 Resolved locationId:", locationId);

      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/locations/${locationId}`);
        setLocation(res.data.location);

        const ticketsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/tickets/location/${locationId}`);
        setTickets(ticketsRes.data.tickets || []);
      } catch (err) {
        console.error("❌ Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // Socket.IO setup
  useEffect(() => {
    if (!location) return;

    socket.on("connect", () => {
      console.log("✅ WebSocket connected:", socket.id);
      socket.emit("joinLocation", location._id);
    });

    socket.on("ticket:updated", (ticket) => {
      setTickets((prev) => {
        const found = prev.some((t) => String(t._id) === String(ticket._id));
        if (found) {
          return prev.map((t) => (String(t._id) === String(ticket._id) ? ticket : t));
        } else {
          return [...prev, ticket];
        }
      });
      toast.success(`Ticket updated: ${ticket.ticketShortId || ticket._id}`);
    });

    socket.on("ticket:created", (ticket) => {
      setTickets((prev) => [...prev, ticket]);
      toast.success(`New ticket created: ${ticket.ticketShortId || ticket._id}`);
    });

    // When user sends "recall" we emit ticket:recalled with { ticketId, ticket }
    socket.on("ticket:recalled", ({ ticketId, ticket }) => {
      setTickets((prev) =>
        prev.map((t) => (String(t._id) === String(ticketId) ? (ticket || { ...t, status: "RECALLED" }) : t))
      );
      toast(`Ticket ${ticketId} recalled`, { icon: "🔔" });
    });

    return () => {
      socket.off("ticket:updated");
      socket.off("ticket:created");
      socket.off("ticket:recalled");
    };
  }, [location]);

  // Track local changes for each ticket
  const handleLocalChange = (ticketId, field, value) => {
    setPendingUpdates((prev) => ({
      ...prev,
      [ticketId]: { ...(prev[ticketId] || {}), [field]: value },
    }));
  };

  // Save a single ticket
  const handleSaveTicket = async (ticketId) => {
    const updateData = pendingUpdates[ticketId];
    if (!updateData) {
      toast("No changes to save for this ticket");
      return;
    }

    try {
      const token = localStorage.getItem("token"); // or however your auth works
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/tickets/${ticketId}/valet-update`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // API returns updated ticket in res.data.ticket
      const updatedTicket = res.data.ticket;

      // Update local ticket state
      setTickets((prev) => prev.map((t) => (String(t._id) === String(ticketId) ? updatedTicket : t)));

      // Clear pending changes for this ticket
      setPendingUpdates((prev) => {
        const updated = { ...prev };
        delete updated[ticketId];
        return updated;
      });

      toast.success(`Ticket ${ticketId} updated successfully 🚗`);
    } catch (err) {
      console.error("❌ Save error:", err);
      toast.error(`Failed to save ticket ${ticketId}`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!location) return <div>No location found.</div>;

  const renderTicketRow = (t) => {
    const ticketId = t._id || t.ticketId || t.id || Math.random().toString(36).substring(7);
    const phoneMasked = t.phone ? t.phone.replace(/.(?=.{4})/g, "*") : "N/A";
    const shortId = t.ticketShortId || (ticketId.length >= 6 ? ticketId.slice(-6) : ticketId);

    return (
      <tr key={ticketId} className={t.status === "RECALLED" ? "bg-yellow-100" : ""}>
        <td>{shortId}</td>
        <td>{phoneMasked}</td>
        <td>
          <input
            defaultValue={t.vehicleNumber || ""}
            onChange={(e) => handleLocalChange(ticketId, "vehicleNumber", e.target.value)}
            placeholder="Enter vehicle number"
            className="border p-1"
          />
        </td>
        <td>
          <select
            defaultValue={t.etaMinutes || ""}
            onChange={(e) =>
              handleLocalChange(ticketId, "etaMinutes", e.target.value ? Number(e.target.value) : null)
            }
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
            defaultValue={t.status || ""}
            onChange={(e) => handleLocalChange(ticketId, "status", e.target.value)}
            className="border p-1"
          >
            <option value="AWAITING_VEHICLE_NUMBER">Awaiting Vehicle</option>
            <option value="PARKED">Parked</option>
            <option value="READY_FOR_PICKUP">Ready for Pickup</option>
            <option value="RECALLED">Recalled</option>
          </select>
        </td>
        {location.paymentRequired && (
          <td>
            <select
              defaultValue={t.paymentStatus || "UNPAID"}
              onChange={(e) => handleLocalChange(ticketId, "paymentStatus", e.target.value)}
              className="border p-1"
            >
              <option value="UNPAID">Unpaid</option>
              <option value="PAID">Paid</option>
              <option value="CASH">Cash</option>
            </select>
          </td>
        )}
        <td>
          <button
            onClick={() => handleSaveTicket(ticketId)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
          >
            Save
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Valet Dashboard - {location.name}</h1>
      <table className="w-full border border-gray-300 mb-4">
        <thead className="bg-gray-100">
          <tr>
            <th>Ticket ID</th>
            <th>Phone</th>
            <th>Vehicle No</th>
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