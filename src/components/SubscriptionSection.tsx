import React from 'react';
import { Check, Sparkles } from 'lucide-react';

export function SubscriptionSection() {
  const plans = [
    {
      name: 'Web Design',
      price: '$499',
      period: 'one-time',
      tagline: 'Launch fast. Look premium.',
      features: [
        'Modern, conversion-focused website',
        'Mobile-first layout + crisp UI',
        'Speed-optimized build',
        'Launch-ready in ~7 days (typical)',
      ],
      cta: 'Get Started',
      ctaType: 'calendly' as const,
      accent: 'blue' as const,
    },
    {
      name: 'AI Phone Agents',
      price: '$99',
      period: '/month',
      tagline: 'Never miss a call again.',
      features: [
        'Answers calls 24/7 like a real person',
        'Captures leads + books appointments',
        'Handles FAQs + basic intake',
        'Ongoing tuning + support',
      ],
      popular: true,
      cta: 'Get Started',
      ctaType: 'calendly' as const,
      accent: 'gold' as const,
    },
    {
      name: 'Custom Package',
      price: 'Contact',
      period: 'for quote',
      tagline: 'Built for scaling teams.',
      features: [
        'Website + AI agents + automations',
        'Custom integrations (CRM, booking, lead routing)',
        'Advanced workflows + reporting',
        'Tailored build + implementation',
      ],
      cta: 'Contact for Quote',
      ctaType: 'scroll' as const,
      accent: 'blue' as const,
    },
  ];

  const scrollToLead = () => {
    const el = document.getElementById('lead-capture');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="pricing" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur">
            <Sparkles className="h-4 w-4 text-[#49B6FF]" />
            <span className="text-sm text-gray-200">Pricing</span>
            <span className="text-sm text-gray-400">Simple. Clean. No confusion.</span>
          </div>

          <h2 className="mt-6 text-4xl sm:text-5xl font-extrabold tracking-tight">
            Choose your{' '}
            <span className="bg-gradient-to-r from-gray-100 via-gray-300 to-gray-100 bg-clip-text text-transparent">
              tier
            </span>
          </h2>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
            Start with a single service — or go custom if you want the full “done-for-you” system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {plans.map((plan) => {
            const isBlue = plan.accent === 'blue';

            return (
              <div key={plan.name} className="relative">
                {/* Chrome glow (neutral) */}
                <div className="absolute -inset-1 rounded-2xl blur-2xl opacity-80 bg-gradient-to-r from-white/10 via-white/5 to-white/10" />

                <div
                  className={`relative h-full rounded-2xl border backdrop-blur-xl p-7 overflow-hidden ${
                    plan.popular ? 'border-white/15 bg-white/7' : 'border-white/10 bg-white/5'
                  }`}
                >
                  {/* Top chrome line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                  {/* Corner ambient (separate accents, no blending) */}
                  <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-white/6 blur-2xl" />
                  <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-white/5 blur-2xl" />

                  {plan.popular && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFD24A] text-black text-xs font-extrabold mb-5">
                      Most Popular
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold">{plan.name}</h3>
                      <p className="mt-1 text-sm text-gray-400">{plan.tagline}</p>
                    </div>

                    {/* Accent ring icon */}
                    <div
                      className={`h-10 w-10 rounded-xl border border-white/10 bg-[#0B0D10]/60 flex items-center justify-center ${
                        isBlue ? 'ring-1 ring-[#49B6FF]/40' : 'ring-1 ring-[#FFD24A]/40'
                      }`}
                    >
                      <Sparkles className={`h-5 w-5 ${isBlue ? 'text-[#49B6FF]' : 'text-[#FFD24A]'}`} />
                    </div>
                  </div>

                  <div className="mt-6">
                    <span className="text-4xl font-extrabold">{plan.price}</span>{' '}
                    <span className="text-gray-400">{plan.period}</span>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-200">
                        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                          <Check className="h-4 w-4 text-[#FFD24A]" />
                        </span>
                        <span className="text-sm leading-relaxed text-gray-300">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    {plan.ctaType === 'calendly' ? (
                      <a
                        href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex w-full items-center justify-center rounded-xl px-5 py-3 font-bold transition-all ${
                          plan.popular
                            ? 'bg-[#FFD24A] text-black hover:bg-[#ffdc6a]'
                            : 'bg-white/10 border border-white/10 text-white hover:bg-white/15'
                        }`}
                      >
                        {plan.cta}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={scrollToLead}
                        className="inline-flex w-full items-center justify-center rounded-xl px-5 py-3 font-bold bg-white/10 border border-white/10 text-white hover:bg-white/15 transition-all"
                      >
                        {plan.cta}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}