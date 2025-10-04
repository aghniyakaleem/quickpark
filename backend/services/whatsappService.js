const {
  HIBOT_ACCESS_TOKEN,
  HIBOT_PHONE_NUMBER_ID,
  BRAND_NAME = "QuickPark",
} = process.env;

/**
 * Send an approved WhatsApp template message via Hibot / Meta API
 * @param {string} phone - Recipient phone number (with or without +91)
 * @param {string} templateName - Template name in Hibot (e.g. "ticket_created")
 * @param {Array} components - Placeholder values (e.g. ["QuickPark", "QP1234"])
 */
async function sendWhatsAppTemplate(phone, templateName, components = []) {
  if (!HIBOT_ACCESS_TOKEN || !HIBOT_PHONE_NUMBER_ID) {
    console.warn("⚠️ Hibot credentials missing; skipping WhatsApp send.");
    return;
  }

  // sanitize phone number
  let to = phone.replace(/\D/g, "");
  if (to.length === 10) to = `91${to}`;
  if (!to.startsWith("+")) to = `+${to}`;

  try {
    const body = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName, // must exactly match your approved template name
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: components.map((value) => ({ type: "text", text: String(value) })),
          },
        ],
      },
    };

    const res = await fetch(
      `https://graph.facebook.com/v17.0/${HIBOT_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HIBOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error(`❌ WhatsApp template "${templateName}" failed:`, data);
    } else {
      console.log(`✅ WhatsApp template "${templateName}" sent:`, data);
    }
  } catch (err) {
    console.error("❌ WhatsApp send error:", err.message || err);
  }
}

// Helper wrappers for your valet app flow
export const WhatsAppService = {
  ticketCreated: (phone, ticketId, locationName) =>
    sendWhatsAppTemplate(phone, "ticket_created", [locationName, ticketId]),

  carPicked: (phone) =>
    sendWhatsAppTemplate(phone, "car_picked"),

  carParked: (phone, vehicleNumber, eta) =>
    sendWhatsAppTemplate(phone, "car_parked", [vehicleNumber, eta]),

  recallRequest: (phone, vehicleNumber, eta) =>
    sendWhatsAppTemplate(phone, "recall_request", [vehicleNumber, eta]),

  readyForPickup: (phone) =>
    sendWhatsAppTemplate(phone, "ready_for_pickup"),

  delivered: (phone) =>
    sendWhatsAppTemplate(phone, "delivered", [BRAND_NAME]),

  paymentRequest: (phone, amount, ticketId) =>
    sendWhatsAppTemplate(phone, "payment_request", [amount, ticketId]),

  paymentConfirmation: (phone, ticketId) =>
    sendWhatsAppTemplate(phone, "payment_confirmation", [ticketId]),
};

export default WhatsAppService;