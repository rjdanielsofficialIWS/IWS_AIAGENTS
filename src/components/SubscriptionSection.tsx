import React from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Plan {
  name: string;
  price: string;
  period: string;
  features: string[];
  popular: boolean;
  cta: { label: string; href: string; external: boolean };
}

const plans: Plan[] = [
  {
    name: 'AI Voice Agents',
    price: '$199',
    period: '/mo',
    popular: false,
    features: [
      'Answers calls 24/7, after-hours and while busy',
      'Books jobs & captures lead details',
      'Transfers urgent calls when needed',
      'Call summaries + basic analytics',
      'Human-like natural speech',
      'Setup & onboarding support included',
    ],
    cta: {
      label: 'Book Consultation',
      href: 'https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding',
      external: true,
    },
  },
  {
    name: 'Social Media Manager',
    price: '$99',
    period: '/mo',
    popular: true,
    features: [
      'Schedule posts across 19+ platforms',
      'AI-generated captions & content ideas',
      'Visual content calendar',
      'Analytics & performance tracking',
      'Connect multiple social accounts',
      'TikTok, Instagram, LinkedIn & more',
    ],
    cta: {
      label: 'Launch Media Machine',
      href: '/MediaMachine',
      external: false,
    },
  },
  {
    name: 'Web Development',
    price: 'From $499',
    period: '',
    popular: false,
    features: [
      'Modern, high-converting design',
      'Built from scratch, no templates',
      'Mobile-optimized & SEO-friendly',
      'Fast loading & performance tuned',
      'Custom integrations & automations',
      'Launch support included',
    ],
    cta: {
      label: 'Book Consultation',
      href: 'https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding',
      external: true,
    },
  },
];

const GOLD = '#C8A24A';
const GOLD_L = '#E3C36A';
const GOLD_D = '#8F6B1E';

function PlanCTA({ cta, popular }: { cta: Plan['cta']; popular: boolean }) {
  const className = popular
    ? 'w-full py-3 rounded-xl font-bold text-sm text-center transition-all duration-300 transform hover:scale-[1.02] block text-black'
    : 'w-full py-3 rounded-xl font-bold text-sm text-center transition-all duration-300 transform hover:scale-[1.02] block';

  const style = popular
    ? { background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})`, color: '#000' }
    : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' };

  if (cta.external) {
    return (
      <a href={cta.href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
        {cta.label}
      </a>
    );
  }
  return (
    <Link to={cta.href} className={className} style={style}>
      {cta.label}
    </Link>
  );
}

export function SubscriptionSection() {
  return (
    <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-white">
            Choose Your{' '}
            <span className="bg-gradient-to-r from-[#C8A24A] to-[#E3C36A] bg-clip-text text-transparent">
              Plan
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Select the perfect plan for your business needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
          {plans.map((plan) => {
            const cardStyle = plan.popular
              ? {
                  background: `linear-gradient(160deg, ${GOLD}35, rgba(30,26,12,0.97))`,
                  border: `1px solid ${GOLD}80`,
                  boxShadow: `0 12px 48px ${GOLD}35`,
                }
              : {
                  background: 'rgba(255,255,255,0.09)',
                  border: '1px solid rgba(255,255,255,0.16)',
                };

            return (
              <div
                key={plan.name}
                className="relative rounded-2xl p-8 flex flex-col mt-4"
                style={cardStyle}
              >
                {/* Popular gold top line */}
                {plan.popular && (
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
                    style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
                  />
                )}

                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="text-xs font-black px-4 py-1.5 rounded-full whitespace-nowrap" style={{ background: GOLD, color: '#000' }}>
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3
                    className="text-sm font-bold mb-3 uppercase tracking-widest"
                    style={{ color: plan.popular ? GOLD_L : 'rgba(255,255,255,0.4)' }}
                  >
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-black ${plan.price.startsWith('From') ? 'text-3xl' : 'text-4xl'}`}
                      style={{ color: plan.popular ? GOLD_L : 'white' }}
                    >
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-400 text-sm">{plan.period}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 text-sm" style={{ color: plan.popular ? GOLD : 'rgba(255,255,255,0.3)' }}>✓</span>
                      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <PlanCTA cta={plan.cta} popular={plan.popular} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
