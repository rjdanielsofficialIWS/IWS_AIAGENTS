import React from "react";
import {
  Sparkles,
  Phone,
  Mail,
  User,
  CheckCircle,
  AlertCircle,
  Loader,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Zap,
  Wand2,
} from "lucide-react";
import { SubscriptionSection } from "./SubscriptionSection";
import { VapiVoiceWidget } from "./VapiVoiceWidget";

interface FormData {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  business: string;
  services: string;
  serviceInterest: string[];
  projectRequirements: string;
}

type QuestionId = "serviceInterest" | "projectRequirements" | "contactInfo";
type QuestionType = "textarea" | "checkbox" | "multi-input";

interface Question {
  id: QuestionId;
  title: string;
  subtitle?: string;
  type: QuestionType;
  icon: React.ComponentType<any>;
  required?: boolean;
  options?: { value: string; label: string; hint?: string }[];
  fields?: {
    id: keyof FormData;
    label: string;
    type: "input" | "email" | "tel";
    placeholder: string;
    icon: React.ComponentType<any>;
    required: boolean;
  }[];
}

const WEBHOOK_URL =
  "https://hook.us2.make.com/278k1u1vit3mimed0gqe0uqlkw2d99yw";

function Action({
  onClick,
  disabled,
  className,
  children,
  ariaLabel,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-disabled={disabled ? "true" : "false"}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={[
        "select-none",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function HomePage() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [formData, setFormData] = React.useState<FormData>({
    name: "",
    email: "",
    phone: "",
    countryCode: "+1",
    business: "",
    services: "",
    serviceInterest: [],
    projectRequirements: "",
  });

  const [currentError, setCurrentError] = React.useState<string>("");
  const [isStepValid, setIsStepValid] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<
    "success" | "error" | null
  >(null);

  // Subtle scroll-driven background shift (professional: very light)
  const [scrollP, setScrollP] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    const update = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      setScrollP(p);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const x1 = `${(22 + scrollP * 26).toFixed(2)}%`;
  const y1 = `${(18 + ((scrollP * 1.2) % 1) * 12).toFixed(2)}%`;
  const x2 = `${(78 - scrollP * 20).toFixed(2)}%`;
  const y2 = `${(72 + ((scrollP * 1.1) % 1) * 12).toFixed(2)}%`;

  const rootStyle = {
    ["--x1" as any]: x1,
    ["--y1" as any]: y1,
    ["--x2" as any]: x2,
    ["--y2" as any]: y2,
  } as React.CSSProperties;

  const questions: Question[] = [
    {
      id: "serviceInterest",
      title: "What are you looking for?",
      subtitle: "Select one or more — we’ll tailor the quote.",
      type: "checkbox",
      icon: Sparkles,
      required: true,
      options: [
        { value: "ai-agent", label: "AI Phone Agent", hint: "Capture calls and book appointments." },
        { value: "website", label: "Web Design", hint: "Clean, premium site built to convert." },
        { value: "custom", label: "Custom Package", hint: "Website + AI + automations." },
      ],
    },
    {
      id: "projectRequirements",
      title: "What do you want to improve?",
      subtitle: "Keep it short — the outcome matters.",
      type: "textarea",
      icon: Wand2,
      required: true,
    },
    {
      id: "contactInfo",
      title: "Where should we send the quote?",
      subtitle: "We’ll reply quickly. No spam.",
      type: "multi-input",
      icon: ShieldCheck,
      fields: [
        { id: "name", label: "Name", type: "input", placeholder: "Your name", icon: User, required: true },
        { id: "email", label: "Email", type: "email", placeholder: "you@company.com", icon: Mail, required: true },
        { id: "phone", label: "Phone", type: "tel", placeholder: "555 123 4567", icon: Phone, required: true },
        { id: "business", label: "Business (optional)", type: "input", placeholder: "Company name", icon: Sparkles, required: false },
      ],
    },
  ];

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePhone = (phone: string) =>
    /^[\d\s\-\(\)]{7,18}$/.test(phone.replace(/\s/g, ""));

  const validateCurrentStep = () => {
    const q = questions[currentStep];
    let ok = true;
    let err = "";

    if (q.type === "checkbox") {
      if (!formData.serviceInterest || formData.serviceInterest.length === 0) {
        ok = false;
        err = "Select at least one option.";
      }
    }

    if (q.type === "textarea") {
      if (!formData.projectRequirements.trim()) {
        ok = false;
        err = "Tell us what you want to improve.";
      }
    }

    if (q.type === "multi-input") {
      for (const field of q.fields ?? []) {
        const v = String(formData[field.id] ?? "").trim();
        if (field.required && !v) {
          ok = false;
          err = `${field.label} is required.`;
          break;
        }
        if (field.id === "email" && v && !validateEmail(v)) {
          ok = false;
          err = "Enter a valid email.";
          break;
        }
        if (field.id === "phone" && v && !validatePhone(v)) {
          ok = false;
          err = "Enter a valid phone number.";
          break;
        }
      }
    }

    setCurrentError(err);
    setIsStepValid(ok);
    return ok;
  };

  const validateAllSteps = () => {
    if (!formData.serviceInterest?.length) return false;
    if (!formData.projectRequirements.trim()) return false;
    if (!formData.name.trim()) return false;
    if (!formData.email.trim() || !validateEmail(formData.email.trim())) return false;
    if (!formData.phone.trim() || !validatePhone(formData.phone.trim())) return false;
    return true;
  };

  React.useEffect(() => {
    validateCurrentStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, formData]);

  const scrollToLead = () => {
    const el = document.getElementById("lead-capture");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleInterest = (value: string) => {
    setFormData((prev) => {
      const list = prev.serviceInterest ?? [];
      const exists = list.includes(value);
      return {
        ...prev,
        serviceInterest: exists ? list.filter((x) => x !== value) : [...list, value],
      };
    });
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < questions.length - 1) {
      setCurrentStep((s) => s + 1);
      setCurrentError("");
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setCurrentError("");
    }
  };

  const submitToWebhook = async (data: FormData) => {
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.countryCode.replace("+", "") + data.phone,
          business: data.business,
          services: data.services,
          serviceInterest: Array.isArray(data.serviceInterest)
            ? data.serviceInterest.join(", ")
            : data.serviceInterest,
          projectRequirements: data.projectRequirements,
          timestamp: new Date().toISOString(),
        }),
      });
      return response.ok;
    } catch (e) {
      console.error("Webhook submit error:", e);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateAllSteps()) {
      setSubmitStatus("error");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    const ok = await submitToWebhook(formData);

    if (ok) {
      setSubmitStatus("success");
      setFormData({
        name: "",
        email: "",
        phone: "",
        countryCode: "+1",
        business: "",
        services: "",
        serviceInterest: [],
        projectRequirements: "",
      });
      setCurrentStep(0);
    } else {
      setSubmitStatus("error");
    }

    setIsSubmitting(false);
  };

  // Professional accent usage: keep subtle (no big gradient text everywhere)
  const accentBlue = "text-[#49B6FF]";
  const accentGold = "text-[#FFD24A]";

  return (
    <div style={rootStyle} className="min-h-screen text-white overflow-x-hidden">
      {/* Professional black/grey gradient background */}
      <div className="fixed inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(900px circle at var(--x1) var(--y1), rgba(255,255,255,0.06), transparent 62%),
              radial-gradient(900px circle at var(--x2) var(--y2), rgba(255,255,255,0.04), transparent 62%),
              linear-gradient(180deg, #050607 0%, #0B0D10 45%, #07080A 100%)
            `,
          }}
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 sm:px-6 lg:px-8 pt-7">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl flex items-center justify-center">
              <Zap className={`h-5 w-5 ${accentBlue}`} />
            </div>
            <div className="leading-tight">
              <div className="text-sm text-white/60">Infinite Wealth Solutions</div>
              <div className="text-lg font-semibold text-white/90">AI Studio</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Action
              onClick={scrollToLead}
              ariaLabel="Jump to quote form"
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition backdrop-blur-xl"
            >
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Sparkles className={`h-4 w-4 ${accentGold}`} />
                <span>Get a Quote</span>
              </div>
            </Action>

            <a
              href="https://infinitewealthsolutionsai.com/demo"
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.015] hover:bg-white/[0.035] transition backdrop-blur-xl text-sm text-white/75"
            >
              Free Demo
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 pt-10 pb-8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.02] backdrop-blur-xl text-xs text-white/60">
              <ShieldCheck className={`h-4 w-4 ${accentBlue}`} />
              Web design + voice AI built for lead capture
            </div>

            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white/95">
              Professional websites and AI voice agents —
              <span className="text-white/70"> built to convert.</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-white/55 max-w-2xl leading-relaxed">
              If your business misses calls or your site isn’t converting, we fix both — with a clean
              premium site and a realistic voice agent that captures details and books appointments.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl px-4 py-3 flex items-center gap-2">
                <Phone className={`h-4 w-4 ${accentBlue}`} />
                <span className="text-sm text-white/65">Calls answered after-hours</span>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl px-4 py-3 flex items-center gap-2">
                <Calendar className={`h-4 w-4 ${accentGold}`} />
                <span className="text-sm text-white/65">Appointments booked automatically</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4 text-sm text-white/55">
              <a
                href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-white/80 transition"
              >
                <Calendar className={`h-4 w-4 ${accentGold}`} />
                <span className="font-semibold text-white/80">Book a setup call</span>
                <ArrowRight className="h-4 w-4 text-white/35" />
              </a>

              <Action
                onClick={scrollToLead}
                ariaLabel="Scroll to quote form"
                className="inline-flex items-center gap-2 hover:text-white/80 transition"
              >
                <span className={`font-semibold ${accentBlue}`}>Get a quote</span>
                <ArrowRight className="h-4 w-4 text-white/35" />
              </Action>
            </div>
          </div>

          {/* Right panel (professional, minimal) */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6">
              <div className="text-sm text-white/55">What you get</div>

              <div className="mt-4 space-y-3">
                {[
                  "A clean premium website that looks credible and converts on mobile.",
                  "A human-like voice agent that captures missed calls and qualifies leads.",
                  "A simple handoff so you can manage and scale without complexity.",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-3 text-sm text-white/60">
                    <CheckCircle className={`h-5 w-5 ${accentBlue} mt-0.5`} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.015] p-4 text-sm text-white/55">
                Want to hear the agent? Tap the voice widget bottom-right.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Capture */}
      <section id="lead-capture" className="relative z-10 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
            <div className="p-6 sm:p-7 border-b border-white/10">
              <div className="flex items-start justify-between gap-6 flex-col sm:flex-row">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-semibold text-white/90">
                    Request a quote
                  </h2>
                  <p className="mt-2 text-white/50">Short form. Fast response.</p>
                </div>

                <div className="flex items-center gap-2">
                  {questions.map((_, idx) => {
                    const done = idx < currentStep;
                    const active = idx === currentStep;
                    return (
                      <React.Fragment key={idx}>
                        <Action
                          ariaLabel={`Go to step ${idx + 1}`}
                          onClick={() => {
                            setCurrentStep(idx);
                            setCurrentError("");
                          }}
                          className={[
                            "h-10 w-10 rounded-2xl flex items-center justify-center border transition",
                            done
                              ? "border-white/16 bg-white/[0.04]"
                              : active
                              ? "border-white/20 bg-white/[0.05]"
                              : "border-white/10 bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/14",
                          ].join(" ")}
                        >
                          {done ? (
                            <CheckCircle className={`h-5 w-5 ${accentGold}`} />
                          ) : (
                            <span className="text-sm text-white/70 font-semibold">{idx + 1}</span>
                          )}
                        </Action>
                        {idx < questions.length - 1 && (
                          <div className="w-7 h-[2px] bg-white/10" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {submitStatus === "success" && (
                <div className="mt-5 p-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-300 mt-0.5" />
                  <div>
                    <div className="font-semibold text-emerald-200">Received.</div>
                    <div className="text-sm text-emerald-100/75">
                      We’ll reply with next steps and pricing.
                    </div>
                  </div>
                </div>
              )}

              {submitStatus === "error" && (
                <div className="mt-5 p-4 rounded-2xl border border-red-400/15 bg-red-400/10 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-300 mt-0.5" />
                  <div>
                    <div className="font-semibold text-red-200">Something failed.</div>
                    <div className="text-sm text-red-100/75">Please try again.</div>
                  </div>
                </div>
              )}
            </div>

            {submitStatus !== "success" && (
              <div className="p-6 sm:p-7">
                {(() => {
                  const q = questions[currentStep];

                  if (q.type === "checkbox") {
                    return (
                      <div>
                        <div className="mb-5">
                          <div className="flex items-center gap-3 mb-2">
                            <q.icon className={`h-5 w-5 ${accentGold}`} />
                            <div className="text-xl sm:text-2xl font-semibold text-white/90">
                              {q.title}
                            </div>
                          </div>
                          {q.subtitle && <div className="text-sm text-white/50">{q.subtitle}</div>}
                        </div>

                        <div className="grid sm:grid-cols-3 gap-3">
                          {(q.options ?? []).map((opt) => {
                            const selected = formData.serviceInterest.includes(opt.value);
                            return (
                              <Action
                                key={opt.value}
                                ariaLabel={opt.label}
                                onClick={() => toggleInterest(opt.value)}
                                className={[
                                  "rounded-2xl border p-4 transition",
                                  selected
                                    ? "border-white/18 bg-white/[0.05]"
                                    : "border-white/10 bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/14",
                                ].join(" ")}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-semibold text-white/80">{opt.label}</div>
                                    {opt.hint && <div className="mt-1 text-sm text-white/50">{opt.hint}</div>}
                                  </div>
                                  {selected && <CheckCircle className={`h-5 w-5 ${accentBlue}`} />}
                                </div>
                              </Action>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (q.type === "textarea") {
                    return (
                      <div>
                        <div className="mb-5">
                          <div className="flex items-center gap-3 mb-2">
                            <q.icon className={`h-5 w-5 ${accentBlue}`} />
                            <div className="text-xl sm:text-2xl font-semibold text-white/90">
                              {q.title}
                            </div>
                          </div>
                          {q.subtitle && <div className="text-sm text-white/50">{q.subtitle}</div>}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.015] overflow-hidden">
                          <textarea
                            value={formData.projectRequirements}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                projectRequirements: e.target.value,
                              }))
                            }
                            placeholder='Example: "Improve missed call capture and increase booked appointments."'
                            rows={5}
                            className="w-full bg-transparent px-4 py-4 outline-none text-white placeholder:text-white/30"
                          />
                        </div>
                      </div>
                    );
                  }

                  // multi-input
                  return (
                    <div>
                      <div className="mb-5">
                        <div className="flex items-center gap-3 mb-2">
                          <q.icon className={`h-5 w-5 ${accentGold}`} />
                          <div className="text-xl sm:text-2xl font-semibold text-white/90">
                            {q.title}
                          </div>
                        </div>
                        {q.subtitle && <div className="text-sm text-white/50">{q.subtitle}</div>}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {(q.fields ?? []).map((field) => {
                          const Icon = field.icon;

                          if (field.id === "phone") {
                            return (
                              <div key={field.id} className="sm:col-span-2">
                                <label className="text-sm text-white/55 flex items-center gap-2 mb-2">
                                  <Icon className={`h-4 w-4 ${accentBlue}`} />
                                  {field.label}
                                  {field.required ? <span className="text-white/30">*</span> : null}
                                </label>

                                <div className="flex rounded-2xl border border-white/10 bg-white/[0.015] overflow-hidden">
                                  <select
                                    value={formData.countryCode}
                                    onChange={(e) =>
                                      setFormData((p) => ({
                                        ...p,
                                        countryCode: e.target.value,
                                      }))
                                    }
                                    className="bg-transparent px-3 py-3 outline-none text-white/65 border-r border-white/10"
                                  >
                                    <option value="+1">🇨🇦 +1</option>
                                    <option value="+1">🇺🇸 +1</option>
                                    <option value="+44">🇬🇧 +44</option>
                                    <option value="+61">🇦🇺 +61</option>
                                    <option value="+34">🇪🇸 +34</option>
                                    <option value="+49">🇩🇪 +49</option>
                                  </select>

                                  <input
                                    value={formData.phone}
                                    onChange={(e) =>
                                      setFormData((p) => ({
                                        ...p,
                                        phone: e.target.value,
                                      }))
                                    }
                                    placeholder={field.placeholder}
                                    className="flex-1 bg-transparent px-4 py-3 outline-none text-white placeholder:text-white/30"
                                    inputMode="tel"
                                  />
                                </div>
                              </div>
                            );
                          }

                          const val = String(formData[field.id] ?? "");
                          return (
                            <div key={field.id}>
                              <label className="text-sm text-white/55 flex items-center gap-2 mb-2">
                                <Icon className={`h-4 w-4 ${accentGold}`} />
                                {field.label}
                                {field.required ? <span className="text-white/30">*</span> : null}
                              </label>

                              <div className="rounded-2xl border border-white/10 bg-white/[0.015] overflow-hidden">
                                <input
                                  value={val}
                                  onChange={(e) =>
                                    setFormData((p) => ({
                                      ...p,
                                      [field.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={field.placeholder}
                                  className="w-full bg-transparent px-4 py-3 outline-none text-white placeholder:text-white/30"
                                  inputMode={
                                    field.type === "email"
                                      ? "email"
                                      : field.type === "tel"
                                      ? "tel"
                                      : "text"
                                  }
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {currentError && (
                  <div className="mt-5 p-4 rounded-2xl border border-red-400/15 bg-red-400/10 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-300" />
                    <div className="text-sm text-red-100/80">{currentError}</div>
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-7 flex items-center justify-between gap-3 flex-col sm:flex-row">
                  <Action
                    ariaLabel="Previous step"
                    disabled={currentStep === 0}
                    onClick={handlePrevious}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-white/10 bg-white/[0.015] hover:bg-white/[0.03] transition text-white/70 text-center"
                  >
                    Back
                  </Action>

                  {currentStep < questions.length - 1 ? (
                    <Action
                      ariaLabel="Next step"
                      disabled={!isStepValid}
                      onClick={handleNext}
                      className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.045] transition"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-white/80 font-semibold">Next</span>
                        <ArrowRight className={`h-4 w-4 ${accentGold}`} />
                      </div>
                    </Action>
                  ) : (
                    <Action
                      ariaLabel="Submit"
                      disabled={!isStepValid || isSubmitting}
                      onClick={handleSubmit}
                      className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-white/10 bg-white/[0.045] hover:bg-white/[0.06] transition"
                    >
                      <div className="flex items-center justify-center gap-2">
                        {isSubmitting ? (
                          <>
                            <Loader className={`h-4 w-4 animate-spin ${accentGold}`} />
                            <span className="text-white/70 font-semibold">Sending…</span>
                          </>
                        ) : (
                          <>
                            <span className="text-white/85 font-semibold">Send</span>
                            <ArrowRight className={`h-4 w-4 ${accentBlue}`} />
                          </>
                        )}
                      </div>
                    </Action>
                  )}
                </div>

                <div className="mt-5 text-xs text-white/35 leading-relaxed">
                  By submitting, you agree we can contact you about this request.
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <SubscriptionSection />

      <footer className="relative z-10 px-4 sm:px-6 lg:px-8 py-10 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="text-sm text-white/40">
            © {new Date().getFullYear()} Infinite Wealth Solutions — AI Studio
          </div>

          <div className="flex items-center gap-5 text-sm">
            <a
              href="https://infinitewealthsolutionsai.com/demo"
              className="text-white/40 hover:text-white/70 transition"
            >
              Demo
            </a>
            <a
              href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white/70 transition"
            >
              Book
            </a>
            <a href="/privacy-policy" className="text-white/40 hover:text-white/70 transition">
              Privacy
            </a>
          </div>
        </div>
      </footer>

      <VapiVoiceWidget
        publicKey="ebb2120b-ac56-4ce9-b1d5-17966931c665"
        assistantId="76efe9e0-957c-410a-9163-75acbceec45e"
        firstMessage="Infinite Wealth Solutions AI - Avery speaking, how may I help you?"
      />
    </div>
  );
}