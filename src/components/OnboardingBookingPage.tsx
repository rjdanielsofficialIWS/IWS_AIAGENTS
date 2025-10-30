import React from 'react';
import { Calendar, ArrowLeft } from 'lucide-react';

export function OnboardingBookingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <a
          href="/"
          className="inline-flex items-center space-x-2 text-gray-400 hover:text-gray-300 transition-colors mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </a>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Schedule Your <span className="bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">Onboarding Call</span>
          </h1>
          <p className="text-xl text-gray-300">
            Let's discuss how we can help transform your business
          </p>
        </div>

        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
          <div className="aspect-video w-full">
            <iframe
              src="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
              width="100%"
              height="100%"
              frameBorder="0"
              className="rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
