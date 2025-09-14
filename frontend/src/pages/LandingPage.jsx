import React from "react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="text-center py-20 bg-gradient-to-b from-white via-gray-50 to-white min-h-screen">
      {/* Hero Section */}
      <motion.h1
        className="text-6xl font-extrabold text-yellow-700 drop-shadow-sm"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        Welcome to QuickPark
      </motion.h1>
      <motion.p
        className="mt-6 text-xl text-gray-700 max-w-2xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        The luxury <span className="font-semibold">valet SaaS platform</span> 
        built for <span className="italic">cafés, restaurants, hotels, and wedding venues</span>.  
        Deliver a seamless valet experience that delights your customers and enhances your brand.
      </motion.p>

      {/* Feature Highlights */}
      <motion.div
        className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto px-6"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.3 }
          }
        }}
      >
        <motion.div
          className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition"
          variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } }}
        >
          <h3 className="text-2xl font-bold text-yellow-700">Multi-Location</h3>
          <p className="mt-4 text-gray-600">
            Onboard multiple branches or venues under one platform with unique QR codes for each location.
          </p>
        </motion.div>
        <motion.div
          className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition"
          variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } }}
        >
          <h3 className="text-2xl font-bold text-yellow-700">Seamless Experience</h3>
          <p className="mt-4 text-gray-600">
            Guests scan a QR, enter details, and receive real-time updates on their car via WhatsApp.
          </p>
        </motion.div>
        <motion.div
          className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition"
          variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } }}
        >
          <h3 className="text-2xl font-bold text-yellow-700">Payments & Insights</h3>
          <p className="mt-4 text-gray-600">
            Offer cash or online payments, track valet performance, and delight customers with efficiency.
          </p>
        </motion.div>
      </motion.div>

      {/* Call to Action */}
      <motion.div
        className="mt-20"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <h2 className="text-3xl font-bold text-gray-800">Get in Touch</h2>
        <p className="mt-2 text-gray-600">We would love to partner with your business.</p>
        <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-6">
          <a
            href="tel:+911234567890"
            className="px-6 py-3 bg-yellow-600 text-white rounded-xl shadow hover:opacity-90"
          >
            📞 +91 9490978692
          </a>
          <a
            href="mailto:contact@quickpark.co.in"
            className="px-6 py-3 bg-yellow-700 text-white rounded-xl shadow hover:opacity-90"
          >
            ✉️ contact@quickpark.co.in
          </a>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="mt-20 text-gray-500 text-sm">
        © {new Date().getFullYear()} QuickPark. All rights reserved.
      </footer>
    </div>
  );
}