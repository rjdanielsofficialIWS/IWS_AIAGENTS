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

// 🎨 Luxury Gold
const GOLD_PRIMARY = '#C8A24A';
const GOLD_HOVER = '#E3C36A';

// 📞 Vapi Phone Agent (Homepage floating)
const VAPI_PUBLIC_KEY = 'ebb2120b-ac56-4ce9-b1d5-17966931c665';
const HOME_VAPI_ASSISTANT_ID = '76efe9e0-957c-410a-9163-75acbceec45e';
const HOME_VAPI_FIRST_MESSAGE = 'Infinite Wealth Solutions AI - Avery speaking, how may I help you?';

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
    services: '',
    serviceInterest: [],
    projectRequirements: '',
  });
  const [currentError, setCurrentError] = useState<string>('');
  const [isStepValid, setIsStepValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [enhanceState, setEnhanceState] = useState<EnhanceState>({
    isEnhancing: false,
    hasEnhanced: false,
  });

  // ✅ Floating Phone Agent Modal State
  const [phoneModal, setPhoneModal] = useState<PhoneModalMode>(null);
  const vapiRef = React.useRef<Vapi | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'live' | 'ended' | 'error'>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const questions: Question[] = [
    {
      id: 'serviceInterest',
      title: 'Which services are you interested in?',
      subtitle: '(Select all that apply)',
      type: 'checkbox',
      icon: Target,
      required: true,
      options: [
        { value: 'ai-agents', label: 'AI Voice Agents - Automate calls and bookings' },
        { value: 'lead-generation', label: 'Lead Generation - Social media marketing, content creation, and customer acquisition' },
        { value: 'custom-websites', label: 'Custom Website Development - Professional, unique designs' },
      ],
    },
    {
      id: 'projectRequirements',
      title: 'Tell us about your project requirements',
      type: 'textarea',
      placeholder: 'Describe your specific needs, goals, timeline, and any special requirements...',
      rows: 4,
      icon: MessageSquare,
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

  const validateCurrentStep = (): boolean => {
    const currentQuestion = questions[currentStep];
    let isValid = true;
    let error = '';

    if (currentQuestion.type === 'multi-input') {
      for (const field of currentQuestion.fields || []) {
        const value = formData[field.id];
        if (!value.trim()) {
          isValid = false;
          error = `${field.label} is required`;
          break;
        } else if (field.id === 'email' && !validateEmail(value)) {
          isValid = false;
          error = 'Please enter a valid email address';
          break;
        } else if (field.id === 'phone' && !validatePhone(value)) {
          isValid = false;
          error = 'Please enter a valid phone number (digits only)';
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
      const value = formData[currentQuestion.id as keyof FormData] as string[];
      if (!value || value.length === 0) {
        isValid = false;
        error = 'Please select at least one option';
      }
    } else {
      const value = formData[currentQuestion.id as keyof FormData];
      if (!value.trim()) {
        isValid = false;
        error = `${currentQuestion.label} is required`;
      } else if (currentQuestion.id === 'email' && !validateEmail(value)) {
        isValid = false;
        error = 'Please enter a valid email address';
      } else if (currentQuestion.id === 'phone' && !validatePhone(value)) {
        isValid = false;
        error = 'Please enter a valid phone number';
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
          const value = formData[field.id];
          if (!value.trim()) return false;
          if (field.id === 'email' && !validateEmail(value)) return false;
          if (field.id === 'phone' && !validatePhone(value)) return false;
        }
      } else if (question.type === 'select' || question.type === 'radio') {
        const value = formData[question.id as keyof FormData];
        if (!value || value.trim() === '') return false;
      } else if (question.type === 'checkbox') {
        const value = formData[question.id as keyof FormData] as string[];
        if (!value || value.length === 0) return false;
      } else {
        const value = formData[question.id as keyof FormData];
        if (!value.trim()) return false;
        if (question.id === 'email' && !validateEmail(value)) return false;
        if (question.id === 'phone' && !validatePhone(value)) return false;
      }
    }
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (e.target.type === 'checkbox') {
      const checkboxValue = (e.target as HTMLInputElement).value;
      const isChecked = (e.target as HTMLInputElement).checked;

      setFormData((prev) => ({
        ...prev,
        [name]: isChecked
          ? [...(prev[name as keyof FormData] as string[]), checkboxValue]
          : (prev[name as keyof FormData] as string[]).filter((item) => item !== checkboxValue),
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
          timestamp: new Date().toISOString(),
        }),
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
    // High-intent signal: user attempted to submit the lead form
    trackHighIntent({ name: 'form_submit', label: 'package_quote_form' });

    try {
      const success = await submitToWebhook(formData);

      if (success) {
        setSubmitStatus('success');
        // High-intent conversion: lead successfully captured
        trackHighIntent({ name: 'form_success', label: 'package_quote_form' });
        setFormData({
          name: '',
          email: '',
          phone: '',
          countryCode: '+1',
          business: '',
          services: '',
          serviceInterest: [],
          projectRequirements: '',
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

        (vapi as any).on?.('error', (e: any) => {
          if (cancelled) return;
          setVoiceStatus('error');
          setVoiceError(e?.message || 'Voice error');
        });

        await vapi.start(HOME_VAPI_ASSISTANT_ID);

        // Say first message immediately (your exact line)
        try {
          await (vapi as any).say(HOME_VAPI_FIRST_MESSAGE, false);
        } catch {}
      } catch (e: any) {
        if (cancelled) return;
        setVoiceStatus('error');
        setVoiceError(e?.message || 'Failed to start voice');
      }
    };

    startCall();

    return () => {
      cancelled = true;
      try {
        vapiRef.current?.stop();
      } catch {}
      vapiRef.current = null;
      setVoiceStatus('idle');
      setVoiceError(null);
    };
  }, [phoneModal]);

  const closePhoneModal = () => {
    try {
      vapiRef.current?.stop();
    } catch {}
    vapiRef.current = null;
    setVoiceStatus('idle');
    setVoiceError(null);
    setPhoneModal(null);
  };

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{
        backgroundImage: `radial-gradient(1200px 600px at 50% ${-200 + bgOffset}px, rgba(200, 162, 74, 0.18), transparent 62%), linear-gradient(to bottom, #2a2a2a, #0b0b0b, #000)`,
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}
    >
      {/* Gold shimmer animation (homepage hero) */}
      <style>
        {`
          .gold-shimmer {
            background-image: linear-gradient(
              110deg,
              #b9892b 0%,
              #f7dc8a 20%,
              #ffffff 30%,
              #f1d27b 40%,
              #b9892b 60%,
              #f7dc8a 80%,
              #ffffff 90%,
              #b9892b 100%
            );
            background-size: 240% 100%;
            background-position: 0% 50%;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: goldShimmerSweep 4.8s ease-in-out infinite;
            filter: drop-shadow(0 0 10px rgba(240, 210, 124, 0.12));
          }

          @keyframes goldShimmerSweep {
            0% { background-position: 0% 50%; }
            55% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          @media (prefers-reduced-motion: reduce) {
            .gold-shimmer { animation: none; }
          }
        `}
      </style>

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(800px_520px_at_20%_20%,rgba(200,162,74,0.10),transparent_58%),radial-gradient(900px_560px_at_80%_70%,rgba(255,255,255,0.04),transparent_60%)]" />
      </div>

      <header className="relative z-10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center space-x-3 mb-6">
            </div>
          </div>
        </div>
      </header>

      <section className="relative z-10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-8 leading-tight">
            <span className="gold-shimmer block font-extrabold">Infinite Wealth Solutions</span>
            <span className="block mt-3 text-white font-bold">Transform your business with AI</span>
          </h2>

          <p className="text-lg sm:text-xl text-gray-300 mb-12 leading-relaxed">
            From AI-powered voice agents to high volume lead generation, and custom websites - we deliver premium digital solutions that drive results.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              data-track="cta"
              data-track-label="Get a Package Quote"
              onClick={() => {
                const leadCaptureSection = document.getElementById('lead-capture');
                if (leadCaptureSection) {
                  leadCaptureSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/25 flex items-center justify-center space-x-3"
            >
              <MessageSquare className="h-6 w-6" />
              <span>Get a Package Quote</span>
            </button>

            <a
              data-track="book"
              data-track-label="Get Started"
              href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-[#C8A24A] hover:bg-[#E3C36A] text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-black/30 flex items-center justify-center space-x-3"
            >
              <Calendar className="h-6 w-6" />
              <span>Get Started</span>
            </a>
          </div>

          <div
            id="lead-capture"
            className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 sm:p-12 max-w-3xl mx-auto"
          >
            <div className="text-center mb-12">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">Get Your Custom Solution Quote</h3>
              <p className="text-gray-300 text-base">Tell us about your project and we'll create the perfect solution for your business</p>
            </div>

            {submitStatus === 'success' && (
              <div className="mb-8 p-4 bg-green-500/10 border border-green-500/50 rounded-lg flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <p className="text-green-300">Thank you! Your submission has been received. We'll be in touch soon.</p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-red-400" />
                <p className="text-red-300">Sorry, there was an error submitting your form. Please try again.</p>
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
                        {index < currentStep ? <CheckCircle className="h-6 w-6" /> : index + 1}
                      </div>
                      {index < questions.length - 1 && (
                        <div className={`w-8 h-1 transition-all duration-300 ${index < currentStep ? 'bg-green-500' : 'bg-gray-600'}`}></div>
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
                <p className="text-xl text-gray-300 mb-6">Your submission has been received successfully.</p>
                <p className="text-gray-400">We'll be in touch soon to discuss your custom solution.</p>
              </div>
            ) : (
              <div className="relative overflow-hidden">
                <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentStep * 100}%)` }}>
                  {questions.map((question, index) => (
                    <div key={question.id} className="w-full flex-shrink-0 px-4">
                      {question.title && (
                        <div className="text-center mb-8">
                          <h4 className="text-2xl sm:text-3xl font-bold mb-4">
                            {question.title}
                            {question.subtitle && (
                              <span className="block text-sm sm:text-base font-normal text-gray-400 mt-2">{question.subtitle}</span>
                            )}
                          </h4>
                        </div>
                      )}

                      <div className="space-y-2 sm:space-y-4">
                        {question.type !== 'multi-input' && question.label && (
                          <label className="block text-sm font-medium text-gray-300 mb-3">
                            {question.icon && <question.icon className="inline h-4 w-4 mr-2" />}
                            {question.label} *
                          </label>
                        )}

                        {question.type === 'multi-input' ? (
                          <div className="space-y-4 sm:space-y-6">
                            {question.fields?.map((field) => (
                              <div key={field.id}>
                                <label className="block text-sm font-medium text-gray-300 mb-3">
                                  <field.icon className="inline h-4 w-4 mr-2" />
                                  {field.label} *
                                </label>

                                {field.id === 'phone' ? (
                                  <div className="flex">
                                    <select
                                      value={formData.countryCode}
                                      onChange={handleCountryCodeChange}
                                      className={`px-3 py-3 bg-gray-900/50 border ${
                                        currentError && index === currentStep ? 'border-red-500' : 'border-gray-600'
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
                                      value={formData[field.id]}
                                      onChange={handleInputChange}
                                      className={`flex-1 px-4 py-3 bg-gray-900/50 border ${
                                        currentError && index === currentStep ? 'border-red-500' : 'border-gray-600'
                                      } rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A] transition-all`}
                                      placeholder="555-123-4567"
                                    />
                                  </div>
                                ) : (
                                  <input
                                    type={field.type}
                                    id={field.id}
                                    name={field.id}
                                    value={formData[field.id]}
                                    onChange={handleInputChange}
                                    className={`w-full px-4 py-3 bg-gray-900/50 border ${
                                      currentError && index === currentStep ? 'border-red-500' : 'border-gray-600'
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
                                  checked={(formData[question.id as keyof FormData] as string[])?.includes(option.value) || false}
                                  onChange={handleInputChange}
                                  className="mt-1 w-5 h-5 text-[#C8A24A] bg-gray-900 border-gray-600 rounded focus:ring-[#C8A24A] focus:ring-2"
                                />
                                <div className="flex-1">
                                  <span className="text-white font-medium group-hover:text-[#E3C36A] transition-colors">{option.label}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <textarea
                            id={question.id as string}
                            name={question.id as string}
                            value={formData[question.id as keyof FormData]}
                            onChange={handleInputChange}
                            rows={question.rows || 4}
                            className={`w-full px-4 py-3 bg-gray-900/50 border ${
                              currentError ? 'border-red-500' : 'border-gray-600'
                            } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A] transition-all resize-vertical`}
                            placeholder={question.placeholder}
                          />
                        )}

                        {currentError && index === currentStep && <p className="mt-2 text-sm text-red-400">{currentError}</p>}
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
                    currentStep === 0 ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed' : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Previous</span>
                </button>

                {currentStep === questions.length - 1 ? (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isStepValid}
                    className="bg-[#C8A24A] hover:bg-[#E3C36A] text-black font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-black/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center text-center flex-shrink-0 min-w-0"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        <span className="hidden sm:inline">Submitting...</span>
                        <span className="sm:hidden">Submitting</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Get Your Custom Solution</span>
                        <span className="sm:hidden">Get Quote</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!isStepValid}
                    className="bg-[#C8A24A] hover:bg-[#E3C36A] text-black font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-black/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 flex-shrink-0"
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

      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Our{' '}
              <span className="bg-gradient-to-r from-[#C8A24A] to-[#E3C36A] bg-clip-text text-transparent">Premium Services</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Professional digital solutions designed to elevate your business and drive real results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-[#C8A24A]/45 transition-all duration-300 group">
              <div className="bg-[#C8A24A]/10 w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#C8A24A]/20 transition-colors">
                <Brain className="h-10 w-10 text-[#C8A24A]" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">AI Voice Agents</h3>
              <p className="text-gray-400 text-center leading-relaxed">
                Intelligent AI agents that handle calls, bookings, customer service, and sales conversations with human-like natural speech and understanding.
              </p>
              <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Phone className="h-4 w-4" />
                  <span>24/7 Availability</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Auto Booking</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-[#C8A24A]/45 transition-all duration-300 group">
              <div className="bg-[#C8A24A]/10 w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#C8A24A]/20 transition-colors">
                <TrendingUp className="h-10 w-10 text-[#C8A24A]" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">Lead Generation</h3>
              <p className="text-gray-400 text-center leading-relaxed">
                Drive qualified leads and grow your customer base through strategic social media marketing, targeted advertising, content creation, and comprehensive digital marketing campaigns.
              </p>
              <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>Targeted Audience</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>Growth Focused</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-[#C8A24A]/45 transition-all duration-300 group">
              <div className="bg-[#C8A24A]/10 w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#C8A24A]/20 transition-colors">
                <TrendingUp className="h-10 w-10 text-[#C8A24A]" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">Custom Website Development</h3>
              <p className="text-gray-400 text-center leading-relaxed">
                Unique, professionally designed websites built from scratch with no templates. Get a website that truly represents your brand and converts visitors.
              </p>
              <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Building className="h-4 w-4" />
                  <span>Custom Design</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Zap className="h-4 w-4" />
                  <span>High Performance</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-16">
            <p className="text-lg text-gray-300 mb-8">Ready to transform your business with our premium digital solutions?</p>
            <a
              href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#C8A24A] hover:bg-[#E3C36A] text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/30 flex items-center justify-center space-x-3 mx-auto"
            >
              <Calendar className="h-6 w-6" />
              <span>Schedule Your Consultation</span>
            </a>
          </div>
        </div>
      </section>

      <SubscriptionSection />

      <footer className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Zap className="h-8 w-8 text-[#C8A24A]" />
            <h3 className="text-2xl font-bold bg-gradient-to-r from-[#C8A24A] to-[#E3C36A] bg-clip-text text-transparent">
              Infinite Wealth Solutions
            </h3>
          </div>
          <p className="text-gray-400 mb-3">
            © 2024 Infinite Wealth Solutions. Transforming businesses with premium digital solutions.
          </p>

          <div className="flex items-center justify-center gap-6">
            <Link to="/demo" className="text-gray-500 hover:text-gray-400 text-xs transition-colors">
              Try AI Agent Demos
            </Link>

            <Link to="/privacy-policy" className="text-gray-500 hover:text-gray-400 text-xs transition-colors">
              Privacy Policy
            </Link>

            {/* ✅ Added */}
            <Link to="/terms-and-conditions" className="text-gray-500 hover:text-gray-400 text-xs transition-colors">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </footer>

      {/* ✅ Floating "Try Our AI Phone Agent" (Bottom Right) */}
      <div className="fixed bottom-5 right-5 z-[60]">
        <button
          onClick={() => setPhoneModal('voice')}
          className="group flex items-center gap-3 rounded-2xl px-4 py-3 border backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition"
          style={{
            borderColor: 'rgba(200, 162, 74, 0.40)',
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(227, 195, 106, 0.65)';
            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(200, 162, 74, 0.40)';
            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.35)';
          }}
        >
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(200, 162, 74, 0.18)' }}
          >
            <Phone className="h-5 w-5" style={{ color: GOLD_HOVER }} />
          </div>

          <div className="text-left">
            <div className="text-sm font-bold leading-tight" style={{ color: GOLD_HOVER }}>
              Try Our AI Phone Agent
            </div>
            <div className="text-[11px] text-gray-300 leading-tight">Avery answers instantly</div>
          </div>
        </button>
      </div>

      {/* ✅ Phone Agent Modal */}
      {phoneModal === 'voice' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" data-homephone-modal="true">
          <div className="bg-black/80 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.75)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
              <div className="font-bold">Try Our AI Phone Agent</div>
              <button className="text-gray-300 hover:text-white" onClick={closePhoneModal} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="text-center min-h-[420px] flex flex-col items-center justify-center">
                <h3 className="text-xl font-bold mb-2" style={{ color: GOLD_PRIMARY }}>
                  Avery — AI Voice Agent
                </h3>

                <p className="text-gray-300">
                  {voiceStatus === 'connecting' && 'Connecting… (you may see a mic permission prompt)'}
                  {voiceStatus === 'live' && 'Live — speak normally.'}
                  {voiceStatus === 'ended' && 'Call ended.'}
                  {voiceStatus === 'error' && 'Could not start the call.'}
                  {voiceStatus === 'idle' && 'Ready.'}
                </p>

                {voiceError && <p className="mt-2 text-sm text-red-300">{voiceError}</p>}

                {/* Red hang-up button */}
                <button
                  className="mt-8 w-28 h-28 rounded-full transition flex items-center justify-center"
                  style={{
                    backgroundColor: '#DC2626',
                    boxShadow: '0 18px 60px rgba(0,0,0,0.6)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#B91C1C')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#DC2626')}
                  onClick={() => {
                    try {
                      vapiRef.current?.stop();
                    } catch {}
                    setVoiceStatus('ended');
                  }}
                  aria-label="End call"
                >
                  <PhoneOff className="h-10 w-10 text-white" />
                </button>

                <p className="mt-6 text-xs text-gray-400 max-w-sm">
                  Your mic may prompt for permission. If it doesn’t connect, close and try again.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}