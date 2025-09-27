import React from "react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="bg-[#F6EEE0] min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="text-center py-32 flex flex-col items-center justify-center flex-grow px-6">
        <motion.h1
          className="text-6xl font-extrabold text-yellow-700 drop-shadow-sm"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Welcome to QuickPark
        </motion.h1>

        <motion.p
          className="mt-6 text-xl text-[#362706] max-w-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          The luxury <span className="font-semibold">valet SaaS platform</span>{" "}
          built for{" "}
          <span className="italic">
            cafés, restaurants, hotels, and wedding venues
          </span>
          . Deliver a seamless valet experience that delights your customers and
          enhances your brand.
        </motion.p>

        <motion.div
          className="mt-10 flex gap-6 flex-wrap justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <a
            href="tel:+919490978692"
            className="px-6 py-3 bg-yellow-600 text-white rounded-xl shadow hover:opacity-90 transition"
          >
            📞 +91 9490978692
          </a>
          <a
            href="mailto:quickpark92@gmail.com"
            className="px-6 py-3 bg-yellow-700 text-white rounded-xl shadow hover:opacity-90 transition"
          >
            ✉️ quickpark92@gmail.com
          </a>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div
          className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-2xl font-bold text-yellow-700">Multi-Location</h3>
          <p className="mt-4 text-[#362706]">
            Onboard multiple branches or venues under one platform with unique QR
            codes for each location.
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-2xl font-bold text-yellow-700">Seamless Experience</h3>
          <p className="mt-4 text-[#362706]">
            Guests scan a QR, enter details, and receive real-time updates on
            their car via WhatsApp.
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className="text-2xl font-bold text-yellow-700">Payments & Insights</h3>
          <p className="mt-4 text-[#362706]">
            Offer cash or online payments, track valet performance, and delight
            customers with efficiency.
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-[#F6EEE0] text-[#362706] text-sm py-6 border-t">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 px-6">
          <p>© {new Date().getFullYear()} QuickPark. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:underline">
              Terms & Conditions
            </Link>
            <Link to="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link to="/faq" className="hover:underline">
              FAQ
            </Link>
            <Link to="/about" className="hover:underline">
              About Us
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}