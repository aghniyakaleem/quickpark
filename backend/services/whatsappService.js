import Twilio from "twilio";

// Read from environment variables injected by Vercel
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM,
  BRAND_NAME = "QuickPark",
} = process.env;

// Initialize client only if creds exist
let client = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  client = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

function toWhatsAppAddress(phone) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `whatsapp:+91${cleaned}`;
  }
  if (cleaned.startsWith("91") && cleaned.length >= 12) {
    return `whatsapp:+${cleaned}`;
  }
  return `whatsapp:+${cleaned}`;
}

async function sendTemplate(phone, message) {
  if (!client) {
    console.warn("⚠️ Twilio client not configured; skipping WhatsApp send. Message:", message);
    return;
  }

  const to = toWhatsAppAddress(phone);
  try {
    await client.messages.create({
      from: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
      to,
      body: message,
    });
  } catch (err) {
    console.error("❌ WhatsApp send failed:", err.message || err);
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