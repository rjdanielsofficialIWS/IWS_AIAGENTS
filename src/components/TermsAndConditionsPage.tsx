import React from "react";

function upsertMetaTag(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertMetaProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function TermsAndConditionsPage() {
  React.useEffect(() => {
    document.title = "Terms & Conditions | Infinite Wealth Solutions AI";
    const desc =
      "Read the Terms & Conditions for Infinite Wealth Solutions AI, including acceptable use, payments, AI limitations, and legal terms.";
    upsertMetaTag("description", desc);
    upsertMetaProperty("og:title", "Terms & Conditions | Infinite Wealth Solutions AI");
    upsertMetaProperty("og:description", desc);
    upsertMetaTag("twitter:card", "summary");
    upsertMetaTag("twitter:title", "Terms & Conditions | Infinite Wealth Solutions AI");
    upsertMetaTag("twitter:description", desc);
    upsertCanonical(`${window.location.origin}/terms-and-conditions`);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-gray-400">Effective Date: January 2026</p>

        <div className="mt-8 space-y-6 text-gray-200 leading-relaxed">
          <p>
            These Terms &amp; Conditions ("Terms") govern your access to and use of the Infinite Wealth Solutions AI
            website, services, software, and AI-powered tools (collectively, the "Services"). By using the Services,
            you agree to these Terms.
          </p>

          <p>If you do not agree to these Terms, do not use the Services.</p>

          <h2 className="text-xl font-semibold text-white">1. Who We Are</h2>
          <p>
            Infinite Wealth Solutions AI provides business automation and AI-powered solutions, which may include AI voice
            agents, chat tools, workflow automation, lead capture systems, and related digital services.
          </p>

          <h2 className="text-xl font-semibold text-white">2. Eligibility</h2>
          <p>
            You must be at least 18 years old (or the age of majority in your jurisdiction) and legally able to form a
            binding contract to use the Services.
          </p>

          <h2 className="text-xl font-semibold text-white">3. Accounts &amp; Access</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-200">
            <li>You are responsible for safeguarding your login credentials and maintaining account security.</li>
            <li>You agree to provide accurate information and keep it up to date.</li>
            <li>You are responsible for activity that occurs under your account.</li>
          </ul>

          <h2 className="text-xl font-semibold text-white">4. Acceptable Use</h2>
          <p>You agree not to use the Services to:</p>
          <ul className="list-disc pl-6 space-y-1 text-gray-200">
            <li>Violate any applicable law, regulation, or third-party rights.</li>
            <li>Send spam, unsolicited messages, or automated outreach that violates platform policies.</li>
            <li>Impersonate others, misrepresent your identity, or deceive customers.</li>
            <li>Transmit malware or attempt to interfere with the security or integrity of the Services.</li>
            <li>Use the Services for harassment, abuse, or harmful conduct.</li>
          </ul>
          <p>We may suspend or terminate access if we reasonably believe you are misusing the Services.</p>

          <h2 className="text-xl font-semibold text-white">5. AI Tools &amp; Limitations</h2>
          <p>
            Our AI tools are automated systems and may produce inaccurate, incomplete, or unexpected outputs. You are
            responsible for reviewing and approving outputs before using them in your business.
          </p>
          <p>
            The Services are not legal, financial, medical, or professional advice. If you need advice, consult a
            qualified professional.
          </p>

          <h2 className="text-xl font-semibold text-white">6. Phone, Messaging &amp; Consent</h2>
          <p>
            If you use our Services for calls, SMS, or messaging, you are responsible for ensuring you have appropriate
            consent from your customers and that your communications comply with applicable laws and platform/provider
            policies.
          </p>

          <h2 className="text-xl font-semibold text-white">7. Payments, Subscriptions &amp; Billing</h2>
          <p>
            Some Services require payment or subscription fees. Pricing, billing cadence, and plan details will be shown
            at checkout or in a written agreement.
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-200">
            <li>Fees are generally non-refundable unless otherwise stated in writing or required by law.</li>
            <li>You may cancel recurring subscriptions as described in your plan terms or agreement.</li>
            <li>We may update pricing over time with reasonable notice where applicable.</li>
          </ul>

          <h2 className="text-xl font-semibold text-white">8. Intellectual Property</h2>
          <p>
            The Services (including code, designs, branding, and content) are owned by or licensed to Infinite Wealth
            Solutions AI. You may not copy, modify, distribute, reverse engineer, or resell the Services unless you have
            our written permission.
          </p>

          <h2 className="text-xl font-semibold text-white">9. Third-Party Services</h2>
          <p>
            Our Services may integrate with third-party tools (for example: analytics, scheduling, SMS/telephony
            providers, or payment processors). Third-party services are governed by their own terms and policies, and we
            are not responsible for their performance or availability.
          </p>

          <h2 className="text-xl font-semibold text-white">10. Disclaimers</h2>
          <p>
            The Services are provided on an "as is" and "as available" basis. We do not warrant that the Services will be
            uninterrupted, error-free, or that they will achieve specific results for your business.
          </p>

          <h2 className="text-xl font-semibold text-white">11. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Infinite Wealth Solutions AI will not be liable for indirect,
            incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or goodwill,
            arising out of or related to your use of the Services.
          </p>
          <p>
            Our total liability for any claim relating to the Services will not exceed the amount you paid to us for the
            Services in the twelve (12) months before the event giving rise to the claim.
          </p>

          <h2 className="text-xl font-semibold text-white">12. Termination</h2>
          <p>
            You may stop using the Services at any time. We may suspend or terminate your access if you violate these
            Terms or if required to comply with law.
          </p>

          <h2 className="text-xl font-semibold text-white">13. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Updates will be posted on this page with a revised effective
            date. Continued use of the Services after changes are posted means you accept the updated Terms.
          </p>

          <h2 className="text-xl font-semibold text-white">14. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction where Infinite Wealth Solutions AI operates,
            without regard to conflict of law principles.
          </p>

          <h2 className="text-xl font-semibold text-white">15. Contact</h2>
          <p>If you have any questions about these Terms, contact us at:</p>
          <p>
            <span className="font-semibold text-white">Infinite Wealth Solutions AI</span>
            <br />
            Email: support@infinitewealthsolutionsai.com
            <br />
            Website: https://infinitewealthsolutionsai.com/
          </p>

          <div className="pt-4">
            <button
              onClick={() => (window.location.href = "/")}
              className="inline-flex items-center rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}