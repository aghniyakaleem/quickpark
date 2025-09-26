import React from "react";

const TermsAndConditions = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto text-gray-800">
      <h1 className="text-3xl font-bold mb-4">Terms and Conditions</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>

      <h2 className="text-xl font-semibold mt-6">1. Introduction</h2>
      <p>
        Welcome to QuickPark (the “Service”), a valet management SaaS platform.
        By accessing or using our platform, you agree to comply with and be
        bound by these Terms and Conditions.
      </p>

      <h2 className="text-xl font-semibold mt-6">2. Services Provided</h2>
      <p>
        QuickPark enables valet operators to manage parking tickets, track cars,
        and send customer updates (including via WhatsApp API). We also provide
        integrated payment services through Razorpay.
      </p>

      <h2 className="text-xl font-semibold mt-6">3. User Responsibilities</h2>
      <ul className="list-disc ml-6">
        <li>You must provide accurate information while registering.</li>
        <li>
          You are responsible for keeping your account secure and confidential.
        </li>
        <li>
          You agree not to misuse the platform, including sending spam or
          fraudulent payment requests.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">4. Payments</h2>
      <p>
        Payments are processed securely via Razorpay. By making a payment, you
        agree to Razorpay’s terms and conditions in addition to ours.
      </p>

      <h2 className="text-xl font-semibold mt-6">5. WhatsApp API</h2>
      <p>
        We use WhatsApp Business API to send booking confirmations and status
        updates. By using our service, you consent to receiving these messages.
      </p>

      <h2 className="text-xl font-semibold mt-6">6. Limitation of Liability</h2>
      <p>
        QuickPark is not liable for vehicle damage, theft, or loss. We provide
        only the digital management platform and are not responsible for valet
        operations on the ground.
      </p>

      <h2 className="text-xl font-semibold mt-6">7. Governing Law</h2>
      <p>
        These terms are governed by the laws of India. Disputes will be subject
        to the jurisdiction of courts in [Your City, India].
      </p>
    </div>
  );
};

export default TermsAndConditions;