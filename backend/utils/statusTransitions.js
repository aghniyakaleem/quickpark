const transitions = {
    AWAITING_VEHICLE_NUMBER: ["PARKED", "CANCELLED"],
    PARKED: ["RECALLED", "CANCELLED"],
    RECALLED: ["ETA_2", "ETA_5", "ETA_10"],
    ETA_2: ["READY_AT_GATE"],
    ETA_5: ["READY_AT_GATE"],
    ETA_10: ["READY_AT_GATE"],
    READY_AT_GATE: ["DROPPED"],
  };
  
  export const validateTransition = (current, next) => {
    return transitions[current]?.includes(next);
  };