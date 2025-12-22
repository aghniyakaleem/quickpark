import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.25),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(236,72,153,0.2),transparent_45%),linear-gradient(180deg,#0b1020,#020617)] text-slate-200">

      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-40 pb-32">
        <motion.h1
          className="text-6xl md:text-7xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Welcome to QuickPark
        </motion.h1>

        <motion.p
          className="mt-8 max-w-3xl text-lg md:text-2xl leading-relaxed text-slate-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          The <span className="text-white font-semibold">luxury valet SaaS</span>{" "}
          built for{" "}
          <span className="italic text-slate-200">
            cafés, restaurants, hotels, and wedding venues
          </span>
          . Deliver a seamless valet experience that delights customers and
          elevates your brand.
        </motion.p>

        {/* CTA */}
        <motion.div
          className="mt-14 flex gap-6 flex-wrap justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <a
            href="tel:+918247767904"
            className="px-8 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-2xl hover:scale-105 transition transform"
          >
            📞 +91 8247767904
          </a>

          <a
            href="mailto:quickpark92@gmail.com"
            className="px-8 py-4 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 text-white font-semibold shadow-lg hover:bg-white/20 transition"
          >
            ✉️ quickpark92@gmail.com
          </a>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-6 pb-32 grid grid-cols-1 md:grid-cols-3 gap-10">
        {[
          {
            title: "Multi-Location",
            text:
              "Onboard multiple branches or venues with unique QR codes under one platform.",
          },
          {
            title: "Seamless Experience",
            text:
              "Guests scan a QR and receive real-time WhatsApp updates on their vehicle.",
          },
          {
            title: "Payments & Insights",
            text:
              "Accept cash or online payments and gain deep insights into valet performance.",
          },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            className="glass p-10 transition hover:scale-[1.05] hover:shadow-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.15 }}
          >
            <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              {item.title}
            </h3>
            <p className="mt-4 text-slate-300 leading-relaxed">{item.text}</p>
          </motion.div>
        ))}
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-8 text-sm text-slate-400">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} QuickPark. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-white transition">Terms</Link>
            <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link to="/faq" className="hover:text-white transition">FAQ</Link>
            <Link to="/about" className="hover:text-white transition">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}