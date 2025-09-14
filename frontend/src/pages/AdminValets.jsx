import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminValets = () => {
  const [valets, setValets] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState([]);

  const token = localStorage.getItem("adminToken");

  const fetchValets = async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/valets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setValets(res.data);
  };

  const fetchLocations = async () => {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/locations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setLocations(res.data);
  };

  const createValet = async () => {
    await axios.post(
      `${import.meta.env.VITE_API_URL}/admin/valets`,
      { email, password, locationId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setEmail("");
    setPassword("");
    fetchValets();
  };

  useEffect(() => {
    fetchValets();
    fetchLocations();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Manage Valets</h2>
      <div className="mb-6 space-y-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="border p-2 rounded w-64"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="border p-2 rounded w-64"
        />
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="border p-2 rounded w-64"
        >
          <option value="">Select Location</option>
          {locations.map((l) => (
            <option key={l._id} value={l._id}>{l.name}</option>
          ))}
        </select>
        <button
          onClick={createValet}
          className="px-4 py-2 bg-yellow-500 text-white rounded"
        >
          Add Valet
        </button>
      </div>
      <ul>
        {valets.map((v) => (
          <li key={v._id} className="mb-2">
            {v.email} — {v.location?.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminValets;