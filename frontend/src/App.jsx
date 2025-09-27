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
import Terms from "./pages/TermsAndConditions"; // ✅ new
import Privacy from "./pages/PrivacyPolicy"; //
import FaqPage from "./pages/FaqPage";
import AboutPage from "./pages/AboutPage";
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
        <Route path="/terms" element={<Terms />} /> {/* ✅ Terms page */}
        <Route path="/privacy" element={<Privacy />} /> {/* ✅ Privacy page */}
        <Route path="/faq" element={<FaqPage />} />
<Route path="/about" element={<AboutPage />} />
      </Routes>
    </div>
  );
}

export default App;