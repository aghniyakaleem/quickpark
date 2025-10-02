const {
  HIBOT_ACCESS_TOKEN,
  HIBOT_PHONE_NUMBER_ID,
  BRAND_NAME = "QuickPark",
} = process.env;

async function sendTemplate(phone, message, buttons = null) {
  if (!HIBOT_ACCESS_TOKEN || !HIBOT_PHONE_NUMBER_ID) {
    console.warn("⚠️ Hibot credentials missing; skipping WhatsApp send.");
    return;
  }

  let to = phone.replace(/\D/g, "");
  if (to.length === 10) to = `91${to}`;
  if (!to.startsWith("+")) to = `+${to}`;

  try {
    const body = { messaging_product: "whatsapp", to };

    if (buttons) {
      body.type = "interactive";
      body.interactive = {
        type: "button",
        body: { text: message },
        action: { buttons },
      };
    } else {
      body.type = "text";
      body.text = { body: message };
    }

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
    `Welcome to ${locationName}!\n🎟️ Your ticket ${ticketId} has been created. Our valet will pick up your car shortly.`,

  carPicked: () =>
    `🚗 The valet has picked up your car. We’ll update you once it is parked.`,

  carParked: (vehicleNumber, eta) =>
    `✅ Your car *${vehicleNumber}* has been parked. It is approximately ${eta} minutes away. You can recall it anytime.`,

  recallRequest: (vehicleNumber, eta) =>
    `🔔 Recall request received for car *${vehicleNumber}*.\nYour car will be ready in about ${eta} minutes.`,

  readyForPickup: () =>
    `🚘 Your car is at the gate now. The valet will wait 2 minutes before re-parking to avoid traffic.`,

  delivered: () =>
    `🎉 Car delivered! Thank you for using ${BRAND_NAME}. We hope to serve you again.`,

  paymentRequest: (amount, ticketId) =>
    `💰 Please make the payment of ₹${amount} for ticket ${ticketId}.\nChoose an option below:`,

  paymentConfirmation: (ticketId) =>
    `✅ Payment received for ticket ${ticketId}. Thank you!`,
};

export default {
  sendTemplate,
  WhatsAppTemplates,
};