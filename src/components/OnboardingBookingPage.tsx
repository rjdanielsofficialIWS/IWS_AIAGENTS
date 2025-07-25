import React, { useEffect } from 'react';
import { Calendar, CheckCircle, Brain, ArrowRight, Clock, Users, Phone } from 'lucide-react';

// Declare Calendly global variable for TypeScript
declare global {
  interface Window {
    Calendly: any;
  }
}

export const OnboardingBookingPage: React.FC = () => {
  useEffect(() => {
    // Check if Calendly script is already loaded
    if (document.querySelector('script[src*="calendly.com"]')) {
      return;
    }

    // Create and append Calendly script
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.type = 'text/javascript';
    script.async = true;
    document.body.appendChild(script);

    // Initialize Calendly when script loads
    script.onload = () => {
      if (window.Calendly) {
        window.Calendly.initInlineWidget({
          url: 'https://calendly.com/infinitewealthsolutions?hide_landing_page_details=1',
          parentElement: document.querySelector('.calendly-inline-widget')
        });
      }
    };

    // Cleanup function to remove script when component unmounts
    return () => {
      const existingScript = document.querySelector('script[src*="calendly.com"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  const openCalendlyPopup = () => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({ url: 'https://calendly.com/infinitewealthsolutions?hide_landing_page_details=1' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-yellow-400/5 to-transparent rounded-full animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center space-x-3 text-center">
            <Brain className="h-10 w-10 text-yellow-400" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
              Infinite Wealth Solutions
            </h1>
          </div>
          <p className="text-center text-blue-300 mt-2 text-base sm:text-lg">AI Agents</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Booking Header */}
        <div className="text-center mb-12">
          <div className="bg-yellow-400/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="h-12 w-12 text-yellow-400" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Book Your Onboarding & Setup Call
          </h2>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Schedule your personalized onboarding session and get your AI agents configured perfectly for your business needs.
          </p>
        </div>

        {/* Onboarding Steps */}
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold mb-8 text-center">
            Your Onboarding Process
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-yellow-400/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-yellow-400" />
              </div>
              <h4 className="text-lg font-semibold mb-2">1. Book Your Setup Call</h4>
              <p className="text-gray-400 text-sm">
                Schedule a 30-minute onboarding call with our AI specialist
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-400/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-blue-400" />
              </div>
              <h4 className="text-lg font-semibold mb-2">2. Custom AI Agent Setup</h4>
              <p className="text-gray-400 text-sm">
                We'll configure your AI agents based on your specific needs
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-400/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-green-400" />
              </div>
              <h4 className="text-lg font-semibold mb-2">3. Go Live</h4>
              <p className="text-gray-400 text-sm">
                Start making calls and generating leads with your AI agents
              </p>
            </div>
          </div>
        </div>

        {/* Booking Section */}
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-4">
              Schedule Your Session
            </h3>
            <p className="text-gray-300 mb-6">
              Book your personalized setup session with our AI specialist and complete your payment to get started.
            </p>
            
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-400 mb-8">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>30 minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>1-on-1 session</span>
              </div>
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>Custom setup</span>
              </div>
            </div>
          </div>

          {/* Calendly Embed - Try both inline and popup options */}
          <div className="space-y-6">
            {/* Inline Widget Container */}
            <div className="bg-white border border-gray-600 rounded-xl overflow-hidden">
              <div 
                className="calendly-inline-widget"
                data-url="https://calendly.com/infinitewealthsolutions?hide_landing_page_details=1"
                style={{ minWidth: '320px', height: '700px', width: '100%' }}
              ></div>
            </div>
            
            {/* Fallback: Popup Button */}
            <div 
              className="text-center p-6 bg-gray-800/50 rounded-xl border border-gray-600"
            >
              <p className="text-gray-300 mb-4">Having trouble with the calendar above?</p>
              <button
                onClick={openCalendlyPopup}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/25"
              >
                Open Calendar in Popup
              </button>
            </div>
          </div>

          {/* What to Expect */}
          <div className="mt-8 pt-8 border-t border-gray-700/50">
            <h4 className="text-lg font-semibold mb-4 text-center">What to Expect in Your Onboarding Call</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">Review your business requirements and goals</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">Configure your AI agent's personality and voice</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">Set up integrations with your existing systems</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">Test your AI agent with live calls</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">Training on the AI Agent Studio dashboard</span>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">Q&A session and ongoing support setup</span>
              </div>
            </div>
          </div>
        </div>

        {/* Access Studio Button */}
        <div className="text-center mt-12">
          <p className="text-gray-400 mb-6">
            Already completed your onboarding? Access your AI Agent Studio:
          </p>
          <a
            href="/"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/25 inline-flex items-center space-x-2"
          >
            <Brain className="h-5 w-5" />
            <span>Access AI Agent Studio</span>
          </a>
        </div>
      </div>
    </div>
  );
};