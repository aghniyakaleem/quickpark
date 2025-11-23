// backend/services/MSG91Service.js
import axios from "axios";

const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY;
const MSG91_NAMESPACE = process.env.MSG91_NAMESPACE || "ab0dc867_28bf_43de_98a2_f63042b8363d";
const MSG91_INTEGRATED_NUMBER = process.env.MSG91_INTEGRATED_NUMBER || process.env.MSG91_SENDER_ID || "918247767904";
const MSG91_API = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

/**
 * Generic: send a template via MSG91
 */
export async function sendWhatsAppTemplate(phone, templateName, params = []) {
  if (!MSG91_AUTHKEY) {
    console.warn("⚠️ MSG91_AUTHKEY missing; skipping WhatsApp send.");
    return null;
  }

  let to = String(phone || "").replace(/\D/g, "");
  if (to.length === 10) to = `91${to}`;

  const components = {};
  params.forEach((val, idx) => {
    components[`body_${idx + 1}`] = { type: "text", value: String(val) };
  });

  const payload = {
    integrated_number: MSG91_INTEGRATED_NUMBER,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: templateName,
        language: { code: "en", policy: "deterministic" },
        namespace: MSG91_NAMESPACE,
        to_and_components: [
          {
            to: to,        // ✅ FIXED
            components,
          },
        ],
      },
    },
  };

  try {
    const resp = await axios.post(MSG91_API, payload, {
      headers: { "Content-Type": "application/json", authkey: MSG91_AUTHKEY },
      timeout: 15000,
    });
    console.log("✅ MSG91 template send:", templateName, "->", to, resp.data);
    return resp.data;
  } catch (err) {
    console.error("❌ MSG91 send error:", err.response?.data || err.message || err);
    throw err;
  }
}

const MSG91Service = {
  sendWhatsAppTemplate,

  ticketCreated: (phone, ticketShortId, locationName) =>
    sendWhatsAppTemplate(phone, "valet_ticket_created_", [locationName, ticketShortId]),

  carPicked: (phone, vehicleNumber = "") =>
    sendWhatsAppTemplate(phone, "car_picked", [vehicleNumber]),

  carParked: (phone, vehicleNumber = "", eta = "") =>
    sendWhatsAppTemplate(phone, "car_parked", [vehicleNumber, String(eta)]),

  recallRequest: (phone, vehicleNumber = "", eta = "") =>
    sendWhatsAppTemplate(phone, "recall_request_update", [vehicleNumber, String(eta)]),

  readyForPickup: (phone, vehicleNumber = "") =>
    sendWhatsAppTemplate(phone, "ready_for_pickup", vehicleNumber ? [vehicleNumber] : []),

  delivered: (phone, vehicleNumber = "") =>
    sendWhatsAppTemplate(phone, "vehicle_delivery_confirmation", [vehicleNumber]),

  paymentRequest: (phone, amount = "", ticketId = "") =>
    sendWhatsAppTemplate(phone, "parking_charges_payment", [String(amount), String(ticketId)]),

  paymentConfirmation: (phone, ticketId = "") =>
    sendWhatsAppTemplate(phone, "payment_confirmation", [String(ticketId)]),
};

export default MSG91Service;
export { MSG91Service };