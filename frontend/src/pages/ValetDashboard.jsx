import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";
import { io } from "socket.io-client";

export default function ValetDashboard() {
  const { getUser } = useAuth();
  const [tickets, setTickets] = useState([]);
  const user = getUser();

  useEffect(() => {
    const socket = io("/", { transports: ["websocket"] });
    socket.emit("joinLocation", user.locationId);
    socket.on("ticketCreated", (ticket) => setTickets((prev) => [...prev, ticket]));
    socket.on("ticketUpdated", (ticket) => {
      setTickets((prev) =>
        prev.map((t) => (t._id === ticket._id ? ticket : t))
      );
    });
    return () => socket.disconnect();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Valet Dashboard</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Ticket ID</th>
            <th>User Phone</th>
            <th>Vehicle Number</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t._id} className="border-t">
              <td className="p-2">{t._id.slice(-6)}</td>
              <td>{t.phone.replace(/.(?=.{4})/g, "*")}</td>
              <td>{t.vehicleNumber || "-"}</td>
              <td>{t.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}