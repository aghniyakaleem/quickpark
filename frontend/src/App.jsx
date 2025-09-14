import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import PublicLocationPage from "./pages/PublicLocationPage";
import PaymentPage from "./pages/PaymentPage";
import ValetLogin from "./pages/ValetLogin";
import ValetDashboard from "./pages/ValetDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminLocations from "./pages/AdminLocations";
import AdminValets from "./pages/AdminValets";

function App() {
  return (
    <div className="font-sans">
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/l/:slug" element={<PublicLocationPage />} />
        <Route path="/payment/:ticketId" element={<PaymentPage />} />
        <Route path="/valet-login" element={<ValetLogin />} />
        <Route path="/valet/dashboard" element={<ValetDashboard />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/locations" element={<AdminLocations />} />
        <Route path="/admin/valets" element={<AdminValets />} />
      </Routes>
    </div>
  );
}

export default App;