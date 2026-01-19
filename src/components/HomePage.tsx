import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Zap, TrendingUp, Phone, Mail, User, Building, MessageSquare, CheckCircle, AlertCircle, Loader, ArrowLeft, ArrowRight, Target, Calendar, Users } from 'lucide-react';
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

const GOLD_PRIMARY = '#C8A24A';

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
      title: 'Which services are you interested in?',
      subtitle: '(Select all that apply)',
      type: 'checkbox',
      icon: Target,
      required: true,
      options: [
        { value: 'ai-agents', label: 'AI Voice Agents - Automate calls and bookings' },
        { value: 'lead-generation', label: 'Lead Generation - Social media marketing, content creation, and customer acquisition' },
        { value: 'custom-websites', label: 'Custom Website Development - Professional, unique designs' }
      ]
    },
    {
      id: 'projectRequirements',
      title: 'Tell us about your project requirements',
      type: 'textarea',
      placeholder: 'Describe your specific needs, goals, timeline, and any special requirements...',
      rows: 4,
      icon: MessageSquare,
      required: true
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
          required: true
        },
        {
          id: 'email',
          label: 'Email',
          type: 'email',
          placeholder: 'your@email.com',
          icon: Mail,
          required: true
        },
        {
          id: 'phone',
          label: 'Phone Number',
          type: 'tel',
          placeholder: '(555) 123-4567',
          icon: Phone,
          required: true
        }
      ]
    }
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

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, countryCode: e.target.value }));
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < questions.length - 1) {
        setCurrentStep(currentStep + 1);
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
      const webhookUrl = 'https://hook.us1.make.com/';

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          submittedAt: new Date().toISOString(),
          source: 'homepage'
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Webhook submission error:', error);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-yellow-400/5 to-transparent rounded-full animate-pulse delay-1000"></div>
      </div>

      {/* UPDATED HEADER (icon + name top-left) */}
      <header className="relative z-10 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl border flex items-center justify-center bg-black/40"
                style={{
                  borderColor: 'rgba(200, 162, 74, 0.45)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.55)',
                }}
              >
                <img
                  src="/favicon.svg"
                  alt="IWS"
                  className="h-6 w-6"
                  style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.55))' }}
                />
              </div>

              <div className="leading-tight">
                <div className="text-white font-extrabold text-base sm:text-lg tracking-tight">
                  Infinite Wealth Solutions <span style={{ color: GOLD_PRIMARY }}>AI</span>
                </div>
                <div className="text-white/60 text-xs sm:text-sm font-semibold">
                  Try our AI Phone Agent
                </div>
              </div>
            </Link>

            <div />
          </div>
        </div>
      </header>

      {/* REST OF FILE UNCHANGED */}
      <section className="relative z-10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-8 leading-tight">
            Transform Your Business with{' '}
            <span className="bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
              Cutting-Edge Digital Solutions
            </span>
          </h2>

          <p className="text-lg sm:text-xl text-gray-300 mb-12 leading-relaxed">
            From AI-powered voice agents to high volume lead generation, and custom websites - we deliver premium digital solutions that drive results.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={() => {
                const leadCaptureSection = document.getElementById('lead-capture');
                if (leadCaptureSection) {
                  leadCaptureSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                  });
                } else {
                  window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: 'smooth'
                  });
                }
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/25 flex items-center justify-center space-x-3"
            >
              <MessageSquare className="h-6 w-6" />
              <span>Get a Package Quote</span>
            </button>

            <a
              href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-400/25 flex items-center justify-center space-x-3"
            >
              <Calendar className="h-6 w-6" />
              <span>Get Started</span>
            </a>
          </div>

          {/* ...the rest of your existing HomePage.tsx stays exactly the same... */}
          {/* Keep your existing lead form, sections, footer, etc. */}
        </div>
      </section>

      <SubscriptionSection />
    </div>
  );
}