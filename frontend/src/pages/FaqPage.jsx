import React from "react";

export default function FaqPage() {
  const faqs = [
    {
      question: "What is QuickPark?",
      answer:
        "QuickPark is a valet management SaaS that helps businesses streamline parking operations, track tickets, and provide real-time updates to customers."
    },
    {
      question: "How do I get started?",
      answer:
        "You can sign up as an admin, add your valet staff, and create locations. Valets can log in with their credentials and start managing tickets instantly."
    },
    {
      question: "Do customers need to download an app?",
      answer:
        "No, customers can simply scan a QR code to get their ticket and track status in real-time, without installing anything."
    },
    {
      question: "What payment methods are supported?",
      answer:
        "We integrate with Razorpay to support UPI, credit/debit cards, and net banking."
    },
    {
      question: "Is support available?",
      answer:
        "Yes, our team provides 24/7 support for businesses using QuickPark."
    }
  ];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Frequently Asked Questions</h1>
      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="border rounded-lg p-4 bg-white shadow-sm">
            <h2 className="text-lg font-semibold mb-2">{faq.question}</h2>
            <p className="text-gray-700">{faq.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}