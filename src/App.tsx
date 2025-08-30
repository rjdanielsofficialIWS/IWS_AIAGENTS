import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Brain, Zap, TrendingUp, Phone, Mail, User, Building, Briefcase, MessageSquare, CheckCircle, AlertCircle, Loader, Lock, ArrowLeft, ArrowRight, Target, Calendar } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { AssistantsList } from './components/assistants/AssistantsList';
import { AssistantBuilder } from './components/assistants/AssistantBuilder';
import { SubscriptionSection } from './components/SubscriptionSection';
import { OnboardingBookingPage } from './components/OnboardingBookingPage';
import { VapiAssistant } from './types/vapi';
import { supabase } from './services/vapiAI';

interface FormData {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  business: string;
  services: string;
  aiRequirements: string;
}

interface EnhanceState {
  isEnhancing: boolean;
  hasEnhanced: boolean;
}

interface Question {
  id: keyof FormData | 'contactInfo';
  title: string;
  label?: string;
  type: 'input' | 'textarea' | 'multi-input';
  placeholder?: string;
  rows?: number;
  icon?: React.ComponentType<any>;
  required?: boolean;
  fields?: {
    id: keyof FormData;
    label: string;
    type: 'input' | 'email' | 'tel';
    placeholder: string;
    icon: React.ComponentType<any>;
    required: boolean;
  }[];
}

function AppContent() {
  const { user, loading } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentAssistant, setCurrentAssistant] = useState<VapiAssistant | null>(null);
  const [showAssistantBuilder, setShowAssistantBuilder] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    countryCode: '+1',
    business: '',
    services: '',
    aiRequirements: ''
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
      id: 'business',
      title: 'What\'s your company name?',
      type: 'textarea',
      placeholder: 'Enter your company name...',
      rows: 4,
      icon: Building,
      required: true
    },
    {
      id: 'services',
      title: 'What services do you provide?',
      type: 'textarea',
      placeholder: 'List your main services, products, or offerings...',
      rows: 4,
      icon: Briefcase,
      required: true
    },
    {
      id: 'aiRequirements',
      title: 'What exactly do you want your AI Sales Agent to do for you?',
      type: 'textarea',
      placeholder: 'Be specific about tasks, goals, processes, follow-up procedures, CRM integration needs, etc...',
      rows: 6,
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

  const enhancePrompt = async () => {
    if (!formData.aiRequirements.trim()) {
      return;
    }

    setEnhanceState({ isEnhancing: true, hasEnhanced: false });

    try {
      // For now, just return the original text
      const enhancedText = formData.aiRequirements;
      setFormData(prev => ({ ...prev, aiRequirements: enhancedText }));
      setEnhanceState({ isEnhancing: false, hasEnhanced: true });
    } catch (error) {
      setEnhanceState({ isEnhancing: false, hasEnhanced: false });
      setCurrentError('Failed to enhance prompt. Please try again.');
    }
  };

  const validateCurrentStep = (): boolean => {
    const currentQuestion = questions[currentStep];
    let isValid = true;
    let error = '';

    if (currentQuestion.type === 'multi-input') {
      // Validate all fields in the multi-input step
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
    } else {
      // Validate single field step
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
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validate current step when user types
    setTimeout(() => {
      validateCurrentStep();
    }, 100);
  };

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, countryCode: e.target.value }));
    // Validate current step when country code changes
    setTimeout(() => {
      validateCurrentStep();
    }, 100);
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < questions.length - 1) {
        setCurrentStep(currentStep + 1);
        setCurrentError('');
        // Validate the new step
        setTimeout(() => {
          validateCurrentStep();
        }, 100);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setCurrentError('');
      // Validate the previous step
      setTimeout(() => {
        validateCurrentStep();
      }, 100);
    }
  };

  const submitToGoogleSheets = async (data: FormData): Promise<boolean> => {
    try {
      // Replace with your Google Apps Script Web App URL
      const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznqxRBfCu6PDtgyDXP8IYtFfEF_c1GsHlamgmw26EAkao8JwXTDtV8ZGpjA5uOKBuV/exec';
      
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.countryCode.replace('+', '') + data.phone,
          business: data.business,
          services: data.services,
          aiRequirements: data.aiRequirements,
          timestamp: new Date().toISOString()
        })
      });

      return true;
    } catch (error) {
      console.error('Error submitting to Google Sheets:', error);
      return false;
    }
  };

  const submitToWebhook = async (data: FormData): Promise<boolean> => {
    try {
      const WEBHOOK_URL = 'https://hook.us2.make.com/1lrtc2jhahxcxf4jnhs0fcoegott5oqd';
      
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.countryCode.replace('+', '') + data.phone,
          business: data.business,
          services: data.services,
          aiRequirements: data.aiRequirements,
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
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          countryCode: '+1',
          business: '',
          services: '',
          aiRequirements: ''
        });
        // Keep current step to show thank you message in place
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

  // Initialize validation on component mount
  React.useEffect(() => {
    validateCurrentStep();
  }, [currentStep]);

  // Assistant management functions
  const handleCreateAssistant = () => {
    setCurrentAssistant(null);
    setShowAssistantBuilder(true);
  };

  const handleEditAssistant = (assistant: VapiAssistant) => {
    setCurrentAssistant(assistant);
    setShowAssistantBuilder(true);
  };

  const handleSaveAssistant = (assistant: VapiAssistant) => {
    setShowAssistantBuilder(false);
    setCurrentAssistant(null);
    // Refresh assistants list if needed
  };

  const handleBackFromBuilder = () => {
    setShowAssistantBuilder(false);
    setCurrentAssistant(null);
  };

  // Handle routing for onboarding booking page
  if (window.location.pathname === '/onboarding-booking') {
    return <OnboardingBookingPage />;
  }

  // If user is logged in and has premium access, show the dashboard
  if (user && (user.membership_status === 'premium' || user.membership_status === 'enterprise')) {
    if (showAssistantBuilder) {
      return (
        <DashboardLayout currentPage="assistants" onPageChange={setCurrentPage}>
          <AssistantBuilder
            assistantId={currentAssistant?.id}
            onBack={handleBackFromBuilder}
            onSave={handleSaveAssistant}
          />
        </DashboardLayout>
      );
    }

    return (
      <DashboardLayout currentPage={currentPage} onPageChange={setCurrentPage}>
        {currentPage === 'dashboard' && <DashboardOverview />}
        {currentPage === 'assistants' && (
          <AssistantsList
            onCreateNew={handleCreateAssistant}
            onEdit={handleEditAssistant}
          />
        )}
        {currentPage === 'phone-numbers' && (
          <div className="text-center py-12">
            <Phone className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
            <h3 className="text-xl font-semibold mb-2 text-gray-400">Phone Numbers</h3>
            <p className="text-gray-500">Phone number management coming soon</p>
          </div>
        )}
        {currentPage === 'calls' && (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
            <h3 className="text-xl font-semibold mb-2 text-gray-400">Call Logs</h3>
            <p className="text-gray-500">Call management coming soon</p>
          </div>
        )}
        {currentPage === 'webhooks' && (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
            <h3 className="text-xl font-semibold mb-2 text-gray-400">Webhooks</h3>
            <p className="text-gray-500">Webhook management coming soon</p>
          </div>
        )}
        {currentPage === 'team' && (
          <div className="text-center py-12">
            <User className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
            <h3 className="text-xl font-semibold mb-2 text-gray-400">Team Management</h3>
            <p className="text-gray-500">Team features coming soon</p>
          </div>
        )}
        {currentPage === 'billing' && (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
            <h3 className="text-xl font-semibold mb-2 text-gray-400">Billing</h3>
            <p className="text-gray-500">Billing management coming soon</p>
          </div>
        )}
        {currentPage === 'api-keys' && (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
            <h3 className="text-xl font-semibold mb-2 text-gray-400">API Keys</h3>
            <p className="text-gray-500">API key management coming soon</p>
          </div>
        )}
        {currentPage === 'settings' && (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
            <h3 className="text-xl font-semibold mb-2 text-gray-400">Settings</h3>
            <p className="text-gray-500">Settings management coming soon</p>
          </div>
        )}
      </DashboardLayout>
    );
  }

  // If user is logged in but doesn't have premium membership
  if (user && user.membership_status !== 'premium' && user.membership_status !== 'enterprise') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-full animate-pulse"></div>
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-yellow-400/5 to-transparent rounded-full animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 w-full max-w-md mx-4 text-center">
          <Brain className="h-16 w-16 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">
            Premium Membership Required
          </h2>
          <p className="text-gray-300 mb-8">
            You need an active premium membership to access the AI Agent Studio. 
            Upgrade now to start creating and managing your AI agents.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => window.location.href = 'https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding'}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/25"
            >
              Book Your Onboarding Call
            </button>
            
            <button
              onClick={() => setShowAuthForm(false)}
              className="w-full text-gray-400 hover:text-gray-300 transition-colors text-sm"
            >
              Back to main page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // If showing auth form, render authentication UI
  if (showAuthForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-full animate-pulse"></div>
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-yellow-400/5 to-transparent rounded-full animate-pulse delay-1000"></div>
        </div>

        {isSignUp ? (
          <RegisterForm
            onSwitchToLogin={() => setIsSignUp(false)}
            onBack={() => setShowAuthForm(false)}
          />
        ) : (
          <LoginForm
            onSwitchToRegister={() => setIsSignUp(true)}
            onBack={() => setShowAuthForm(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-x-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-yellow-400/5 to-transparent rounded-full animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center space-x-3 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
                  Infinite Wealth Solutions
                </h1>
                <p className="text-blue-300 text-base sm:text-lg">AI Agents</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Vapi AI Widget Section */}
      <section className="relative z-10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold mb-6">
              Try Our AI Agent Live Demo
            </h3>
            <p className="text-gray-300 mb-8 text-lg">
              Experience the power of our AI sales agent. Click the button below to start a live conversation.
            </p>
            
            {/* Vapi Widget Container */}
            <div className="mb-8">
              <vapi-widget 
                assistant-id="4010a25a-e42e-4654-be7b-15e0229fdab8" 
                public-key="ebb2120b-ac56-4ce9-b1d5-17966931c665"
              ></vapi-widget>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => {
                  // Trigger the Vapi widget if needed
                  const widget = document.querySelector('vapi-widget');
                  if (widget) {
                    // The widget should handle its own click events
                    console.log('Free Demo clicked');
                  }
                }}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/25 flex items-center space-x-3"
              >
                <Phone className="h-6 w-6" />
                <span>Free Demo</span>
              </button>
              
              <a
                href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/25 flex items-center space-x-3"
              >
                <Calendar className="h-6 w-6" />
                <span>Get Started</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative z-10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-8 leading-tight">
            Cut costs, increase efficiency,{' '}
            <span className="bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
              generate more sales
            </span>
          </h2>
          
          <p className="text-lg sm:text-xl text-gray-300 mb-12 leading-relaxed">
            Let our Agents handle the phone work and book meetings while you focus on closing more sales.
          </p>

          {/* Form Section */}
          <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 sm:p-12 max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4">
                Create a FREE customized Demo AI Agent within 5 minutes!
              </h3>
              <p className="text-gray-300 text-base">
                Tell us about your needs and let's create your perfect AI Sales Agent
              </p>
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

            {/* Progress Indicator - Hide when form is successfully submitted */}
            {submitStatus !== 'success' && (
              <div className="mb-12">
                <div className="flex items-center justify-center space-x-4 mb-6">
                  {questions.map((_, index) => (
                    <React.Fragment key={index}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                        index < currentStep 
                          ? 'bg-green-500 text-white shadow-lg shadow-green-500/50' 
                          : index === currentStep 
                          ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/50' 
                          : 'bg-gray-600 text-gray-400'
                      }`}>
                        {index < currentStep ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      {index < questions.length - 1 && (
                        <div className={`w-8 h-1 transition-all duration-300 ${
                          index < currentStep ? 'bg-green-500' : 'bg-gray-600'
                        }`}></div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <p className="text-center text-gray-400 text-sm">
                  Step {currentStep + 1} of {questions.length}
                </p>
              </div>
            )}

            {/* Question Container or Thank You Message */}
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
                  We'll be in touch soon to discuss your custom AI Sales Agent.
                </p>
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
                          </h4>
                        </div>
                      )}

                      <div className="space-y-4">
                        {question.type !== 'multi-input' && (
                          question.label && (
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                              <question.icon className="inline h-4 w-4 mr-2" />
                              {question.label} *
                            </label>
                          )
                        )}

                        {/* Enhance Prompt Button for AI Requirements */}

                        {/* Input Field */}
                        {question.type === 'multi-input' ? (
                          <div className="space-y-6">
                            {question.fields?.map(field => (
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
                                      } border-r-0 rounded-l-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all`}
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
                                      } rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all`}
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
                                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all`}
                                    placeholder={field.placeholder}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : question.type === 'textarea' ? (
                          <textarea
                            id={question.id as string}
                            name={question.id as string}
                            value={formData[question.id as keyof FormData]}
                            onChange={handleInputChange}
                            rows={question.rows || 4}
                            className={`w-full px-4 py-3 bg-gray-900/50 border ${
                              currentError ? 'border-red-500' : 'border-gray-600'
                            } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all resize-vertical`}
                            placeholder={question.placeholder}
                          />
                        ) : (
                          <input
                            type="text"
                            id={question.id as string}
                            name={question.id as string}
                            value={formData[question.id as keyof FormData]}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-3 bg-gray-900/50 border ${
                              currentError ? 'border-red-500' : 'border-gray-600'
                            } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all`}
                            placeholder={question.placeholder || ''}
                          />
                        )}

                        {/* Error Message */}
                        {currentError && index === currentStep && (
                          <p className="mt-2 text-sm text-red-400">{currentError}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Buttons - Hide when form is successfully submitted */}
            {submitStatus !== 'success' && (
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-700/50">
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
                     className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center text-center flex-shrink-0 min-w-0"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                         <span className="hidden sm:inline">Submitting...</span>
                         <span className="sm:hidden">Submitting</span>
                      </>
                    ) : (
                       <>
                         <span className="hidden sm:inline">Get Your Custom AI Sales Agent</span>
                         <span className="sm:hidden">Get AI Agent</span>
                       </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!isStepValid}
                     className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2 flex-shrink-0"
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

      {/* AI Agent Use Cases Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              AI Agent <span className="bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">Use Cases</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Discover how AI agents can transform different aspects of your business operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Use Case 1: Outbound Sales */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-yellow-400/50 transition-all duration-300 group">
              <div className="bg-yellow-400/10 w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-yellow-400/20 transition-colors">
                <Target className="h-10 w-10 text-yellow-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">Outbound Sales & Appointment Booking</h3>
              <p className="text-gray-400 text-center leading-relaxed">
                AI agents make proactive outbound calls to qualify leads, answer initial questions, and seamlessly book appointments for your sales team.
              </p>
              <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Phone className="h-4 w-4" />
                  <span>Outbound Calls</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Booking</span>
                </div>
              </div>
            </div>

            {/* Use Case 2: Restaurant Inquiries */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-blue-400/50 transition-all duration-300 group">
              <div className="bg-blue-400/10 w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-400/20 transition-colors">
                <Building className="h-10 w-10 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">Inbound Retail Inquiries</h3>
              <p className="text-gray-400 text-center leading-relaxed">
                Automate your stores phone lines with AI agents handling reservations, taking orders, providing details, and answering general customer questions 24/7.
              </p>
              <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>Reservations</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Briefcase className="h-4 w-4" />
                  <span>Orders</span>
                </div>
              </div>
            </div>

            {/* Use Case 3: AI Receptionist */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-green-400/50 transition-all duration-300 group">
              <div className="bg-green-400/10 w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-green-400/20 transition-colors">
                <User className="h-10 w-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center">AI Receptionist</h3>
              <p className="text-gray-400 text-center leading-relaxed">
                An AI agent acts as your virtual receptionist, greeting callers, directing them to the correct department or individual, taking messages, and handling appointment bookings, changes, and cancellations, ensuring no call goes unanswered.
              </p>
              <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Phone className="h-4 w-4" />
                  <span>Call Routing</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Appointments</span>
                </div>
              </div>
            </div>
          </div>

          {/* Call-to-Action */}
          <div className="text-center mt-16">
            <p className="text-lg text-gray-300 mb-8">
              Ready to implement AI agents for your specific use case?
            </p>
            <a
              href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-yellow-400/25 flex items-center justify-center space-x-3 mx-auto"
            >
              <Brain className="h-6 w-6" />
              <span>Get Started with AI Agents</span>
            </a>
          </div>
        </div>
      </section>


      {/* Subscription Section */}
      <SubscriptionSection />

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Brain className="h-8 w-8 text-yellow-400" />
            <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
              Infinite Wealth Solutions
            </h3>
          </div>
          <p className="text-gray-400">
            © 2024 Infinite Wealth Solutions. Transforming businesses with AI-powered solutions.
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;