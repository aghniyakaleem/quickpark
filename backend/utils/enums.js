// backend/utils/enums.js

// roles (kept for completeness)
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  VALET: "VALET",
};

// ticket statuses — final set per your confirmation
export const STATUSES = {
  AWAITING_VEHICLE: "AWAITING_VEHICLE",
  PARKED: "PARKED",
  RECALLED: "RECALLED",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  DELIVERED: "DELIVERED",
};

// payment statuses (unchanged, keep available values)
export const PAYMENT_STATUSES = {
  UNPAID: "UNPAID",
  PAID: "PAID",
  CASH: "CASH",
  PAID_ONLINE: "PAID_ONLINE",
  PAY_CASH_ON_DELIVERY: "PAY_CASH_ON_DELIVERY",
};