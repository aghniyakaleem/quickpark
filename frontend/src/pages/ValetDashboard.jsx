// src/pages/ValetDashboard.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { io } from "socket.io-client";
import axios from "axios";

export default function ValetDashboard() {
  const { getUser } = useAuth();
  const user = getUser();

  const [tickets, setTickets] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Log user for debugging
  useEffect(() => {
    console.log("Logged in user:", user);
  }, [user]);

  // Fetch location info
  useEffect(() => {
    async function fetchLocation() {
      if (!user || !user.locationId) {
        console.error("No locationId found for user:", user);
        setLoading(false);
        return;
      }

      try {
        const locationId = typeof user.locationId === "string" ? user.locationId : user.locationId.$oid;
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/locations/${locationId}`);
        setLocation(res.data.location);

        // Fetch initial tickets for this location
        const ticketsRes = await axios.get(`${import.meta.env.VITE_API_URL}/tickets/location/${locationId}`);
        setTickets(ticketsRes.data.tickets || []);
      } catch (err) {
        console.error("Failed to fetch location or tickets:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLocation();
  }, [user]);

  // Setup socket connection
  useEffect(() => {
    if (!location) return;

    const socket = io(import.meta.env.VITE_API_URL_WS, { transports: ["websocket"] });
    socket.emit("joinLocation", location._id);

    socket.on("ticket:created", (ticket) => {
      console.log("Ticket created:", ticket);
      setTickets((prev) => [...prev, ticket]);
    });

    socket.on("ticket:updated", (ticket) => {
      console.log("Ticket updated:", ticket);
      setTickets((prev) =>
        prev.map((t) => (t._id === ticket._id || t.ticketId === ticket._id ? ticket : t))
      );
    });

    socket.on("ticket:recalled", ({ ticketId }) => {
      console.log("Ticket recalled:", ticketId);
      setTickets((prev) =>
        prev.map((t) =>
          t._id === ticketId || t.ticketId === ticketId ? { ...t, status: "RECALLED" } : t
        )
      );
    });

    return () => socket.disconnect();
  }, [location]);

  const handleUpdate = async (ticketId, updates) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/tickets/${ticketId}/valet-update`, updates);
    } catch (err) {
      console.error("Error updating ticket:", err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!location) return <div>No location found.</div>;

  const paidTickets = tickets.filter((t) => location.paymentRequired);
  const freeTickets = tickets.filter((t) => !location.paymentRequired);

  const renderTicketRow = (t) => {
    const ticketId = t._id || t.ticketId || t.id || Math.random().toString(36).substring(7); // fallback
    const phoneMasked = t.phone ? t.phone.replace(/.(?=.{4})/g, "*") : "N/A";
    const shortId = t.ticketShortId || (ticketId.length >= 6 ? ticketId.slice(-6) : ticketId);

    return (
      <tr key={ticketId} className={`border-t ${t.status === "RECALLED" ? "bg-yellow-100" : ""}`}>
        <td className="p-2">{shortId}</td>
        <td>{phoneMasked}</td>
        <td>
          <input
            type="text"
            value={t.vehicleNumber || ""}
            onChange={(e) => handleUpdate(ticketId, { vehicleNumber: e.target.value })}
            placeholder="Enter vehicle number"
            className="border p-1 w-full"
          />
        </td>
        <td>
          <select
            value={t.etaMinutes || ""}
            onChange={(e) =>
              handleUpdate(ticketId, { etaMinutes: e.target.value ? Number(e.target.value) : null })
            }
            className="border p-1 w-full"
          >
            <option value="">Select ETA</option>
            <option value={2}>2 mins</option>
            <option value={5}>5 mins</option>
            <option value={10}>10 mins</option>
          </select>
        </td>
        <td>
          <select
            value={t.status || ""}
            onChange={(e) => handleUpdate(ticketId, { status: e.target.value })}
            className="border p-1 w-full"
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
              value={t.paymentStatus || "UNPAID"}
              onChange={(e) => handleUpdate(ticketId, { paymentStatus: e.target.value })}
              className="border p-1 w-full"
            >
              <option value="UNPAID">Unpaid</option>
              <option value="PAID">Paid</option>
              <option value="CASH">Cash</option>
            </select>
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Valet Dashboard - {location.name}</h1>

      {location.paymentRequired && (
        <>
          <h2 className="text-xl font-semibold mb-2">Paid Tickets</h2>
          <table className="w-full border mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Ticket ID</th>
                <th>User Phone</th>
                <th>Vehicle Number</th>
                <th>ETA</th>
                <th>Status</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>{paidTickets.map(renderTicketRow)}</tbody>
          </table>
        </>
      )}

      {!location.paymentRequired && (
        <>
          <h2 className="text-xl font-semibold mb-2">Free Tickets</h2>
          <table className="w-full border mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Ticket ID</th>
                <th>User Phone</th>
                <th>Vehicle Number</th>
                <th>ETA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>{freeTickets.map(renderTicketRow)}</tbody>
          </table>
        </>
      )}
    </div>
  );
}