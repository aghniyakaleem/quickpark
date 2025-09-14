import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminLocations = () => {
  const [locations, setLocations] = useState([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [paymentRequired, setPaymentRequired] = useState(false);

  const token = localStorage.getItem("adminToken");

  const fetchLocations = async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/locations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setLocations(res.data);
  };

  const createLocation = async () => {
    await axios.post(
      `${import.meta.env.VITE_API_URL}/admin/locations`,
      { name, slug, paymentRequired },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setName("");
    setSlug("");
    fetchLocations();
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Manage Locations</h2>
      <div className="mb-6 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="border p-2 rounded w-64"
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="Slug"
          className="border p-2 rounded w-64"
        />
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={paymentRequired}
            onChange={(e) => setPaymentRequired(e.target.checked)}
          />
          <span>Payment Required</span>
        </label>
        <button
          onClick={createLocation}
          className="px-4 py-2 bg-yellow-500 text-white rounded"
        >
          Add Location
        </button>
      </div>
      <ul>
        {locations.map((l) => (
          <li key={l._id} className="mb-2">
            {l.name} — <a href={`/l/${l.slug}`} className="text-blue-600 underline">/l/{l.slug}</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminLocations;