import React from "react";

export default function AboutPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">About Us</h1>
      <p className="text-gray-700 mb-4">
        Welcome to <span className="font-semibold">QuickPark</span>, a modern SaaS platform built
        to simplify valet and parking management for businesses of all sizes.
      </p>
      <p className="text-gray-700 mb-4">
        Our mission is to transform the parking experience for both customers
        and businesses. Customers get a seamless ticketing experience through QR
        codes and instant updates, while businesses gain a powerful dashboard
        to manage tickets, payments, and valet staff in real time.
      </p>
      <p className="text-gray-700 mb-4">
        With integrations like WhatsApp API for instant communication and Razorpay
        for hassle-free payments, QuickPark helps your operations run smoothly,
        increases customer satisfaction, and reduces manual work.
      </p>
      <p className="text-gray-700">
        We are passionate about using technology to make everyday experiences
        simpler and smarter. QuickPark is built to be scalable, secure, and
        reliable — so you can focus on your business while we take care of the
        parking.
      </p>
    </div>
  );
}