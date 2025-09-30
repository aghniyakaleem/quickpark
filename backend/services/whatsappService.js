// services/whatsappService.js
const {
  HIBOT_ACCESS_TOKEN,
  HIBOT_PHONE_NUMBER_ID,
  BRAND_NAME = "QuickPark",
} = process.env;

async function sendTemplate(phone, message) {
  if (!HIBOT_ACCESS_TOKEN || !HIBOT_PHONE_NUMBER_ID) {
    console.warn("⚠️ Hibot credentials missing; skipping WhatsApp send.");
    return;
  }

  // Normalize phone number (assume India default +91)
  let to = phone.replace(/\D/g, "");
  if (to.length === 10) to = `91${to}`;
  if (!to.startsWith("+")) to = `+${to}`;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v17.0/${HIBOT_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HIBOT_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error("❌ Hibot send failed:", data);
    } else {
      console.log("✅ WhatsApp message sent:", data);
    }
  } catch (err) {
    console.error("❌ WhatsApp send error:", err.message || err);
  }
}

export const WhatsAppTemplates = {
  ticketCreated: (ticketId, locationName) =>
    `${BRAND_NAME}: Your ticket ${ticketId} at ${locationName} is created. Reply or wait for updates.`,
  carParked: (vehicleNumber, parkedAt, eta) =>
    `${BRAND_NAME}: Your car ${vehicleNumber} is parked at ${parkedAt}. It is approximately ${eta} minutes away.`,
  recallReceived: (ticketId) =>
    `${BRAND_NAME}: Your recall request for ticket ${ticketId} has been received. Valet will prepare your car.`,
  etaX: (x) => `${BRAND_NAME}: Your car will be ready in ${x} minutes.`,
  readyAtGate: () => `${BRAND_NAME}: Your car is at the gate now.`,
  dropped: () => `${BRAND_NAME}: Car delivered. Thank you for using ${BRAND_NAME}.`,
  paymentConfirmation: (ticketId) =>
    `${BRAND_NAME}: Payment received for ticket ${ticketId}. Thank you.`,
};

export default {
  sendTemplate,
  WhatsAppTemplates,
};