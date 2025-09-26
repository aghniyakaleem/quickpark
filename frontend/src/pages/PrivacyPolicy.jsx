import React from "react";

const PrivacyPolicy = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto text-gray-800">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>

      <h2 className="text-xl font-semibold mt-6">1. Information We Collect</h2>
      <ul className="list-disc ml-6">
        <li>Name, email, and phone number of users.</li>
        <li>
          Vehicle details and parking tickets created through our platform.
        </li>
        <li>
          Payment information when processed through Razorpay (we do not store
          card/bank details).
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">2. How We Use Information</h2>
      <ul className="list-disc ml-6">
        <li>To manage valet tickets and provide live updates.</li>
        <li>To send WhatsApp/SMS notifications regarding valet status.</li>
        <li>To process payments securely via Razorpay.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6">3. Sharing of Information</h2>
      <p>
        We do not sell personal data. We may share information only with trusted
        third parties (e.g., WhatsApp API provider, Razorpay) as required to
        deliver services.
      </p>

      <h2 className="text-xl font-semibold mt-6">4. Data Security</h2>
      <p>
        We implement industry-standard measures to protect user data. However,
        we cannot guarantee absolute security of data transmitted online.
      </p>

      <h2 className="text-xl font-semibold mt-6">5. User Rights</h2>
      <p>
        Users can request deletion of their data by contacting us at{" "}
        <a href="mailto:support@quickpark.com" className="text-blue-600">
          support@quickpark.com
        </a>
        .
      </p>

      <h2 className="text-xl font-semibold mt-6">6. Updates</h2>
      <p>
        We may update this Privacy Policy from time to time. Continued use of
        the service implies acceptance of changes.
      </p>
    </div>
  );
};

export default PrivacyPolicy;