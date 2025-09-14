import React from "react";

export default function TicketTable({ tickets }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 border">Ticket ID</th>
          <th className="p-2 border">Phone</th>
          <th className="p-2 border">Vehicle</th>
          <th className="p-2 border">Status</th>
          <th className="p-2 border">ETA</th>
          <th className="p-2 border">Payment</th>
          <th className="p-2 border">Actions</th>
        </tr>
      </thead>
      <tbody>
        {tickets.map((t) => (
          <tr key={t._id}>
            <td className="p-2 border">{t._id.slice(-6)}</td>
            <td className="p-2 border">****{t.phone.slice(-4)}</td>
            <td className="p-2 border">{t.vehicleNumber || "-"}</td>
            <td className="p-2 border">{t.status}</td>
            <td className="p-2 border">{t.eta || "-"}</td>
            <td className="p-2 border">{t.paymentStatus}</td>
            <td className="p-2 border">[Buttons here]</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}