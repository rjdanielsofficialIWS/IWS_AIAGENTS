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
  businessName: string;
  businessType: string;
  currentWebsite: string;
  biggestProblem: string;
  monthlyRevenue: string;
  readyTimeline: string;
  howHeard: string;
}

interface FormStep {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const formSteps: FormStep[] = [
  {
    title: 'Contact Info',
    subtitle: "Let's start with the basics",
    icon: <User className="h-6 w-6" />,
  },
  {
    title: 'Business Details',
    subtitle: 'Tell us about your business',
    icon: <Building className="h-6 w-6" />,
  },
  {
    title: 'Current Setup',
    subtitle: 'What are you working with now?',
    icon: <Target className="h-6 w-6" />,
  },
  {
    title: 'Goals & Timeline',
    subtitle: 'When do you want to get started?',
    icon: <Calendar className="h-6 w-6" />,
  },
];

const businessTypes = [
  'Plumbing',
  'HVAC',
  'Electrical',
  'Roofing',
  'Landscaping',
  'Cleaning',
  'Pest Control',
  'Junk Removal',
  'Auto Repair',
  'Real Estate',
  'Insurance',
  'Other Service Business',
];

const monthlyRevenueOptions = [
  'Under $5,000',
  '$5,000 - $15,000',
  '$15,000 - $30,000',
  '$30,000 - $50,000',
  '$50,000+',
];

const timelineOptions = [
  'ASAP (This week)',
  'Within 2 weeks',
  'Within 30 days',
  'Within 60 days',
  'Just exploring',
];

const howHeardOptions = [
  'Facebook/Instagram',
  'Google Search',
  'Referral',
  'LinkedIn',
  'YouTube/TikTok',
  'Other',
];

export function HomePage() {
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [vapiCallActive, setVapiCallActive] = useState(false);
  const [vapiStatus, setVapiStatus] = useState<'idle' | 'connecting' | 'active' | 'ending'>('idle');

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    businessType: '',
    currentWebsite: '',
    biggestProblem: '',
    monthlyRevenue: '',
    readyTimeline: '',
    howHeard: '',
  });

  const openModal = () => {
    setShowModal(true);
    setCurrentStep(0);
    setSubmitSuccess(false);
    setSubmitError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentStep(0);
    setSubmitSuccess(false);
    setSubmitError('');
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = () => {
    if (currentStep === 0) {
      return formData.name && formData.email && formData.phone;
    }
    if (currentStep === 1) {
      return formData.businessName && formData.businessType;
    }
    if (currentStep === 2) {
      return formData.biggestProblem && formData.monthlyRevenue;
    }
    if (currentStep === 3) {
      return formData.readyTimeline && formData.howHeard;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep() && currentStep < formSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const submitForm = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Track high-intent lead
      trackHighIntent(formData.email, formData.businessName);

      const response = await fetch('https://pmdbkepxbxrnbhshjrel.supabase.co/functions/v1/lead-capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to submit form');
      }

      setSubmitSuccess(true);

      // Auto-close after success
      setTimeout(() => {
        closeModal();
        setFormData({
          name: '',
          email: '',
          phone: '',
          businessName: '',
          businessType: '',
          currentWebsite: '',
          biggestProblem: '',
          monthlyRevenue: '',
          readyTimeline: '',
          howHeard: '',
        });
      }, 2500);
    } catch (err: any) {
      setSubmitError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startVapiCall = async () => {
    try {
      setVapiStatus('connecting');

      const vapi = new Vapi(import.meta.env.VITE_VAPI_PUBLIC_KEY);

      vapi.on('call-start', () => {
        setVapiCallActive(true);
        setVapiStatus('active');
      });

      vapi.on('call-end', () => {
        setVapiCallActive(false);
        setVapiStatus('idle');
      });

      vapi.on('error', () => {
        setVapiCallActive(false);
        setVapiStatus('idle');
      });

      await vapi.start(import.meta.env.VITE_VAPI_ASSISTANT_ID);

      // Optional: Store instance on window for later stop
      (window as any).__vapi = vapi;
    } catch (e) {
      setVapiStatus('idle');
    }
  };

  const stopVapiCall = async () => {
    try {
      setVapiStatus('ending');
      const vapi = (window as any).__vapi as Vapi | undefined;
      if (vapi) {
        await vapi.stop();
      }
      setVapiCallActive(false);
      setVapiStatus('idle');
    } catch (e) {
      setVapiCallActive(false);
      setVapiStatus('idle');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Email Address *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                placeholder="john@business.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Phone Number *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Business Name *</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                placeholder="ABC Plumbing"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Business Type *</label>
              <select
                value={formData.businessType}
                onChange={(e) => handleInputChange('businessType', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              >
                <option value="">Select your business type</option>
                {businessTypes.map((type) => (
                  <option key={type} value={type} className="bg-gray-800">
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Current Website (optional)</label>
              <input
                type="url"
                value={formData.currentWebsite}
                onChange={(e) => handleInputChange('currentWebsite', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                What's your biggest challenge right now? *
              </label>
              <textarea
                value={formData.biggestProblem}
                onChange={(e) => handleInputChange('biggestProblem', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 resize-none"
                placeholder="Missing calls? Not enough leads? Website looks outdated? Tell us what's holding you back..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Monthly Revenue Range *</label>
              <select
                value={formData.monthlyRevenue}
                onChange={(e) => handleInputChange('monthlyRevenue', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              >
                <option value="">Select revenue range</option>
                {monthlyRevenueOptions.map((option) => (
                  <option key={option} value={option} className="bg-gray-800">
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">When are you ready to start? *</label>
              <select
                value={formData.readyTimeline}
                onChange={(e) => handleInputChange('readyTimeline', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              >
                <option value="">Select timeline</option>
                {timelineOptions.map((option) => (
                  <option key={option} value={option} className="bg-gray-800">
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">How did you hear about us? *</label>
              <select
                value={formData.howHeard}
                onChange={(e) => handleInputChange('howHeard', e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              >
                <option value="">Select option</option>
                {howHeardOptions.map((option) => (
                  <option key={option} value={option} className="bg-gray-800">
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-200">
                  <p className="font-medium text-yellow-400 mb-1">What happens next?</p>
                  <p>
                    After you submit, we'll review your info and reach out within 24 hours to schedule a quick call and
                    show you exactly how we can help.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/10 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-yellow-400/10 to-transparent rounded-full animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl">
              <Brain className="h-6 w-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Infinite Wealth Solutions AI</h1>
              <p className="text-xs text-gray-400">AI-Powered Business Growth</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-gray-300 hover:text-white transition-colors">
              Services
            </a>
            <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">
              Pricing
            </a>
            <a href="#results" className="text-gray-300 hover:text-white transition-colors">
              Results
            </a>
            <button
              onClick={openModal}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold px-6 py-2 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-105"
            >
              Get Started
            </button>
          </div>

          <button
            onClick={openModal}
            className="md:hidden bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold px-4 py-2 rounded-xl"
          >
            Start
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-yellow-400 font-medium">AI Automation That Actually Works</span>
              </div>

              <h2 className="text-5xl lg:text-6xl font-bold leading-tight">
                Stop Losing Money to{' '}
                <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                  Missed Calls
                </span>{' '}
                & Bad Follow-Up
              </h2>

              <p className="text-xl text-gray-300 leading-relaxed">
                We install realistic AI phone agents and automation systems that answer every call, capture every lead,
                and follow up instantly — so you can book more jobs without hiring more staff.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={openModal}
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold px-8 py-4 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-105 hover:shadow-xl hover:shadow-yellow-400/25"
                >
                  Get Your Free Demo
                </button>
                <Link
                  to="/demo"
                  className="border border-gray-600 text-white font-semibold px-8 py-4 rounded-xl hover:border-gray-500 hover:bg-white/5 transition-all text-center"
                >
                  Try Live AI Agent
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-800">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">24/7</div>
                  <div className="text-sm text-gray-400">Call Answering</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">Instant</div>
                  <div className="text-sm text-gray-400">Lead Follow-Up</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">More</div>
                  <div className="text-sm text-gray-400">Booked Jobs</div>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative">
              <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Live Call Dashboard</h3>
                    <div className="flex items-center gap-2 text-sm text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      Active
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-gray-800/50 rounded-2xl p-4">
                      <Phone className="h-8 w-8 text-green-400" />
                      <div className="flex-1">
                        <div className="font-medium">Incoming Call</div>
                        <div className="text-sm text-gray-400">Customer needs emergency service</div>
                      </div>
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>

                    <div className="flex items-center gap-4 bg-gray-800/50 rounded-2xl p-4">
                      <MessageSquare className="h-8 w-8 text-blue-400" />
                      <div className="flex-1">
                        <div className="font-medium">AI Follow-Up Sent</div>
                        <div className="text-sm text-gray-400">Appointment booked automatically</div>
                      </div>
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>

                    <div className="flex items-center gap-4 bg-gray-800/50 rounded-2xl p-4">
                      <TrendingUp className="h-8 w-8 text-yellow-400" />
                      <div className="flex-1">
                        <div className="font-medium">Revenue Captured</div>
                        <div className="text-sm text-gray-400">$450 job secured</div>
                      </div>
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-400/10 to-blue-500/10 border border-yellow-400/20 rounded-2xl p-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-400 mb-2">+$12,400</div>
                      <div className="text-sm text-gray-300">Extra revenue this month from saved leads</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-yellow-400 text-black px-4 py-2 rounded-2xl font-semibold text-sm animate-bounce">
                New Lead!
              </div>
              <div className="absolute -bottom-4 -left-4 bg-green-500 text-black px-4 py-2 rounded-2xl font-semibold text-sm animate-bounce delay-500">
                Booked!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What We Build For You</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Complete automation systems that turn missed opportunities into booked appointments
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 hover:border-yellow-400/30 transition-all">
              <div className="p-3 bg-yellow-400/10 rounded-2xl w-fit mb-6">
                <Phone className="h-8 w-8 text-yellow-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4">AI Phone Agent</h3>
              <p className="text-gray-300 mb-6">
                Answers every call 24/7, qualifies leads, books appointments, and handles customer questions like a real
                person.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-200">Never miss another call</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-200">Books jobs automatically</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-200">Sounds human & natural</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 hover:border-blue-400/30 transition-all">
              <div className="p-3 bg-blue-500/10 rounded-2xl w-fit mb-6">
                <Mail className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Instant Follow-Up</h3>
              <p className="text-gray-300 mb-6">
                Automated SMS and email sequences that follow up instantly and keep prospects engaged until they book.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-200">Instant response to leads</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-200">Multi-touch sequences</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-200">Higher conversion rates</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 hover:border-green-400/30 transition-all">
              <div className="p-3 bg-green-500/10 rounded-2xl w-fit mb-6">
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Growth Dashboard</h3>
              <p className="text-gray-300 mb-6">
                Track every lead, call, booking, and revenue captured. See exactly what's working and scale it up.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-200">Real-time reporting</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-200">Lead tracking & scoring</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-gray-200">ROI visibility</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section id="results" className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">The Problem We Solve</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Most service businesses lose thousands every month to simple problems
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <PhoneOff className="h-10 w-10 text-red-400" />
                  <h3 className="text-2xl font-bold text-red-400">Without AI Automation</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-200">Missed calls go to voicemail (and customers call competitors)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-200">Slow follow-up means leads go cold</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-200">Staff overwhelmed with calls and admin work</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-200">No tracking of what's working</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-green-500/10 border border-green-500/20 rounded-3xl p-8">
                <div className="flex items-center gap-4 mb-6">
                  <Brain className="h-10 w-10 text-green-400" />
                  <h3 className="text-2xl font-bold text-green-400">With Our AI System</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-200">Every call answered instantly, 24/7</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-200">Automated follow-up sequences that convert</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-200">Staff focuses on jobs, not admin</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-200">Full visibility into leads and revenue</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center mt-16">
            <button
              onClick={openModal}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold px-10 py-4 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-105"
            >
              Stop Losing Leads Today
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <SubscriptionSection onBookCall={openModal} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-yellow-400/10 to-blue-500/10 border border-yellow-400/20 rounded-3xl p-12">
            <h2 className="text-4xl font-bold mb-6">Ready to Stop Missing Money?</h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Get a free demo of our AI phone agent and see exactly how it would work for your business.
            </p>
            <button
              onClick={openModal}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold px-10 py-4 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-105 hover:shadow-xl hover:shadow-yellow-400/25"
            >
              Get Your Free Demo Now
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Infinite Wealth Solutions AI. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs">
            Helping service businesses capture more leads and grow faster with premium digital solutions.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Link to="/demo" className="text-gray-500 hover:text-gray-400 text-xs transition-colors">
              Try AI Agent Demos
            </Link>

            <Link to="/privacy-policy" className="text-gray-500 hover:text-gray-400 text-xs transition-colors">
              Privacy Policy
            </Link>

            <Link to="/terms-and-conditions" className="text-gray-500 hover:text-gray-400 text-xs transition-colors">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </footer>

      {/* ✅ Floating "Try Our AI Phone Agent" (Bottom Right) */}
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={() => {
            if (vapiCallActive) stopVapiCall();
            else startVapiCall();
          }}
          className={`flex items-center gap-3 rounded-2xl px-5 py-4 shadow-xl border transition-all ${
            vapiCallActive
              ? 'bg-red-500/15 border-red-500/30 hover:bg-red-500/20'
              : 'bg-gradient-to-r from-yellow-400/15 to-blue-500/15 border-yellow-400/30 hover:bg-white/10'
          }`}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              vapiCallActive ? 'bg-red-500/20' : 'bg-yellow-400/20'
            }`}
          >
            {vapiStatus === 'connecting' ? (
              <Loader className="h-5 w-5 text-yellow-300 animate-spin" />
            ) : vapiCallActive ? (
              <PhoneOff className="h-5 w-5 text-red-300" />
            ) : (
              <Phone className="h-5 w-5 text-yellow-300" />
            )}
          </div>

          <div className="text-left leading-tight">
            <div className="text-sm font-semibold text-white">
              {vapiCallActive ? 'End AI Call' : 'Try Our AI Phone Agent'}
            </div>
            <div className="text-xs text-gray-300">
              {vapiStatus === 'connecting'
                ? 'Connecting...'
                : vapiCallActive
                ? 'Live call in progress'
                : 'Talk to it right now'}
            </div>
          </div>
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal}></div>

          <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 to-black border border-gray-700/50 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-8 border-b border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold">Get Your Free Demo</h3>
                  <p className="text-gray-400">Step {currentStep + 1} of {formSteps.length}</p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-2">
                {formSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`flex-1 h-2 rounded-full transition-all ${
                      index <= currentStep ? 'bg-yellow-400' : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>

              {/* Step Info */}
              <div className="flex items-center gap-4 mt-6">
                <div className="p-3 bg-yellow-400/10 rounded-2xl text-yellow-400">
                  {formSteps[currentStep].icon}
                </div>
                <div>
                  <h4 className="text-lg font-semibold">{formSteps[currentStep].title}</h4>
                  <p className="text-gray-400 text-sm">{formSteps[currentStep].subtitle}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              {submitSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <h4 className="text-2xl font-bold mb-2">Success!</h4>
                  <p className="text-gray-300">We'll reach out within 24 hours to schedule your demo.</p>
                </div>
              ) : (
                <>
                  {renderStepContent()}

                  {submitError && (
                    <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="h-5 w-5" />
                        <span className="text-sm">{submitError}</span>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
                    <button
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-700 text-gray-300 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>

                    {currentStep === formSteps.length - 1 ? (
                      <button
                        onClick={submitForm}
                        disabled={!validateStep() || isSubmitting}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold hover:from-yellow-500 hover:to-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit
                            <CheckCircle className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={nextStep}
                        disabled={!validateStep()}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold hover:from-yellow-500 hover:to-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}