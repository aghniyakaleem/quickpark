import React, { useState } from "react";
import { api } from "../utils/api";

export default function TicketForm({ slug, onCreated }) {
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post(`/tickets/public/${slug}`, { phone });
      onCreated(data);
    } catch (err) {
      alert("Failed to create ticket");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="tel"
        placeholder="Enter Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="flex-1 p-3 border rounded-lg"
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        Submit
      </button>
    </form>
  );
}