import React from 'react';
import { Check, Zap, Brain, Settings, BarChart3, Phone, MessageSquare, Calendar, Shield } from 'lucide-react';

interface SubscriptionSectionProps {
  onSubscribe: () => void;
}

export const SubscriptionSection: React.FC<SubscriptionSectionProps> = ({ onSubscribe }) => {
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
                $499
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
            <p className="text-sm text-gray-400 mt-4">
              Cancel anytime • 30-day money-back guarantee
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};