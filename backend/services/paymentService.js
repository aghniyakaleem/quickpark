import Razorpay from "razorpay";
import dotenv from "dotenv";
dotenv.config();

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, STRIPE_SECRET_KEY } = process.env;

let razor = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razor = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

import Stripe from "stripe";
let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY);
}

export async function createRazorpayOrder(amountInRupees, currency = "INR", receipt = "") {
  if (!razor) throw new Error("Razorpay not configured");
  const order = await razor.orders.create({
    amount: Math.round(amountInRupees * 100),
    currency,
    receipt,
    payment_capture: 1
  });
  return order;
}

export function verifyRazorpaySignature(body, signature, secret) {
  const crypto = await import("crypto");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

export async function createStripePaymentIntent(amountInRupees, currency = "INR") {
  if (!stripe) throw new Error("Stripe not configured");
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amountInRupees * 100),
    currency,
    payment_method_types: ["card"]
  });
  return intent;
}