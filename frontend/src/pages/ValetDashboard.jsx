import React, { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import useSocket from "../hooks/useSocket";

/* ---------------------------------------------------------
   NORMALIZE INCOMING SOCKET PAYLOAD (☑️ FINAL FIX)
--------------------------------------------------------- */
function normalizeIncomingPayload(payload) {
  if (!payload) return null;

  const ticket =
    payload.ticket ||
    payload ||
    null;

  const id = String(
    payload.ticketId ||
    payload._id ||
    payload.id ||
    payload.ticket?._id ||
    payload.ticket?.id
  );

  return { id, ticket };
}

export default function ValetDashboard() {
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState({});
  const [highlighted, setHighlighted] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const locationId = user?.locationId || null;

  const rowRefs = useRef({});

  useEffect(() => {
    if (!locationId) return;

    async function fetchData() {
      try {
        const locRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/locations/${locationId}`
        );
        setLocation(locRes.data.location);

        const ticketRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/tickets/location/${locationId}`
        );
        setTickets(ticketRes.data.tickets || []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [locationId]);

  const playBeep = () => {
    try {
      const audio = new Audio("/alert.mp3");
      audio.play().catch(() => {});
    } catch (e) {}
  };

  /* ---------------------------------------------------------
     SOCKET HANDLERS
  --------------------------------------------------------- */
  const socketHandlers = useMemo(
    () => ({
      "ticket:updated": (payload) => {
        const normalized = normalizeIncomingPayload(payload);
        if (!normalized) return;

        const id = normalized.id;
        const updatedTicket = normalized.ticket;

        setTickets((prev) =>
          prev.map((t) =>
            String(t._id) === id
              ? updatedTicket
              : t
          )
        );

        toast.success(
          `Ticket updated ${
            updatedTicket?.ticketShortId
              ? ": " + updatedTicket.ticketShortId
              : ""
          }`
        );
      },

      "ticket:created": (payload) => {
        const normalized = normalizeIncomingPayload(payload);
        if (!normalized?.ticket) return;

        setTickets((prev) => [...prev, normalized.ticket]);
        toast.success(`New ticket created: ${normalized.ticket.ticketShortId}`);
      },

      /* ---------------------------------------------------------
         ✔ FIXED MULTI-HIGHLIGHT RECALL EVENT
      --------------------------------------------------------- */
      "ticket:recalled": (payload) => {
        const normalized = normalizeIncomingPayload(payload);
        if (!normalized) return;

        const id = normalized.id;
        const ticketObj = normalized.ticket;

        if (ticketObj?._id) {
          setTickets((prev) =>
            prev.map((t) =>
              String(t._id) === id ? ticketObj : t
            )
          );
        }

        // ⭐ THIS IS WHERE YOUR SECOND USER WAS FAILING EARLIER
        setHighlighted((prev) =>
          prev.includes(id) ? prev : [...prev, id]
        );

        playBeep();
        toast("User requested their car!", { icon: "⚠️" });

        setTimeout(() => {
          rowRefs.current[id]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 200);
      },
    }),
    []
  );

  useSocket(locationId, socketHandlers);

  /* ---------------------------------------------------------
     LOCAL EDIT HANDLING
  --------------------------------------------------------- */
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

      const updated = res.data.ticket;

      setTickets((prev) =>
        prev.map((t) =>
          String(t._id) === ticketId ? updated : t
        )
      );

      // ✔ Remove highlight only after DELIVERED
      if (updateData.status === "DELIVERED") {
        setHighlighted((prev) =>
          prev.filter((h) => h !== ticketId)
        );
      }

      const copy = { ...pendingUpdates };
      delete copy[ticketId];
      setPendingUpdates(copy);

      toast.success("Saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!location) return <div>No location found.</div>;

  const filteredTickets =
    statusFilter === "ALL"
      ? tickets
      : tickets.filter((t) => t.status === statusFilter);

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (a.status === "DELIVERED" && b.status !== "DELIVERED") return 1;
    if (a.status !== "DELIVERED" && b.status === "DELIVERED") return -1;
    return 0;
  });

  /* ---------------------------------------------------------
     UI RENDER
  --------------------------------------------------------- */

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">
        Valet Dashboard – {location.name}
      </h1>

      <p className="text-xl font-semibold text-gray-600 mb-6">
        Cars processed today:{" "}
        <span className="text-blue-600">{tickets.length}</span>
      </p>

      <div className="flex gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 px-4 py-3 rounded-xl bg-white text-gray-800 shadow font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
        >
          <option value="ALL">All Tickets</option>
          <option value="AWAITING_VEHICLE_NUMBER">Awaiting Vehicle</option>
          <option value="PARKED">Parked</option>
          <option value="RECALLED">Recalled</option>
          <option value="READY_FOR_PICKUP">Ready for Pickup</option>
          <option value="DELIVERED">Delivered</option>
        </select>
      </div>

      {/* SINGLE TABLE */}
      <div className="overflow-x-auto shadow-lg rounded-xl">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100 text-gray-700 border-b">
            <tr>
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">ETA</th>
              <th className="px-4 py-3">Status</th>
              {location.paymentRequired && (
                <th className="px-4 py-3">Payment</th>
              )}
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {sortedTickets.map((t) => {
              const id = String(t._id);

              return (
                <tr
                  key={id}
                  ref={(el) => {
                    if (el) rowRefs.current[id] = el;
                  }}
                  className={`transition-all ${
                    highlighted.includes(id)
                      ? "bg-red-200 animate-pulse"
                      : t.status === "RECALLED"
                      ? "bg-yellow-200"
                      : t.status === "DELIVERED"
                      ? "bg-gray-300 text-gray-500 line-through"
                      : ""
                  }`}
                >
                  <td className="px-4 py-2 font-semibold">
                    {t.ticketShortId}
                  </td>

                  <td className="px-4 py-2">
                    {t.phone?.replace(/.(?=.{4})/g, "*") || "N/A"}
                  </td>

                  <td className="px-4 py-2">
                    <input
                      defaultValue={t.vehicleNumber}
                      onChange={(e) =>
                        handleLocalChange(id, "vehicleNumber", e.target.value)
                      }
                      className="border p-2 rounded w-full"
                    />
                  </td>

                  <td className="px-4 py-2">
                    <select
                      defaultValue={t.etaMinutes || ""}
                      onChange={(e) =>
                        handleLocalChange(id, "etaMinutes", Number(e.target.value))
                      }
                      className="border p-2 rounded w-full"
                    >
                      <option value="">Select ETA</option>
                      <option value={2}>2 mins</option>
                      <option value={5}>5 mins</option>
                      <option value={10}>10 mins</option>
                    </select>
                  </td>

                  <td className="px-4 py-2">
                    <select
                      defaultValue={t.status}
                      onChange={(e) =>
                        handleLocalChange(id, "status", e.target.value)
                      }
                      className="border border-gray-300 p-2 rounded-lg w-full bg-white text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    >
                      <option value="AWAITING_VEHICLE_NUMBER">
                        Awaiting Vehicle
                      </option>
                      <option value="PARKED">Parked</option>
                      <option value="RECALLED">Recalled</option>
                      <option value="READY_FOR_PICKUP">
                        Ready for Pickup
                      </option>
                      <option value="DELIVERED">Delivered</option>
                    </select>
                  </td>

                  {location.paymentRequired && (
                    <td className="px-4 py-2">
                      <select
                        defaultValue={t.paymentStatus}
                        onChange={(e) =>
                          handleLocalChange(id, "paymentStatus", e.target.value)
                        }
                        className="border p-2 rounded w-full"
                      >
                        <option value="UNPAID">Unpaid</option>
                        <option value="PAID">Paid</option>
                        <option value="CASH">Cash</option>
                      </select>
                    </td>
                  )}

                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleSaveTicket(id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}