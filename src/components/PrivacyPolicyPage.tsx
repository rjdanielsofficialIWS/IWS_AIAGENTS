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

export function PrivacyPolicyPage() {
  React.useEffect(() => {
    document.title = "Privacy Policy | Infinite Wealth Solutions AI";
    const desc =
      "Read the Privacy Policy for Infinite Wealth Solutions AI, including how we collect, use, and protect your information.";
    upsertMetaTag("description", desc);
    upsertMetaProperty("og:title", "Privacy Policy | Infinite Wealth Solutions AI");
    upsertMetaProperty("og:description", desc);
    upsertMetaTag("twitter:card", "summary");
    upsertMetaTag("twitter:title", "Privacy Policy | Infinite Wealth Solutions AI");
    upsertMetaTag("twitter:description", desc);
    upsertCanonical(`${window.location.origin}/privacy-policy`);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-400">Effective Date: January 2026</p>

        <div className="mt-8 space-y-6 text-gray-200 leading-relaxed">
          <p>
            Infinite Wealth Solutions AI (“we,” “our,” or “us”) values your privacy and is committed to protecting your
            personal information. This Privacy Policy explains how we collect, use, store, and protect information you
            provide when you visit our website or submit your information through our forms or advertisements.
          </p>

          <h2 className="text-xl font-semibold text-white">Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-200">
            <li>Full name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Business information (if provided)</li>
            <li>Any additional details you voluntarily submit through forms</li>
          </ul>
          <p>
            We may also collect limited technical information such as IP address, device type, browser type, and website
            usage data through cookies or analytics tools.
          </p>

          <h2 className="text-xl font-semibold text-white">How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-200">
            <li>Respond to inquiries and requests</li>
            <li>Follow up regarding website design, digital services, or related offerings</li>
            <li>Provide information about our services</li>
            <li>Schedule calls, consultations, or next steps</li>
            <li>Improve our website, ads, and customer experience</li>
            <li>Comply with legal or regulatory requirements</li>
          </ul>
          <p>We do not sell, rent, or trade your personal information.</p>

          <h2 className="text-xl font-semibold text-white">Advertising &amp; Lead Forms</h2>
          <p>
            If you submit your information through a third-party platform (such as Meta/Facebook or Instagram lead
            forms), your data is securely transmitted to us and used only for the purposes described above.
          </p>
          <p>
            Your information is handled in accordance with this Privacy Policy and the privacy policies of the platform
            you used to submit your details.
          </p>

          <h2 className="text-xl font-semibold text-white">Phone &amp; Email Communications</h2>
          <p>
            If you provide your phone number or email address, you consent to being contacted by us regarding your
            inquiry or services you requested.
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-200">
            <li>We do not send spam</li>
            <li>We do not share your contact information with third parties for marketing</li>
            <li>You may opt out of communications at any time by replying “STOP” or requesting removal</li>
          </ul>

          <h2 className="text-xl font-semibold text-white">Cookies &amp; Analytics</h2>
          <p>
            We may use cookies and analytics tools to understand how visitors use our website. This helps us improve
            functionality, performance, and user experience. You can disable cookies through your browser settings if
            you prefer.
          </p>

          <h2 className="text-xl font-semibold text-white">Data Security</h2>
          <p>
            We take reasonable administrative, technical, and physical measures to protect your personal information
            from unauthorized access, misuse, or disclosure. While no system is 100% secure, we take data protection
            seriously and follow industry-standard practices.
          </p>

          <h2 className="text-xl font-semibold text-white">Third-Party Services</h2>
          <p>
            Our website may link to third-party tools or services (such as booking software or analytics platforms). We
            are not responsible for the privacy practices of those third parties. We encourage you to review their
            privacy policies separately.
          </p>

          <h2 className="text-xl font-semibold text-white">Your Rights</h2>
          <p>
            Depending on your location, you may have the right to request access to your personal data, request
            corrections or deletion, or withdraw consent for communications. To exercise these rights, contact us using
            the information below.
          </p>

          <h2 className="text-xl font-semibold text-white">Contact Information</h2>
          <p>
            <span className="font-semibold text-white">Infinite Wealth Solutions AI</span>
            <br />
            Email: support@infinitewealthsolutionsai.com
            <br />
            Website: https://infinitewealthsolutionsai.com/
          </p>

          <h2 className="text-xl font-semibold text-white">Policy Updates</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated
            effective date.
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