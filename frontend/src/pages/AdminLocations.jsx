import React, { useState, useEffect } from "react";
import axios from "axios";

const AdminLocations = () => {
  const [locations, setLocations] = useState([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("adminToken");

  const fetchLocations = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/locations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Expect res.data.locations to be an array
      setLocations(Array.isArray(res.data.locations) ? res.data.locations : []);
    } catch (err) {
      console.error("Failed to fetch locations", err);
      setError("Failed to load locations. Please try again.");
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const createLocation = async () => {
    if (!name || !slug) return alert("Please fill in Name and Slug.");
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/locations`,
        { name, slug, paymentRequired },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setName("");
      setSlug("");
      setPaymentRequired(false);
      fetchLocations();
    } catch (err) {
      console.error("Failed to create location", err);
      alert("Failed to create location. Check console for details.");
    }
  };

  useEffect(() => {
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Manage Locations</h2>

      {/* Add Location Form */}
      <div className="mb-6 space-y-2 bg-white p-4 shadow rounded">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="border p-2 rounded w-full"
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="Slug"
          className="border p-2 rounded w-full"
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
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:opacity-90 transition"
        >
          Add Location
        </button>
      </div>

      {/* Locations List */}
      {loading ? (
        <p>Loading locations...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : locations.length === 0 ? (
        <p>No locations found. Add a location above.</p>
      ) : (
        <ul>
          {locations.map((l) => (
            <li key={l._id} className="mb-2">
              {l.name} —{" "}
              <a href={`/l/${l.slug}`} className="text-blue-600 underline">
                /l/{l.slug}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminLocations;