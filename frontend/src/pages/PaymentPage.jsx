import React, { useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function PaymentPage() {
  const { ticketId } = useParams();
  const [amount] = useState(100); // demo amount

  const handlePay = async () => {
    const res = await axios.post("/api/payments/razorpay/order", { ticketId, amount });
    const order = res.data;
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: "INR",
      order_id: order.id,
      handler: async (response) => {
        await axios.post("/api/payments/razorpay/verify", {
          ...response,
          ticketId,
        });
        alert("Payment successful");
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="text-center p-10">
      <h1 className="text-2xl font-bold">Pay for your valet</h1>
      <p className="mt-4">Amount: ₹{amount}</p>
      <button
        onClick={handlePay}
        className="mt-6 px-6 py-3 bg-gold text-white rounded-lg"
      >
        Pay Now
      </button>
    </div>
  );
}