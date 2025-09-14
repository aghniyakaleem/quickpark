import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-yellow-100 to-yellow-50 shadow-md">
      <Link to="/" className="text-2xl font-bold text-gold">
        QuickPark
      </Link>
      <button onClick={() => setOpen(!open)} className="md:hidden">
        <Menu />
      </button>
      <ul className={`md:flex gap-6 ${open ? "block" : "hidden"} md:block`}>
        <li>
          <Link to="/" className="hover:text-gold">Home</Link>
        </li>
        <li>
          <Link to="/valet-login" className="hover:text-gold">Valet Login</Link>
        </li>
      </ul>
    </nav>
  );
}