// optional aggregator if needed by future tooling - exports router list
import auth from "./auth.js";
import admin from "./admin.js";
import tickets from "./tickets.js";
import valet from "./valet.js";
import payments from "./payments.js";
import webhooks from "./webhooks.js";

export default {
  auth, admin, tickets, valet, payments, webhooks
};