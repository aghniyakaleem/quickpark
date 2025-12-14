import React, { useEffect, useState } from "react";

const steps = [
  "AWAITING_VEHICLE_NUMBER",
  "PARKED",
  "RECALLED",
  "ETA",
  "READY_AT_GATE",
  "DELIVERED",
];

const labels = {
  AWAITING_VEHICLE_NUMBER: "Awaiting Vehicle",
  PARKED: "Parked",
  RECALLED: "Recalled",
  ETA: "ETA",
  READY_AT_GATE: "Ready",
  DELIVERED: "Delivered",
};

export default function TicketTimeline({ status }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const index = steps.indexOf(status);
    if (index >= 0) setCurrentStepIndex(index);
  }, [status]);

  return (
    <div className="w-full max-w-3xl mx-auto my-6 px-4">
      <div className="relative flex items-center justify-between">
        {/* Connecting bars */}
        <div className="absolute top-2.5 left-0 right-0 h-1 flex">
          {steps.slice(0, steps.length - 1).map((_, idx) => (
            <div key={idx + "-bar"} className="flex-1 h-1 mx-3 rounded-full overflow-hidden">
              <div
                className={`h-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out`}
                style={{ width: idx < currentStepIndex ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* Step circles */}
        {steps.map((step, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center z-10 relative">
            {/* Glowing pulse for current step */}
            {idx === currentStepIndex && (
              <span className="absolute w-10 h-10 -top-2.5 rounded-full bg-yellow-400/30 animate-ping blur-xl" />
            )}
            <div
              className={`w-6 h-6 rounded-full mb-2 transition-all duration-500 ease-out ${
                idx <= currentStepIndex
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg"
                  : "bg-white/20"
              } ${idx === currentStepIndex ? "ring-4 ring-yellow-400" : ""}`}
            />
            <span className="text-white text-xs text-center mt-1">{labels[step]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}