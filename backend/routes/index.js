import auth from "./auth.js";
import admin from "./admin.js";
import tickets from "./tickets.js";
import valet from "./valet.js";
import payments from "./payments.js";
import msg91Webhook from "./msg91Webhook.js";  // ⬅️ ADD THIS

export default {
  auth,
  admin,
  tickets,
  valet,
  payments,
  msg91Webhook   // ⬅️ THIS IS THE ACTUAL MSG91 INBOUND ROUTE
};