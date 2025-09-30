import axios from "axios";

const HIBOT_API_URL = process.env.HIBOT_API_URL;   // from Hibot
const HIBOT_ACCESS_TOKEN = process.env.HIBOT_ACCESS_TOKEN; // your token
const HIBOT_PHONE_NUMBER_ID = process.env.HIBOT_PHONE_NUMBER_ID; // sender number id

export async function sendHiBotMessage(to, message) {
  try {
    const url = `${HIBOT_API_URL}/${HIBOT_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to,  // 👈 user phone number in international format
      type: "text",
      text: { body: message },
    };

    const headers = {
      Authorization: `Bearer ${HIBOT_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(url, payload, { headers });
    return response.data;
  } catch (err) {
    console.error("❌ Hibot WhatsApp error:", err.response?.data || err.message);
    throw err;
  }
}