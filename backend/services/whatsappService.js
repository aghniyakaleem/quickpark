import Twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, BRAND_NAME } = process.env;
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
    console.warn("Twilio client not configured; skipping WhatsApp send. Message:", message);
    return;
  }
  const to = toWhatsAppAddress(phone);
  try {
    await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to,
      body: message
    });
  } catch (err) {
    console.error("WhatsApp send failed:", err.message || err);
  }
}

export const WhatsAppTemplates = {
  ticketCreated: (ticketId, locationName) =>
    `QuickPark: Your ticket ${ticketId} at ${locationName} is created. Reply or wait for updates.`,
  carParked: (vehicleNumber, parkedAt, eta) =>
    `QuickPark: Your car ${vehicleNumber} is parked at ${parkedAt}. It is approximately ${eta} minutes away.`,
  recallReceived: (ticketId) =>
    `QuickPark: Your recall request for ticket ${ticketId} has been received. Valet will prepare your car.`,
  etaX: (x) => `QuickPark: Your car will be ready in ${x} minutes.`,
  readyAtGate: () => `QuickPark: Your car is at the gate now.`,
  dropped: () => `QuickPark: Car delivered. Thank you for using QuickPark.`,
  paymentConfirmation: (ticketId) => `QuickPark: Payment received for ticket ${ticketId}. Thank you.`
};

export default {
  sendTemplate,
  WhatsAppTemplates
};