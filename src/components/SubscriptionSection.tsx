import React from 'react';
import { Check, Zap, Brain, Settings, BarChart3, Phone, MessageSquare, Calendar, Shield, Loader } from 'lucide-react';

interface SubscriptionSectionProps {
  onInitiateCheckout: () => Promise<void>;
  isCheckoutLoading: boolean;
}

export const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({ 
  onInitiateCheckout, 
  isCheckoutLoading 
}) => {

  const features = [
    { icon: Brain, text: "Custom AI Agent Development" },
    { icon: Settings, text: "Advanced Configuration Dashboard" },
    { icon: Phone, text: "Unlimited Phone Calls & SMS" },
    { icon: MessageSquare, text: "Multi-Channel Communication" },
    { icon: BarChart3, text: "Real-time Analytics & Reporting" },
    { icon: Calendar, text: "Automated Appointment Booking" },
    { icon: Zap, text: "CRM Integration & Automation" },
    { icon: Shield, text: "Priority Support & Maintenance" }
  ];

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900/50 to-black/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Ready to Scale Your Business?
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Join our premium subscription and get access to advanced AI agent management, 
            unlimited usage, and priority support.
          </p>
        </div>

        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 sm:p-12 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-6 py-2 mb-6">
              <Zap className="h-5 w-5 text-yellow-400" />
              <span className="text-yellow-400 font-medium">Premium Plan</span>
            </div>
            
            <div className="mb-6">
              <span className="text-6xl sm:text-7xl font-bold bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
                $399
              </span>
              <span className="text-2xl text-gray-400 ml-2">/month</span>
            </div>
            
            <p className="text-lg text-gray-300 mb-8">
              Everything you need to automate your sales process and scale your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="bg-yellow-400/10 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-yellow-400" />
                </div>
                <span className="text-gray-300">{feature.text}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={onInitiateCheckout}
              disabled={isCheckoutLoading}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-12 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-yellow-400/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg mb-6 flex items-center justify-center space-x-2"
            >
              {isCheckoutLoading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Start Your Premium Plan</span>
              )}
            </button>
            
            <p className="text-sm text-gray-400 mt-4">
              $199 setup fee + $399/month subscription
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};