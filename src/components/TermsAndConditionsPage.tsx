import React from "react";

const TermsAndConditionsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800 px-6 py-16">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-gray-900">
          Terms and Conditions
        </h1>

        <p className="text-sm text-gray-500">
          Last updated: January 2026
        </p>

        <section className="space-y-4">
          <p>
            These Terms and Conditions ("Terms") govern your use of the Infinite
            Wealth Solutions AI website, services, software, and AI-powered tools
            (collectively, the "Services"). By accessing or using our Services,
            you agree to be bound by these Terms.
          </p>

          <p>
            If you do not agree with these Terms, please do not use our Services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">1. About Our Services</h2>
          <p>
            Infinite Wealth Solutions AI provides AI-powered automation services,
            including but not limited to AI phone agents, chat systems, workflow
            automation, and related business tools.
          </p>
          <p>
            Our Services are intended to assist businesses with customer
            communication, lead handling, and operational efficiency. We do not
            guarantee specific business outcomes, revenue increases, or
            performance results.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">2. Eligibility</h2>
          <p>
            You must be at least 18 years old and capable of forming a legally
            binding agreement to use our Services. By using our Services, you
            represent and warrant that you meet these requirements.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">3. Account Responsibility</h2>
          <p>
            If you create an account or use paid Services, you are responsible
            for maintaining the confidentiality of your account credentials and
            for all activity that occurs under your account.
          </p>
          <p>
            You agree to provide accurate, current, and complete information and
            to update it as necessary.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">4. Acceptable Use</h2>
          <p>You agree not to use our Services:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>For unlawful, fraudulent, or deceptive purposes</li>
            <li>
              To harass, abuse, impersonate, or harm others
            </li>
            <li>
              To transmit malicious code, spam, or unauthorized communications
            </li>
            <li>
              In violation of any applicable laws, regulations, or third-party
              rights
            </li>
          </ul>
          <p>
            We reserve the right to suspend or terminate access if we believe
            these rules have been violated.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">5. AI Limitations</h2>
          <p>
            Our AI-powered Services are automated systems and may occasionally
            produce errors, incomplete responses, or unexpected outputs.
          </p>
          <p>
            You acknowledge that AI responses should not be relied upon as
            professional, legal, financial, or medical advice. You remain solely
            responsible for reviewing and approving any outputs used in your
            business.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">6. Payments & Subscriptions</h2>
          <p>
            Certain Services may require payment or subscription fees. Pricing,
            billing cycles, and cancellation terms will be disclosed at the time
            of purchase.
          </p>
          <p>
            All payments are non-refundable unless otherwise stated in writing.
            We reserve the right to change pricing with reasonable notice.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">7. Intellectual Property</h2>
          <p>
            All content, software, designs, trademarks, and materials provided
            through the Services are owned by or licensed to Infinite Wealth
            Solutions AI.
          </p>
          <p>
            You may not copy, modify, distribute, reverse engineer, or exploit
            our Services without prior written permission.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Infinite Wealth Solutions AI
            shall not be liable for any indirect, incidental, consequential, or
            special damages arising from your use of the Services.
          </p>
          <p>
            Our total liability for any claim shall not exceed the amount paid
            by you to us in the twelve (12) months preceding the claim.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">9. Termination</h2>
          <p>
            We may suspend or terminate your access to the Services at any time
            if you violate these Terms or misuse the Services.
          </p>
          <p>
            Upon termination, your right to use the Services will immediately
            cease.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">10. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Changes will be posted
            on this page with an updated revision date.
          </p>
          <p>
            Continued use of the Services after changes are posted constitutes
            acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">11. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the
            laws of the jurisdiction in which Infinite Wealth Solutions AI
            operates, without regard to conflict of law principles.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">12. Contact Us</h2>
          <p>
            If you have questions about these Terms, you may contact us at:
          </p>
          <p className="font-medium">
            Email: support@infinitewealthsolutionsai.com
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;