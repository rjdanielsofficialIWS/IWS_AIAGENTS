import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Zap,
  TrendingUp,
  Phone,
  Mail,
  User,
  Building,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader,
  ArrowLeft,
  ArrowRight,
  Target,
  Calendar,
  Users,
  Sparkles,
  Shield,
  Rocket,
} from 'lucide-react';
import { SubscriptionSection } from './SubscriptionSection';

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

interface EnhanceState {
  isEnhancing: boolean;
  hasEnhanced: boolean;
}

interface Question {
  id: keyof FormData | 'contactInfo';
  title: string;
  subtitle?: string;
  label?: string;
  type: 'input' | 'textarea' | 'multi-input' | 'select' | 'radio' | 'checkbox';
  placeholder?: string;
  rows?: number;
  icon?: React.ComponentType<any>;
  required?: boolean;
  options?: { value: string; label: string }[];
  fields?: {
    id: keyof FormData;
    label: string;
    type: 'input' | 'email' | 'tel';
    placeholder: string;
    icon: React.ComponentType<any>;
    required: boolean;
  }[];
}

export function HomePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    countryCode: '+1',
    business: '',
    services: '',
    serviceInterest: [],
    projectRequirements: ''
  });
  const [currentError, setCurrentError] = useState<string>('');
  const [isStepValid, setIsStepValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [enhanceState, setEnhanceState] = useState<EnhanceState>({
    isEnhancing: false,
    hasEnhanced: false
  });

  const questions: Question[] = [
    {
      id: 'serviceInterest',
      title: 'What do you want to improve first?',
      subtitle: '(Pick all that apply)',
      type: 'checkbox',
      icon: Target,
      required: true,
      options: [
        { value: 'custom-websites', label: 'Web Design — premium site that converts' },
        { value: 'ai-agents', label: 'AI Phone Agents — answer calls 24/7 + book jobs' },
        { value: 'lead-generation', label: 'Lead Generation — more qualified leads consistently' }
      ]
    },
    {
      id: 'projectRequirements',
      title: 'Quick details (so we can build the right solution)',
      type: 'textarea',
      placeholder: 'What’s your business? What are you trying to accomplish? Any timeline or special requirements?',
      rows: 4,
      icon: MessageSquare,
      required: true
    },
    {
      id: 'contactInfo',
      title: 'Where should we send the next steps?',
      type: 'multi-input',
      fields: [
        { id: 'name', label: 'Name', type: 'input', placeholder: 'Your full name', icon: User, required: true },
        { id: 'email', label: 'Email', type: 'email', placeholder: 'you@company.com', icon: Mail, required: true },
        { id: 'phone', label: 'Phone', type: 'tel', placeholder: '555-123-4567', icon: Phone, required: true }
      ]
    }
  ];

  const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\d\s\-\(\)]{7,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateCurrentStep = (): boolean => {
    const q = questions[currentStep];
    let isValid = true;
    let error = '';

    if (q.type === 'multi-input') {
      for (const field of q.fields || []) {
        const value = formData[field.id];
        if (!value.trim()) { isValid = false; error = `${field.label} is required`; break; }
        if (field.id === 'email' && !validateEmail(value)) { isValid = false; error = 'Please enter a valid email'; break; }
        if (field.id === 'phone' && !validatePhone(value)) { isValid = false; error = 'Please enter a valid phone number'; break; }
      }
    } else if (q.type === 'checkbox') {
      const value = formData[q.id as keyof FormData] as string[];
      if (!value || value.length === 0) { isValid = false; error = 'Please select at least one option'; }
    } else {
      const value = formData[q.id as keyof FormData] as string;
      if (!value.trim()) { isValid = false; error = 'This field is required'; }
    }

    setCurrentError(error);
    setIsStepValid(isValid);
    return isValid;
  };

  const validateAllSteps = (): boolean => {
    for (const q of questions) {
      if (q.type === 'multi-input') {
        for (const field of q.fields || []) {
          const value = formData[field.id];
          if (!value.trim()) return false;
          if (field.id === 'email' && !validateEmail(value)) return false;
          if (field.id === 'phone' && !validatePhone(value)) return false;
        }
      } else if (q.type === 'checkbox') {
        const value = formData[q.id as keyof FormData] as string[];
        if (!value || value.length === 0) return false;
      } else {
        const value = formData[q.id as keyof FormData] as string;
        if (!value.trim()) return false;
      }
    }
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (e.target.type === 'checkbox') {
      const checkboxValue = (e.target as HTMLInputElement).value;
      const isChecked = (e.target as HTMLInputElement).checked;

      setFormData(prev => ({
        ...prev,
        [name]: isChecked
          ? [...(prev[name as keyof FormData] as string[]), checkboxValue]
          : (prev[name as keyof FormData] as string[]).filter(item => item !== checkboxValue)
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, countryCode: e.target.value }));
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < questions.length - 1) {
        setCurrentStep(currentStep + 1);
        setCurrentError('');
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setCurrentError('');
    }
  };

  const submitToWebhook = async (data: FormData): Promise<boolean> => {
    try {
      const WEBHOOK_URL = 'https://hook.us2.make.com/278k1u1vit3mimed0gqe0uqlkw2d99yw';

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.countryCode.replace('+', '') + data.phone,
          business: data.business,
          services: data.services,
          serviceInterest: Array.isArray(data.serviceInterest) ? data.serviceInterest.join(', ') : data.serviceInterest,
          projectRequirements: data.projectRequirements,
          timestamp: new Date().toISOString()
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error submitting to webhook:', error);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateAllSteps()) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const success = await submitToWebhook(formData);

      if (success) {
        setSubmitStatus('success');
        setFormData({
          name: '',
          email: '',
          phone: '',
          countryCode: '+1',
          business: '',
          services: '',
          serviceInterest: [],
          projectRequirements: ''
        });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    validateCurrentStep();
  }, [currentStep, formData]);

  const scrollToLead = () => {
    const el = document.getElementById('lead-capture');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden bg-[#050608]">
      {/* Premium background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(1100px_600px_at_50%_-220px,rgba(255,210,74,0.12),transparent_60%),radial-gradient(900px_500px_at_20%_30%,rgba(73,182,255,0.10),transparent_55%),radial-gradient(900px_500px_at_80%_60%,rgba(255,210,74,0.08),transparent_55%),linear-gradient(to_bottom,#0B0D10,#050608)]" />
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-br from-[#49B6FF]/20 to-transparent blur-3xl" />
        <div className="absolute top-20 -right-40 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-[#FFD24A]/18 to-transparent blur-3xl" />
        <div className="absolute -bottom-52 left-1/3 w-[34rem] h-[34rem] rounded-full bg-gradient-to-br from-[#49B6FF]/12 via-[#FFD24A]/10 to-transparent blur-3xl" />
      </div>

      {/* Top nav */}
      <header className="relative z-10 px-4 sm:px-6 lg:px-8 pt-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 backdrop-blur flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-[#FFD24A]" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-extrabold tracking-tight">
                Infinite Wealth Solutions
              </div>
              <div className="text-xs sm:text-sm text-gray-400">AI • Web • Automations</div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/demo"
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-sm"
            >
              Try Demo
            </Link>
            <a
              href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl font-bold bg-gradient-to-r from-[#FFD24A] to-[#49B6FF] text-black hover:opacity-95 transition text-sm"
            >
              Book a Call
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 pt-14 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur">
                <Shield className="h-4 w-4 text-[#49B6FF]" />
                <span className="text-sm text-gray-200">Premium digital systems</span>
                <span className="text-sm text-gray-400">that look elite & convert</span>
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                Make your business{' '}
                <span className="bg-gradient-to-r from-[#FFD24A] via-[#49B6FF] to-[#FFD24A] bg-clip-text text-transparent">
                  look unstoppable
                </span>
                .
              </h1>

              <p className="mt-5 text-lg text-gray-300 max-w-xl">
                Websites that convert. AI that answers calls. Automations that run the backend.
                Clean, modern, and built to scale.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a
                  href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[#FFD24A] to-[#49B6FF] text-black hover:opacity-95 transition"
                >
                  <Calendar className="h-5 w-5" />
                  Book a Call
                </a>

                <button
                  onClick={scrollToLead}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition"
                >
                  <MessageSquare className="h-5 w-5 text-[#FFD24A]" />
                  Get a Quote
                </button>

                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition"
                >
                  <Target className="h-5 w-5 text-[#49B6FF]" />
                  View Pricing
                </a>
              </div>

              {/* Mini proof */}
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl">
                {[
                  { icon: Phone, title: '24/7 Calls', sub: 'AI answers instantly' },
                  { icon: Rocket, title: 'Fast Launch', sub: 'premium look in days' },
                  { icon: TrendingUp, title: 'More Leads', sub: 'conversion-first design' },
                ].map((b, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4"
                  >
                    <b.icon className={`h-5 w-5 ${i === 0 ? 'text-[#FFD24A]' : i === 1 ? 'text-[#49B6FF]' : 'text-[#FFD24A]'}`} />
                    <div className="mt-2 font-bold">{b.title}</div>
                    <div className="text-sm text-gray-400">{b.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right visual card */}
            <div className="relative">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#FFD24A]/25 via-[#49B6FF]/25 to-[#FFD24A]/25 blur-2xl opacity-70" />
              <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-7 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">Live Preview</div>
                    <div className="text-xl font-extrabold">AI + Website System</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
                    Chrome Blue + Gold
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3">
                  {[
                    { title: 'AI Phone Agent', desc: 'Answers calls → captures lead → books appointment', icon: Phone, accent: 'from-[#FFD24A] to-[#49B6FF]' },
                    { title: 'Website Upgrade', desc: 'Premium UI → clear offer → strong CTA', icon: Building, accent: 'from-[#49B6FF] to-[#FFD24A]' },
                    { title: 'Automation Layer', desc: 'Lead routing → CRM → follow-ups', icon: Zap, accent: 'from-[#FFD24A] to-[#49B6FF]' },
                  ].map((row, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-white/10 bg-[#0B0D10]/60 p-4 flex items-start gap-3"
                    >
                      <div className={`h-11 w-11 rounded-xl bg-gradient-to-r ${row.accent} text-black flex items-center justify-center`}>
                        <row.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold">{row.title}</div>
                        <div className="text-sm text-gray-400">{row.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
                  <div className="text-sm text-gray-300">
                    Want a custom package?
                    <div className="text-xs text-gray-500">We’ll map it to your exact workflow.</div>
                  </div>
                  <button
                    onClick={scrollToLead}
                    className="px-4 py-2 rounded-xl font-bold bg-gradient-to-r from-[#FFD24A] to-[#49B6FF] text-black hover:opacity-95 transition text-sm"
                  >
                    Build Mine
                  </button>
                </div>

                <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-gradient-to-br from-[#49B6FF]/18 via-[#FFD24A]/12 to-transparent blur-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold">
              What we build{' '}
              <span className="bg-gradient-to-r from-[#FFD24A] via-[#49B6FF] to-[#FFD24A] bg-clip-text text-transparent">
                for you
              </span>
            </h2>
            <p className="mt-3 text-gray-300 max-w-2xl mx-auto">
              Designed to look high-end and perform like a machine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: 'AI Phone Agents', desc: 'Realistic voice agents that answer calls, qualify leads, and book jobs.', pill: '24/7', accent: 'text-[#FFD24A]' },
              { icon: Building, title: 'Web Design', desc: 'Premium design that makes your business look legit — and drives action.', pill: 'Conversion-first', accent: 'text-[#49B6FF]' },
              { icon: TrendingUp, title: 'Lead Systems', desc: 'Lead gen + follow-up automation that keeps your pipeline full.', pill: 'Growth', accent: 'text-[#FFD24A]' },
            ].map((c, i) => (
              <div key={i} className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 blur-2xl opacity-70" />
                <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:bg-white/7 transition">
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-xl bg-[#0B0D10]/60 border border-white/10 flex items-center justify-center">
                      <c.icon className={`h-6 w-6 ${c.accent}`} />
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full border border-white/10 bg-white/5 text-gray-300">
                      {c.pill}
                    </span>
                  </div>
                  <div className="mt-4 text-xl font-extrabold">{c.title}</div>
                  <div className="mt-2 text-gray-400 text-sm leading-relaxed">{c.desc}</div>

                  <div className="mt-5 flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="h-4 w-4 text-[#49B6FF]" />
                    Premium look
                    <span className="text-gray-600">•</span>
                    <CheckCircle className="h-4 w-4 text-[#FFD24A]" />
                    Built to convert
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[#FFD24A] to-[#49B6FF] text-black hover:opacity-95 transition"
            >
              <Calendar className="h-5 w-5" />
              Book a Call
            </a>
            <button
              onClick={scrollToLead}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              <MessageSquare className="h-5 w-5 text-[#FFD24A]" />
              Get a Quote
            </button>
          </div>
        </div>
      </section>

      {/* LEAD CAPTURE FORM */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur">
              <Sparkles className="h-4 w-4 text-[#FFD24A]" />
              <span className="text-sm text-gray-200">Get a quote</span>
              <span className="text-sm text-gray-400">quick and clean</span>
            </div>
            <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold">
              Get your{' '}
              <span className="bg-gradient-to-r from-[#FFD24A] via-[#49B6FF] to-[#FFD24A] bg-clip-text text-transparent">
                custom plan
              </span>
            </h2>
            <p className="mt-3 text-gray-300">
              Tell us what you want. We’ll map the best solution (and price) for your business.
            </p>
          </div>

          <div id="lead-capture" className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#FFD24A]/18 via-[#49B6FF]/18 to-[#FFD24A]/18 blur-2xl opacity-70" />
            <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 sm:p-10 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {submitStatus === 'success' && (
                <div className="mb-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                  <div>
                    <div className="font-bold text-green-200">Submitted successfully</div>
                    <div className="text-sm text-green-200/70">We’ll reach out with next steps.</div>
                  </div>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                  <div>
                    <div className="font-bold text-red-200">Submission failed</div>
                    <div className="text-sm text-red-200/70">Try again in a moment.</div>
                  </div>
                </div>
              )}

              {/* Step dots */}
              {submitStatus !== 'success' && (
                <div className="mb-8">
                  <div className="flex items-center justify-center gap-3">
                    {questions.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-2.5 w-10 rounded-full transition-all ${
                          idx === currentStep
                            ? 'bg-gradient-to-r from-[#FFD24A] to-[#49B6FF]'
                            : idx < currentStep
                            ? 'bg-white/25'
                            : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="mt-3 text-center text-xs text-gray-400">
                    Step {currentStep + 1} of {questions.length}
                  </div>
                </div>
              )}

              {submitStatus === 'success' ? (
                <div className="text-center py-10">
                  <div className="mx-auto h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-[#49B6FF]" />
                  </div>
                  <h3 className="mt-4 text-2xl font-extrabold">You’re in.</h3>
                  <p className="mt-2 text-gray-300">We’ll reach out shortly.</p>
                </div>
              ) : (
                <div className="relative overflow-hidden">
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentStep * 100}%)` }}
                  >
                    {questions.map((q, idx) => (
                      <div key={q.id} className="w-full flex-shrink-0 px-1">
                        <div className="text-center mb-7">
                          <h3 className="text-2xl sm:text-3xl font-extrabold">{q.title}</h3>
                          {q.subtitle && <p className="mt-2 text-gray-400">{q.subtitle}</p>}
                        </div>

                        {/* Inputs */}
                        {q.type === 'checkbox' ? (
                          <div className="space-y-3">
                            {q.options?.map((opt) => (
                              <label
                                key={opt.value}
                                className="flex items-start gap-3 p-4 rounded-2xl border border-white/10 bg-[#0B0D10]/60 hover:bg-white/5 transition cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  name={q.id as string}
                                  value={opt.value}
                                  checked={(formData[q.id as keyof FormData] as string[])?.includes(opt.value) || false}
                                  onChange={handleInputChange}
                                  className="mt-1.5 h-5 w-5 accent-[#49B6FF]"
                                />
                                <div className="text-gray-200">
                                  <div className="font-bold">{opt.label}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : q.type === 'textarea' ? (
                          <div>
                            <textarea
                              id={q.id as string}
                              name={q.id as string}
                              value={formData[q.id as keyof FormData] as string}
                              onChange={handleInputChange}
                              rows={q.rows || 4}
                              className={`w-full px-4 py-3 rounded-2xl bg-[#0B0D10]/60 border ${
                                currentError && idx === currentStep ? 'border-red-500/60' : 'border-white/10'
                              } text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#49B6FF]/30 focus:border-[#49B6FF]/40 transition`}
                              placeholder={q.placeholder}
                            />
                            {currentError && idx === currentStep && (
                              <p className="mt-2 text-sm text-red-300">{currentError}</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-5">
                            {q.fields?.map((field) => (
                              <div key={field.id}>
                                <label className="block text-sm font-bold text-gray-200 mb-2">
                                  <field.icon className="inline h-4 w-4 mr-2 text-[#FFD24A]" />
                                  {field.label}
                                </label>

                                {field.id === 'phone' ? (
                                  <div className="flex">
                                    <select
                                      value={formData.countryCode}
                                      onChange={handleCountryCodeChange}
                                      className={`px-3 py-3 rounded-l-2xl bg-[#0B0D10]/60 border ${
                                        currentError && idx === currentStep ? 'border-red-500/60' : 'border-white/10'
                                      } border-r-0 text-white focus:outline-none`}
                                    >
                                      <option value="+1">🇨🇦 +1</option>
                                      <option value="+1">🇺🇸 +1</option>
                                      <option value="+44">🇬🇧 +44</option>
                                      <option value="+61">🇦🇺 +61</option>
                                    </select>

                                    <input
                                      type={field.type}
                                      id={field.id}
                                      name={field.id}
                                      value={formData[field.id]}
                                      onChange={handleInputChange}
                                      className={`flex-1 px-4 py-3 rounded-r-2xl bg-[#0B0D10]/60 border ${
                                        currentError && idx === currentStep ? 'border-red-500/60' : 'border-white/10'
                                      } text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#49B6FF]/30 focus:border-[#49B6FF]/40 transition`}
                                      placeholder={field.placeholder}
                                    />
                                  </div>
                                ) : (
                                  <input
                                    type={field.type}
                                    id={field.id}
                                    name={field.id}
                                    value={formData[field.id]}
                                    onChange={handleInputChange}
                                    className={`w-full px-4 py-3 rounded-2xl bg-[#0B0D10]/60 border ${
                                      currentError && idx === currentStep ? 'border-red-500/60' : 'border-white/10'
                                    } text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#49B6FF]/30 focus:border-[#49B6FF]/40 transition`}
                                    placeholder={field.placeholder}
                                  />
                                )}
                              </div>
                            ))}

                            {currentError && idx === currentStep && (
                              <p className="mt-1 text-sm text-red-300">{currentError}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nav */}
              {submitStatus !== 'success' && (
                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold transition ${
                      currentStep === 0
                        ? 'bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Previous
                  </button>

                  {currentStep === questions.length - 1 ? (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !isStepValid}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-extrabold bg-gradient-to-r from-[#FFD24A] to-[#49B6FF] text-black hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader className="h-5 w-5 animate-spin" />
                          Submitting
                        </>
                      ) : (
                        <>
                          Submit
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!isStepValid}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-extrabold bg-gradient-to-r from-[#FFD24A] to-[#49B6FF] text-black hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  )}
                </div>
              )}

              <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-gradient-to-br from-[#49B6FF]/16 via-[#FFD24A]/10 to-transparent blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <SubscriptionSection />

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5">
            <Sparkles className="h-4 w-4 text-[#FFD24A]" />
            <span className="text-sm text-gray-200">Infinite Wealth Solutions</span>
            <span className="text-sm text-gray-400">AI • Web • Automations</span>
          </div>

          <div className="text-sm text-gray-400">
            © {new Date().getFullYear()} Infinite Wealth Solutions. All rights reserved.
          </div>

          <div className="flex items-center gap-6">
            <Link to="/demo" className="text-gray-400 hover:text-white transition text-sm">
              Try Demo
            </Link>
            <Link to="/privacy-policy" className="text-gray-400 hover:text-white transition text-sm">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}