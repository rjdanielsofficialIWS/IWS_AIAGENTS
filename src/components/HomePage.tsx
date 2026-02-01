import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain,
  Zap,
  TrendingUp,
  Phone,
  PhoneOff,
  Mail,
  User,
  Building,
  Globe,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Loader,
  ArrowLeft,
  ArrowRight,
  Target,
  Calendar,
  Users,
  X,
} from 'lucide-react';
import { SubscriptionSection } from './SubscriptionSection';
import Vapi from '@vapi-ai/web';
import { trackHighIntent } from '../lib/analytics';

interface FormData {
  name: string;
  email: string;
  phone: string;
  countryCode: string;

  // Step 1
  business: string; // Company Name
  websiteUrl: string; // optional but recommended

  // Step 2
  industryServices: string; // Industry + Services
}

interface EnhanceState {
  isEnhancing: boolean;
  hasEnhanced: boolean;
}

interface Question {
  id: keyof FormData | 'contactInfo' | 'companyAndWebsite';
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

// 🎨 Luxury Gold
const GOLD_PRIMARY = '#C8A24A';
const GOLD_HOVER = '#E3C36A';

// 📞 Vapi Phone Agent (Homepage floating)
const VAPI_PUBLIC_KEY = 'ebb2120b-ac56-4ce9-b1d5-17966931c665';
const HOME_VAPI_ASSISTANT_ID = '76efe9e0-957c-410a-9163-75acbceec45e';
const HOME_VAPI_FIRST_MESSAGE =
  'Infinite Wealth Solutions AI - Avery speaking, how may I help you?';

type PhoneModalMode = 'voice' | null;

export function HomePage() {
  const [bgOffset, setBgOffset] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    countryCode: '+1',
    business: '',
    websiteUrl: '',
    industryServices: '',
  });
  const [currentError, setCurrentError] = useState<string>('');
  const [isStepValid, setIsStepValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(
    null
  );
  const [createdAssistantId, setCreatedAssistantId] = useState<string | null>(
    null
  );
  const [enhanceState, setEnhanceState] = useState<EnhanceState>({
    isEnhancing: false,
    hasEnhanced: false,
  });

  // ✅ Floating Phone Agent Modal State
  const [phoneModal, setPhoneModal] = useState<PhoneModalMode>(null);
  const vapiRef = React.useRef<Vapi | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<
    'idle' | 'connecting' | 'live' | 'ended' | 'error'
  >('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const questions: Question[] = [
    {
      id: 'companyAndWebsite',
      title: 'Company name',
      subtitle: 'Add your website (optional, but recommended)',
      type: 'multi-input',
      icon: Building,
      required: true,
      fields: [
        {
          id: 'business',
          label: 'Company Name',
          type: 'input',
          placeholder: 'e.g., Riverside Plumbing',
          icon: Building,
          required: true,
        },
        {
          id: 'websiteUrl',
          label: 'Website URL (optional, recommended)',
          type: 'input',
          placeholder: 'e.g., https://yourwebsite.com',
          icon: Globe,
          required: false,
        },
      ],
    },
    {
      id: 'industryServices',
      title: 'Industry & services',
      type: 'textarea',
      placeholder:
        "Example:\nIndustry: Plumbing\nServices: Drain cleaning, water heaters, emergency calls, etc.",
      rows: 5,
      icon: Globe,
      required: true,
    },
    {
      id: 'contactInfo',
      title: '',
      type: 'multi-input',
      fields: [
        {
          id: 'name',
          label: 'Name',
          type: 'input',
          placeholder: 'Your full name',
          icon: User,
          required: true,
        },
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          placeholder: 'your@email.com',
          icon: Mail,
          required: true,
        },
        {
          id: 'phone',
          label: 'Phone Number',
          type: 'tel',
          placeholder: '(555) 123-4567',
          icon: Phone,
          required: true,
        },
      ],
    },
  ];

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\d\s\-\(\)]{7,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateWebsiteUrl = (url: string): boolean => {
    const v = (url || '').trim();
    if (!v) return true;

    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      // eslint-disable-next-line no-new
      new URL(withScheme);
      return true;
    } catch {
      return false;
    }
  };

  const validateCurrentStep = (): boolean => {
    const currentQuestion = questions[currentStep];
    let isValid = true;
    let error = '';

    if (currentQuestion.type === 'multi-input') {
      for (const field of currentQuestion.fields || []) {
        const value = (formData[field.id] || '').toString();

        // Respect optional fields
        if (field.required !== false && !value.trim()) {
          isValid = false;
          error = `${field.label} is required`;
          break;
        }

        // Validate formats (only if provided)
        if (field.id === 'email' && value.trim() && !validateEmail(value)) {
          isValid = false;
          error = 'Please enter a valid email address';
          break;
        }

        if (field.id === 'phone' && value.trim() && !validatePhone(value)) {
          isValid = false;
          error = 'Please enter a valid phone number (digits only)';
          break;
        }

        if (
          field.id === 'websiteUrl' &&
          value.trim() &&
          !validateWebsiteUrl(value)
        ) {
          isValid = false;
          error = 'Please enter a valid website URL (e.g., https://example.com)';
          break;
        }
      }
    } else if (currentQuestion.type === 'select' || currentQuestion.type === 'radio') {
      const value = formData[currentQuestion.id as keyof FormData];
      if (!value || value.trim() === '') {
        isValid = false;
        error = 'Please select an option';
      }
    } else if (currentQuestion.type === 'checkbox') {
      const value = formData[currentQuestion.id as keyof FormData] as unknown as string[];
      if (!value || value.length === 0) {
        isValid = false;
        error = 'Please select at least one option';
      }
    } else {
      const value = (formData[currentQuestion.id as keyof FormData] || '').toString();

      if (!value.trim()) {
        isValid = false;
        error = `${currentQuestion.title || 'This field'} is required`;
      } else if (currentQuestion.id === 'email' && !validateEmail(value)) {
        isValid = false;
        error = 'Please enter a valid email address';
      } else if (currentQuestion.id === 'phone' && !validatePhone(value)) {
        isValid = false;
        error = 'Please enter a valid phone number';
      } else if (currentQuestion.id === 'websiteUrl' && !validateWebsiteUrl(value)) {
        isValid = false;
        error = 'Please enter a valid website URL';
      }
    }

    setCurrentError(error);
    setIsStepValid(isValid);
    return isValid;
  };

  const validateAllSteps = (): boolean => {
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      if (question.type === 'multi-input') {
        for (const field of question.fields || []) {
          const value = (formData[field.id] || '').toString();

          if (field.required !== false && !value.trim()) return false;

          if (field.id === 'email' && value.trim() && !validateEmail(value)) return false;

          if (field.id === 'phone' && value.trim() && !validatePhone(value)) return false;

          if (field.id === 'websiteUrl' && value.trim() && !validateWebsiteUrl(value)) return false;
        }
      } else if (question.type === 'select' || question.type === 'radio') {
        const value = formData[question.id as keyof FormData];
        if (!value || value.trim() === '') return false;
      } else if (question.type === 'checkbox') {
        const value = formData[question.id as keyof FormData] as unknown as string[];
        if (!value || value.length === 0) return false;
      } else {
        const value = (formData[question.id as keyof FormData] || '').toString();
        if (!value.trim()) return false;

        if (question.id === 'email' && !validateEmail(value)) return false;
        if (question.id === 'phone' && !validatePhone(value)) return false;
        if (question.id === 'websiteUrl' && !validateWebsiteUrl(value)) return false;
      }
    }
    return true;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (e.target.type === 'checkbox') {
      const checkboxValue = (e.target as HTMLInputElement).value;
      const isChecked = (e.target as HTMLInputElement).checked;

      setFormData((prev) => ({
        ...prev,
        [name]: isChecked
          ? [...(prev[name as keyof FormData] as unknown as string[]), checkboxValue]
          : (prev[name as keyof FormData] as unknown as string[]).filter(
              (item) => item !== checkboxValue
            ),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, countryCode: e.target.value }));
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

  const normalizeWebsiteUrl = (url: string): string => {
    const v = (url || '').trim();
    if (!v) return '';
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  };

  const createVapiAssistantFromLead = async (data: FormData): Promise<string> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !anonKey) {
      throw new Error(
        'Missing Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).'
      );
    }

    const website = normalizeWebsiteUrl(data.websiteUrl);
    const websiteLine = website ? `Website: ${website}` : 'Website: Not provided';

    const systemPrompt = `
You are an inbound AI assistant for Infinite Wealth Solutions AI.

This business owner just submitted a lead form.

Company: ${data.business}
${websiteLine}

Industry & services:
${data.industryServices}

Your goals:
- Be friendly, confident, and concise (voice-call style).
- Ask 2–4 quick discovery questions to understand what they want and why now.
- Qualify them, then book a short onboarding call with our team.

Booking rules:
- Offer either tomorrow or the day after, and ask what time works.
- Confirm best callback number and email.
- If they hesitate, offer to text/email a quick recap and a calendar link.

Keep responses under ~2 sentences whenever possible.
    `.trim();

    const payload = {
      name: `${data.business} - Lead Assistant`,
      firstMessage: `Hey ${data.name || 'there'} — thanks for reaching out. What made you want to set this up right now?`,
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.5,
        messages: [{ role: 'system', content: systemPrompt }],
      },
    };

    const response = await fetch(`${supabaseUrl}/functions/v1/vapi-ai/assistants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || 'Failed to create Vapi assistant.');
    }

    const json = text ? JSON.parse(text) : {};
    const assistantId = json?.id;

    if (!assistantId) {
      throw new Error('Assistant created but no assistant id returned.');
    }

    return assistantId;
  };

  const handleSubmit = async () => {
    if (!validateAllSteps()) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);
    setCreatedAssistantId(null);
    // High-intent signal: user attempted to submit the lead form
    trackHighIntent({ name: 'form_submit', label: 'package_quote_form' });

    try {
      const assistantId = await createVapiAssistantFromLead(formData);

      setCreatedAssistantId(assistantId);
      setSubmitStatus('success');
      // High-intent conversion: lead successfully captured
      trackHighIntent({ name: 'form_success', label: 'package_quote_form' });

      setFormData({
        name: '',
        email: '',
        phone: '',
        countryCode: '+1',
        business: '',
        websiteUrl: '',
        industryServices: '',
      });
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    validateCurrentStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, formData]);

  // Subtle background motion on scroll (luxury gold glow)
  React.useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        setBgOffset(window.scrollY * 0.15);
        raf = 0;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // ✅ Start/Stop Vapi Call when phone modal opens/closes
  React.useEffect(() => {
    if (phoneModal !== 'voice') return;

    let cancelled = false;

    const startCall = async () => {
      try {
        setVoiceError(null);
        setVoiceStatus('connecting');

        try {
          vapiRef.current?.stop();
        } catch {}
        vapiRef.current = null;

        const vapi = new Vapi(VAPI_PUBLIC_KEY);
        vapiRef.current = vapi;

        vapi.on('call-start', () => {
          if (cancelled) return;
          setVoiceStatus('live');
        });

        vapi.on('call-end', () => {
          if (cancelled) return;
          setVoiceStatus('ended');
        });

        vapi.on('error', (e: any) => {
          if (cancelled) return;
          setVoiceStatus('error');
          setVoiceError(e?.message || 'Call error. Please try again.');
        });

        await vapi.start(HOME_VAPI_ASSISTANT_ID, {
          firstMessage: HOME_VAPI_FIRST_MESSAGE,
        });
      } catch (e: any) {
        if (cancelled) return;
        setVoiceStatus('error');
        setVoiceError(e?.message || 'Could not start call.');
      }
    };

    startCall();

    return () => {
      cancelled = true;
      try {
        vapiRef.current?.stop();
      } catch {}
      vapiRef.current = null;
    };
  }, [phoneModal]);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          transform: `translateY(${bgOffset}px)`,
          background:
            'radial-gradient(circle at 20% 20%, rgba(200,162,74,0.25), transparent 40%), radial-gradient(circle at 80% 30%, rgba(200,162,74,0.18), transparent 45%), radial-gradient(circle at 50% 80%, rgba(200,162,74,0.12), transparent 50%)',
        }}
      />
      <div className="relative z-10">
        {/* Header */}
        <header className="py-6 px-6 border-b border-gray-800/60">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(200,162,74,0.25), rgba(0,0,0,0.4))',
                  border: '1px solid rgba(200,162,74,0.25)',
                }}
              >
                <Brain className="h-6 w-6" style={{ color: GOLD_PRIMARY }} />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Infinite Wealth Solutions AI
              </span>
            </Link>

            <div className="flex items-center space-x-4">
              <button
                className="hidden sm:inline-flex px-4 py-2 rounded-xl font-medium border border-gray-700/60 hover:border-[#C8A24A]/40 transition-all"
                onClick={() => setPhoneModal('voice')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Talk to Avery
              </button>
              <a
                href="#pricing"
                className="px-4 py-2 rounded-xl font-semibold transition-all"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(200,162,74,0.95), rgba(227,195,106,0.9))',
                  color: '#000',
                }}
              >
                View Packages
              </a>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="pt-14 pb-10 px-6">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
                AI systems that help service businesses{' '}
                <span style={{ color: GOLD_PRIMARY }}>capture more leads</span>{' '}
                and <span style={{ color: GOLD_PRIMARY }}>close more sales</span>
                .
              </h1>
              <p className="mt-5 text-lg text-gray-300 max-w-xl">
                Stop losing money to missed calls and slow follow-ups. We build
                AI voice agents, lead capture, and automation that works 24/7.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  className="px-5 py-3 rounded-xl font-semibold transition-all inline-flex items-center"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(200,162,74,0.95), rgba(227,195,106,0.9))',
                    color: '#000',
                  }}
                  onClick={() => {
                    const el = document.getElementById('lead-form');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Get a Custom Quote
                  <ArrowRight className="h-5 w-5 ml-2" />
                </button>
                <button
                  className="px-5 py-3 rounded-xl font-semibold border border-gray-700/60 hover:border-[#C8A24A]/40 transition-all inline-flex items-center"
                  onClick={() => setPhoneModal('voice')}
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Talk to Avery
                </button>
              </div>

              <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/60">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" style={{ color: GOLD_PRIMARY }} />
                    <span className="font-semibold">Instant Response</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">
                    AI answers and qualifies leads immediately.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/60">
                  <div className="flex items-center space-x-2">
                    <TrendingUp
                      className="h-5 w-5"
                      style={{ color: GOLD_PRIMARY }}
                    />
                    <span className="font-semibold">More Bookings</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">
                    Capture after-hours + missed calls 24/7.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/60">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5" style={{ color: GOLD_PRIMARY }} />
                    <span className="font-semibold">Less Admin</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">
                    Follow-up automation replaces manual busywork.
                  </p>
                </div>
              </div>
            </div>

            {/* Lead Form */}
            <div
              id="lead-form"
              className="rounded-3xl border border-gray-800/60 bg-gray-950/60 p-6 sm:p-8 shadow-2xl shadow-black/40"
            >
              <h3 className="text-2xl sm:text-3xl font-bold mb-2">
                Get a custom quote
              </h3>
              <p className="text-gray-400 mb-8">
                Answer a few questions and we’ll build your best-fit system.
              </p>

              {submitStatus === 'success' && (
                <div className="mb-8 p-4 bg-green-500/10 border border-green-500/50 rounded-lg flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-green-300">
                      Thank you! Your submission has been received. We'll be in
                      touch soon.
                    </p>
                    {createdAssistantId && (
                      <p className="text-green-300/80 mt-1 text-sm">
                        Assistant created:{' '}
                        <span className="font-mono">
                          {createdAssistantId}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center space-x-3">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                  <p className="text-red-300">
                    Sorry, there was an error submitting your form. Please try
                    again.
                  </p>
                </div>
              )}

              {submitStatus !== 'success' && (
                <div className="mb-12">
                  <div className="flex items-center justify-center space-x-4 mb-6">
                    {questions.map((_, index) => (
                      <React.Fragment key={index}>
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                            index < currentStep
                              ? 'bg-green-500 text-white shadow-lg shadow-green-500/50'
                              : index === currentStep
                              ? 'bg-[#C8A24A] text-black shadow-lg shadow-black/40'
                              : 'bg-gray-600 text-gray-400'
                          }`}
                        >
                          {index < currentStep ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        {index < questions.length - 1 && (
                          <div
                            className={`w-8 h-1 transition-all duration-300 ${
                              index < currentStep ? 'bg-green-500' : 'bg-gray-600'
                            }`}
                          ></div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <p className="text-center text-gray-400 text-sm">
                    Step {currentStep + 1} of {questions.length}
                  </p>
                </div>
              )}

              {submitStatus === 'success' ? (
                <div className="text-center py-12">
                  <div className="bg-green-400/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-12 w-12 text-green-400" />
                  </div>
                  <h4 className="text-3xl font-bold mb-4">Thank You!</h4>
                  <p className="text-xl text-gray-300 mb-6">
                    Your submission has been received successfully.
                  </p>
                  <p className="text-gray-400">
                    We'll be in touch soon to discuss your custom solution.
                  </p>
                  {createdAssistantId && (
                    <p className="text-gray-500 mt-4 text-sm">
                      Assistant created:{' '}
                      <span className="font-mono">{createdAssistantId}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative overflow-hidden">
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentStep * 100}%)` }}
                  >
                    {questions.map((question, index) => (
                      <div key={question.id} className="w-full flex-shrink-0 px-4">
                        {question.title && (
                          <div className="text-center mb-8">
                            <h4 className="text-2xl sm:text-3xl font-bold mb-4">
                              {question.title}
                              {question.subtitle && (
                                <span className="block text-sm sm:text-base font-normal text-gray-400 mt-2">
                                  {question.subtitle}
                                </span>
                              )}
                            </h4>
                          </div>
                        )}

                        <div className="space-y-2 sm:space-y-4">
                          {question.type !== 'multi-input' && question.label && (
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                              {question.icon && (
                                <question.icon className="inline h-4 w-4 mr-2" />
                              )}
                              {question.label} *
                            </label>
                          )}

                          {question.type === 'multi-input' ? (
                            <div className="space-y-4 sm:space-y-6">
                              {question.fields?.map((field) => (
                                <div key={field.id}>
                                  <label className="block text-sm font-medium text-gray-300 mb-3">
                                    <field.icon className="inline h-4 w-4 mr-2" />
                                    {field.label}
                                    {field.required === false ? '' : ' *'}
                                  </label>

                                  {field.id === 'phone' ? (
                                    <div className="flex">
                                      <select
                                        value={formData.countryCode}
                                        onChange={handleCountryCodeChange}
                                        className={`px-3 py-3 bg-gray-900/50 border ${
                                          currentError && index === currentStep
                                            ? 'border-red-500'
                                            : 'border-gray-600'
                                        } border-r-0 rounded-l-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A] transition-all`}
                                      >
                                        <option value="+1">🇨🇦 +1</option>
                                        <option value="+1">🇺🇸 +1</option>
                                        <option value="+44">🇬🇧 +44</option>
                                        <option value="+33">🇫🇷 +33</option>
                                        <option value="+49">🇩🇪 +49</option>
                                        <option value="+61">🇦🇺 +61</option>
                                        <option value="+81">🇯🇵 +81</option>
                                        <option value="+86">🇨🇳 +86</option>
                                        <option value="+91">🇮🇳 +91</option>
                                        <option value="+55">🇧🇷 +55</option>
                                        <option value="+52">🇲🇽 +52</option>
                                        <option value="+34">🇪🇸 +34</option>
                                        <option value="+39">🇮🇹 +39</option>
                                        <option value="+31">🇳🇱 +31</option>
                                        <option value="+46">🇸🇪 +46</option>
                                        <option value="+47">🇳🇴 +47</option>
                                        <option value="+45">🇩🇰 +45</option>
                                        <option value="+41">🇨🇭 +41</option>
                                        <option value="+43">🇦🇹 +43</option>
                                        <option value="+32">🇧🇪 +32</option>
                                      </select>

                                      <input
                                        type={field.type}
                                        id={field.id}
                                        name={field.id}
                                        value={(formData[field.id] || '').toString()}
                                        onChange={handleInputChange}
                                        className={`flex-1 px-4 py-3 bg-gray-900/50 border ${
                                          currentError && index === currentStep
                                            ? 'border-red-500'
                                            : 'border-gray-600'
                                        } rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A] transition-all`}
                                        placeholder="555-123-4567"
                                      />
                                    </div>
                                  ) : (
                                    <input
                                      type={field.type}
                                      id={field.id}
                                      name={field.id}
                                      value={(formData[field.id] || '').toString()}
                                      onChange={handleInputChange}
                                      className={`w-full px-4 py-3 bg-gray-900/50 border ${
                                        currentError && index === currentStep
                                          ? 'border-red-500'
                                          : 'border-gray-600'
                                      } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A] transition-all`}
                                      placeholder={field.placeholder}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : question.type === 'checkbox' ? (
                            <div className="space-y-4">
                              {question.options?.map((option) => (
                                <label
                                  key={option.value}
                                  className="flex items-start space-x-3 cursor-pointer p-4 bg-gray-900/30 border border-gray-700/50 rounded-lg hover:border-[#C8A24A]/35 transition-all group"
                                >
                                  <input
                                    type="checkbox"
                                    name={question.id as string}
                                    value={option.value}
                                    checked={
                                      ((formData[question.id as keyof FormData] as unknown as string[])?.includes(
                                        option.value
                                      )) || false
                                    }
                                    onChange={handleInputChange}
                                    className="mt-1 w-5 h-5 text-[#C8A24A] bg-gray-900 border-gray-600 rounded focus:ring-[#C8A24A] focus:ring-2"
                                  />
                                  <div className="flex-1">
                                    <span className="text-white font-medium group-hover:text-[#E3C36A] transition-colors">
                                      {option.label}
                                    </span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <textarea
                              id={question.id as string}
                              name={question.id as string}
                              value={(formData[question.id as keyof FormData] || '').toString()}
                              onChange={handleInputChange}
                              rows={question.rows || 4}
                              className={`w-full px-4 py-3 bg-gray-900/50 border ${
                                currentError ? 'border-red-500' : 'border-gray-600'
                              } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A] transition-all resize-vertical`}
                              placeholder={question.placeholder}
                            />
                          )}

                          {currentError && index === currentStep && (
                            <p className="mt-2 text-sm text-red-400">{currentError}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {submitStatus !== 'success' && (
                <div className="flex justify-between items-center mt-4 pt-4 sm:mt-8 sm:pt-6 border-t border-gray-700/50">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all flex-shrink-0 ${
                      currentStep === 0
                        ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    <ArrowLeft className="h-5 w-5" />
                    <span>Previous</span>
                  </button>

                  {currentStep === questions.length - 1 ? (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !isStepValid}
                      className={`px-8 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 flex-shrink-0 ${
                        isSubmitting || !isStepValid
                          ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                          : 'bg-[#C8A24A] text-black hover:bg-[#E3C36A] shadow-lg shadow-black/40'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader className="h-5 w-5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit</span>
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!isStepValid}
                      className={`px-8 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 flex-shrink-0 ${
                        !isStepValid
                          ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                          : 'bg-[#C8A24A] text-black hover:bg-[#E3C36A] shadow-lg shadow-black/40'
                      }`}
                    >
                      <span>Next</span>
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <div id="pricing">
          <SubscriptionSection />
        </div>

        {/* Phone Modal */}
        {phoneModal === 'voice' && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl bg-gray-950 border border-gray-800/70 p-6 sm:p-8 relative">
              <button
                className="absolute top-4 right-4 p-2 rounded-xl border border-gray-800/70 hover:border-[#C8A24A]/40 transition-all"
                onClick={() => setPhoneModal(null)}
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-2xl font-bold mb-2">Talk to Avery</h3>
              <p className="text-gray-400 mb-6">
                Live voice demo (AI). Ask anything about the services.
              </p>

              <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/60">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Call status</span>
                  <span className="text-sm text-gray-400">{voiceStatus}</span>
                </div>
                {voiceError && (
                  <p className="mt-3 text-sm text-red-400">{voiceError}</p>
                )}
                <div className="mt-4 flex gap-3">
                  <button
                    className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(200,162,74,0.95), rgba(227,195,106,0.9))',
                      color: '#000',
                    }}
                    onClick={() => {
                      setVoiceError(null);
                      setVoiceStatus('idle');
                      setPhoneModal(null);
                      setTimeout(() => setPhoneModal('voice'), 50);
                    }}
                  >
                    Restart
                  </button>
                  <button
                    className="flex-1 px-4 py-3 rounded-xl font-semibold border border-gray-700/60 hover:border-[#C8A24A]/40 transition-all"
                    onClick={() => setPhoneModal(null)}
                  >
                    Close
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                If you don’t hear audio, check your browser mic permissions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}