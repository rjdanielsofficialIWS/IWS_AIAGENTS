import React from "react";
import { ArrowRight, CheckCircle } from "lucide-react";

export function SubscriptionSection() {
  const accentBlue = "text-[#49B6FF]";
  const accentGold = "text-[#FFD24A]";

  const cards = [
    {
      name: "Web Design",
      price: "$499",
      sub: "one-time",
      features: [
        "Premium, clean layout",
        "Mobile-first conversion structure",
        "Fast launch turnaround",
        "Lead-capture focused",
      ],
      accent: "blue" as const,
      action: {
        label: "View demo",
        href: "https://infinitewealthsolutionsai.com/demo",
        external: true,
      },
    },
    {
      name: "AI Phone Agent",
      price: "$99/mo",
      sub: "subscription",
      features: [
        "Answers missed calls",
        "Captures and qualifies leads",
        "Books appointments automatically",
        "Professional brand voice",
      ],
      accent: "gold" as const,
      action: {
        label: "Book setup call",
        href: "https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding",
        external: true,
      },
      highlight: true,
    },
    {
      name: "Custom Package",
      price: "Contact",
      sub: "tailored",
      features: [
        "Website + AI + automations",
        "Integrations & workflows",
        "Done-for-you implementation",
        "Built for your operations",
      ],
      accent: "blue" as const,
      action: { label: "Get a quote", href: "#lead-capture", external: false },
    },
  ];

  return (
    <section className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white/90">
            Pricing
          </h2>
          <p className="mt-3 text-white/55 max-w-2xl mx-auto">
            Straightforward options — designed for lead capture and reliable follow-up.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {cards.map((c) => {
            const ring = c.highlight
              ? "border-white/18 bg-white/[0.03]"
              : "border-white/10 bg-white/[0.02] hover:bg-white/[0.03] hover:border-white/14";

            const iconColor = c.accent === "gold" ? accentGold : accentBlue;

            return (
              <div
                key={c.name}
                className={[
                  "rounded-[22px] border backdrop-blur-xl p-6 transition",
                  ring,
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-white/90">{c.name}</div>
                    <div className="mt-2">
                      <span className="text-3xl font-semibold text-white/90">{c.price}</span>
                      <span className="text-white/40 ml-2">{c.sub}</span>
                    </div>
                  </div>

                  {c.highlight ? (
                    <div className="text-xs text-white/50">Most popular</div>
                  ) : null}
                </div>

                <ul className="mt-5 space-y-2.5">
                  {c.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                      <CheckCircle className={`h-4 w-4 mt-0.5 ${iconColor}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={c.action.href}
                  target={c.action.external ? "_self" : undefined}
                  rel={c.action.external ? "noopener noreferrer" : undefined}
                  className="mt-6 inline-flex items-center gap-2 text-sm text-white/65 hover:text-white transition"
                >
                  <span className="font-semibold text-white/80">{c.action.label}</span>
                  <ArrowRight className="h-4 w-4 text-white/35" />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}