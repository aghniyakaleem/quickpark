import React from "react";

const steps = [
  "AWAITING_VEHICLE_NUMBER",
  "PARKED",
  "RECALLED",
  "ETA",
  "READY_AT_GATE",
  "DELIVERED",
];

export default function TicketTimeline({ status }) {
  return (
    <div className="flex justify-between items-center w-full max-w-3xl mx-auto my-6">
      {steps.map((step, idx) => (
        <div
          key={idx}
          className={`flex-1 h-2 mx-1 rounded-full ${
            steps.indexOf(status) >= idx ? "bg-gold" : "bg-gray-300"
          }`}
        />
      ))}
    </div>
  );
}