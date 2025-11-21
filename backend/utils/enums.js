// utils/enums.js

// roles (keep for completeness)
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  VALET: "VALET",
};

// ticket statuses (used across controllers)
export const STATUSES = {
  AWAITING_VEHICLE_NUMBER: "AWAITING_VEHICLE_NUMBER",
  PARKED: "PARKED",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  RECALLED: "RECALLED",
  DELIVERED: "DELIVERED",
  DROPPED: "DROPPED",
};

// payment statuses
export const PAYMENT_STATUSES = {
  UNPAID: "UNPAID",
  PAID: "PAID",               // generic paid (could be used for offline or online)
  CASH: "CASH",               // customer chose cash (valet should collect)
  PAID_ONLINE: "PAID_ONLINE", // specifically paid online (gateway)
  PAY_CASH_ON_DELIVERY: "PAY_CASH_ON_DELIVERY", // alias if you want
};