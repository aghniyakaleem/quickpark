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

  // Fetch location & tickets
  useEffect(() => {
    async function fetchData() {
      if (!user?.locationId) return setLoading(false);

      const locationId =
        user.locationId?.$oid || user.locationId._id || user.locationId;

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/locations/${locationId}`
        );
        setLocation(res.data.location);

        const ticketsRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/tickets/location/${locationId}`
        );
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
      setTickets((prev) =>
        prev.map((t) =>
          t._id === ticket._id || t.ticketId === ticket._id ? ticket : t
        )
      );

      // 🎉 Toast for important updates
      if (ticket.status === "RECALLED") {
        toast.error(`Ticket ${ticket.ticketShortId || ticket._id} was recalled!`);
      } else if (ticket.status === "READY_FOR_PICKUP") {
        toast.success(
          `Ticket ${ticket.ticketShortId || ticket._id} is ready for pickup 🚗`
        );
      }
    });

    socket.on("ticket:created", (ticket) => {
      setTickets((prev) => [...prev, ticket]);
      toast.success(
        `New ticket created: ${ticket.ticketShortId || ticket._id}`
      );
    });

    return () => {
      socket.off("ticket:updated");
      socket.off("ticket:created");
    };
  }, [location]);

  // Handle updates
  const handleUpdate = async (ticketId, updates) => {
    try {
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/tickets/${ticketId}/valet-update`,
        updates
      );
      setTickets((prev) =>
        prev.map((t) =>
          t._id === ticketId || t.ticketId === ticketId ? res.data.ticket : t
        )
      );
    } catch (err) {
      console.error("❌ Update error:", err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!location) return <div>No location found.</div>;

  const renderTicketRow = (t) => {
    const ticketId =
      t._id || t.ticketId || t.id || Math.random().toString(36).substring(7);
    const phoneMasked = t.phone
      ? t.phone.replace(/.(?=.{4})/g, "*")
      : "N/A";
    const shortId =
      t.ticketShortId ||
      (ticketId.length >= 6 ? ticketId.slice(-6) : ticketId);

    return (
      <tr
        key={ticketId}
        className={t.status === "RECALLED" ? "bg-yellow-100" : ""}
      >
        <td>{shortId}</td>
        <td>{phoneMasked}</td>
        <td>
          <input
            defaultValue={t.vehicleNumber || ""}
            onBlur={(e) =>
              handleUpdate(ticketId, { vehicleNumber: e.target.value })
            }
            placeholder="Enter vehicle number"
            className="border p-1"
          />
        </td>
        <td>
          <select
            defaultValue={t.etaMinutes || ""}
            onChange={(e) =>
              handleUpdate(ticketId, {
                etaMinutes: e.target.value ? Number(e.target.value) : null,
              })
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
            onChange={(e) =>
              handleUpdate(ticketId, { status: e.target.value })
            }
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
              onChange={(e) =>
                handleUpdate(ticketId, { paymentStatus: e.target.value })
              }
              className="border p-1"
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
      <h1 className="text-2xl font-bold mb-4">
        Valet Dashboard - {location.name}
      </h1>
      <table className="w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th>Ticket ID</th>
            <th>Phone</th>
            <th>Vehicle No</th>
            <th>ETA</th>
            <th>Status</th>
            {location.paymentRequired && <th>Payment</th>}
          </tr>
        </thead>
        <tbody>{tickets.map(renderTicketRow)}</tbody>
      </table>
    </div>
  );
}