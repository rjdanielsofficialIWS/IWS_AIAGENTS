import React from 'react';
import { Check } from 'lucide-react';

export function SubscriptionSection() {
  const plans = [
    {
      name: 'Web Design',
      price: '$499',
      period: 'one-time',
      features: [
        'Fast-launch website for service businesses',
        'Clean, modern design (no cookie-cutter templates)',
        'Mobile-optimized + conversion-focused sections',
        'Launch-ready in ~7 days (typical)',
      ],
    },
    {
      name: 'AI Phone Agents',
      price: '$99',
      period: '/month',
      features: [
        'Realistic AI voice agent to answer calls 24/7',
        'Capture leads + book appointments automatically',
        'Handles FAQs, scheduling, and basic intake',
        'Ongoing improvements + support',
      ],
      popular: true,
    },
    {
      name: 'Custom Package',
      price: 'Contact',
      period: 'for quote',
      features: [
        'Done-for-you bundle (website + AI agents + automations)',
        'Custom integrations (CRM, booking, lead routing, etc.)',
        'Advanced workflows & reporting',
        'Best for teams scaling fast',
      ],
    },
  ];

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Simple{' '}
            <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
              Pricing
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Pick what you need now — upgrade to a custom build anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border rounded-xl p-8 ${
                plan.popular
                  ? 'border-yellow-400/50 ring-2 ring-yellow-400/20'
                  : 'border-gray-700/50'
              }`}
            >
              {plan.popular && (
                <div className="bg-yellow-400 text-black text-sm font-bold px-3 py-1 rounded-full inline-block mb-4">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>

              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>{' '}
                <span className="text-gray-400">{plan.period}</span>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.name === 'Custom Package' ? (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('lead-capture');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`block w-full text-center py-3 px-6 rounded-xl font-bold transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-600'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  Contact for Quote
                </button>
              ) : (
                <a
                  href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full text-center py-3 px-6 rounded-xl font-bold transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-600'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  Get Started
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}