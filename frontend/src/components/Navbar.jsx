// === FILE: src/components/Navbar.jsx ===
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="w-full bg-gradient-to-r from-yellow-100 via-yellow-50 to-yellow-100 shadow-md px-6 py-4 flex justify-between items-center fixed top-0 z-50">
      <Link to="/" className="text-2xl font-extrabold text-yellow-700">
        QuickPark
      </Link>

      {/* Desktop Links */}
      <ul className="hidden md:flex gap-6 text-gray-700 font-medium">
        <li>
          <Link to="/" className="hover:text-yellow-600">
            Home
          </Link>
        </li>
        <li>
          <Link to="/valet-login" className="hover:text-yellow-600">
            Valet Login
          </Link>
        </li>
        <li>
  <Link
    to="/admin/login"
    className="hover:text-yellow-700"
    onClick={() => setOpen(false)}
  >
    Admin Login
  </Link>
</li>
      </ul>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden text-gray-700"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Mobile Links */}
      {open && (
        <ul className="absolute top-16 right-6 bg-white shadow-lg rounded-lg p-4 flex flex-col gap-3 md:hidden">
          <li>
            <Link
              to="/"
              className="hover:text-yellow-700"
              onClick={() => setOpen(false)}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              to="/valet-login"
              className="hover:text-yellow-700"
              onClick={() => setOpen(false)}
            >
              Valet Login
            </Link>
          </li>
          <li>
            <Link
              to="/admin/login"
              className="hover:text-yellow-700"
              onClick={() => setOpen(false)}
            >
              Admin Login
            </Link>
          </li>
        </ul>
      )}
    </nav>
  );
}