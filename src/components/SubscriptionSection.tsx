import React from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SubscriptionSection() {
  const plans = [
    {
      name: 'AI Voice Agents',
      price: '$199',
      period: '/mo',
      features: [
        'Answers calls 24/7 — after-hours & while busy',
        'Books jobs & captures lead details',
        'Transfers urgent calls when needed',
        'Call summaries + basic analytics',
        'Human-like natural speech',
        'Setup & onboarding support included',
      ],
      cta: { label: 'Book Consultation', href: 'https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding', external: true },
    },
    {
      name: 'Social Media Manager',
      price: '$99',
      period: '/mo',
      features: [
        'Schedule posts across 19+ platforms',
        'AI-generated captions & content ideas',
        'Visual content calendar',
        'Analytics & performance tracking',
        'Connect multiple social accounts',
        'TikTok, Instagram, LinkedIn & more',
      ],
      popular: true,
      cta: { label: 'Launch Media Machine', href: '/MediaMachine', external: false },
    },
    {
      name: 'Web Development',
      price: 'From $499',
      period: '',
      features: [
        'Modern, high-converting design',
        'Built from scratch — no templates',
        'Mobile-optimized & SEO-friendly',
        'Fast loading & performance tuned',
        'Custom integrations & automations',
        'Launch support included',
      ],
      cta: { label: 'Book Consultation', href: 'https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding', external: true },
    },
  ];

  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Choose Your{' '}
            <span className="bg-gradient-to-r from-[#C8A24A] to-[#E3C36A] bg-clip-text text-transparent">Plan</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Select the perfect plan for your business needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.popular
                  ? 'bg-gradient-to-br from-[#C8A24A]/15 to-gray-900/80 border-2 border-[#C8A24A]/60'
                  : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-[#C8A24A] text-black text-xs font-black px-4 py-1 rounded-full whitespace-nowrap">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold mb-3">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className={`font-black ${plan.price.startsWith('From') ? 'text-3xl' : 'text-4xl'}`} style={{ color: '#C8A24A' }}>
                    {plan.price}
                  </span>
                  {plan.period && <span className="text-gray-400 text-sm">{plan.period}</span>}
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-[#C8A24A] mt-0.5 shrink-0" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.cta.external ? (
                
                  href={plan.cta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3 rounded-xl font-bold text-sm text-center transition-all duration-300 transform hover:scale-[1.02] block ${
                    plan.popular
                      ? 'bg-[#C8A24A] hover:bg-[#E3C36A] text-black'
                      : 'border border-[#C8A24A]/40 text-[#C8A24A] hover:bg-[#C8A24A]/10'
                  }`}
                >
                  {plan.cta.label}
                </a>
              ) : (
                <Link
                  to={plan.cta.href}
                  className={`w-full py-3 rounded-xl font-bold text-sm text-center transition-all duration-300 transform hover:scale-[1.02] block ${
                    plan.popular
                      ? 'bg-[#C8A24A] hover:bg-[#E3C36A] text-black'
                      : 'border border-[#C8A24A]/40 text-[#C8A24A] hover:bg-[#C8A24A]/10'
                  }`}
                >
                  {plan.cta.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}