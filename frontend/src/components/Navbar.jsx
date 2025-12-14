import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 z-50 w-full backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-lg">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">

        {/* Logo */}
        <Link
          to="/"
          className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
        >
          QuickPark
        </Link>

        {/* Desktop Links */}
        <ul className="hidden md:flex gap-8 font-semibold text-slate-200">
          {["/", "/valet-login", "/admin/login"].map((path, idx) => {
            const names = ["Home", "Valet Login", "Admin Login"];
            return (
              <li key={path}>
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    isActive
                      ? "text-indigo-400"
                      : "hover:text-indigo-400 transition"
                  }
                >
                  {names[idx]}
                </NavLink>
              </li>
            );
          })}
        </ul>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-slate-200"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Mobile Menu */}
        {open && (
          <ul className="absolute top-20 right-6 bg-white/10 backdrop-blur-xl shadow-2xl rounded-2xl p-6 flex flex-col gap-4 md:hidden text-slate-200">
            <li>
              <Link
                to="/"
                className="font-semibold hover:text-indigo-400 transition"
                onClick={() => setOpen(false)}
              >
                Home
              </Link>
            </li>

            <li>
              <Link
                to="/valet-login"
                className="font-semibold hover:text-indigo-400 transition"
                onClick={() => setOpen(false)}
              >
                Valet Login
              </Link>
            </li>

            <li>
              <Link
                to="/admin/login"
                className="font-semibold hover:text-indigo-400 transition"
                onClick={() => setOpen(false)}
              >
                Admin Login
              </Link>
            </li>
          </ul>
        )}
      </div>
    </nav>
  );
}