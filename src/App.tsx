import React, { useState } from 'react';
import { Brain, Zap, TrendingUp, Phone, Mail, User, Building, Briefcase, MessageSquare, CheckCircle, AlertCircle, Loader, Lock, ArrowLeft, ArrowRight } from 'lucide-react';
import { SubscriptionSection } from './components/SubscriptionSection';
import { ClientPortal } from './components/ClientPortal';
import { supabase } from './services/blandAI';

interface FormData {
  name: string;
  email: string;
  phone: string;
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

function App() {
  const [showPortal, setShowPortal] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
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
          placeholder: '+1 (555) 123-4567',
          icon: Phone,
          required: true
        }
      ]
    }
  ];

  const handleSubscribe = () => {
    setIsSubscribed(true);
    setShowPortal(true);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    
    try {
      if (isSignUp) {
        // Validate passwords match
        if (authForm.password !== authForm.confirmPassword) {
          setAuthError('Passwords do not match');
          setAuthLoading(false);
          return;
        }
        
        // Sign up new user
        const { data, error } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
        });
        
        if (error) {
          setAuthError(error.message);
        } else if (data.user) {
          // Successfully signed up
          setIsSubscribed(true);
          setShowPortal(true);
          setShowAuthForm(false);
          // Reset form
          setAuthForm({ email: '', password: '', confirmPassword: '' });
        }
      } else {
        // Sign in existing user
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password,
        });
        
        if (error) {
          setAuthError(error.message);
        } else if (data.user) {
          // Successfully signed in
          setIsSubscribed(true);
          setShowPortal(true);
          setShowAuthForm(false);
          // Reset form
          setAuthForm({ email: '', password: '', confirmPassword: '' });
        }
      }
    } catch (error) {
      setAuthError('An unexpected error occurred. Please try again.');
      console.error('Auth error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    // Sign out from Supabase
    supabase.auth.signOut();
    setShowPortal(false);
    setIsSubscribed(false);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const enhancePrompt = async () => {
    if (!formData.aiRequirements.trim()) {
      return;
    }

    setEnhanceState({ isEnhancing: true, hasEnhanced: false });

    try {
      const enhancedText = await blandAI.enhancePrompt(formData.aiRequirements);
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
          error = 'Please enter a valid phone number';
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
          phone: data.phone,
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
      const WEBHOOK_URL = 'https://hook.us2.make.com/xbuqqbpezff1lsgmwqxjkdm3qpwl93qt';
      
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
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
          business: '',
          services: '',
          aiRequirements: ''
        });
        setCurrentStep(0);
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

  // Show client portal if user is subscribed and wants to access it
  if (showPortal && isSubscribed) {
    return <ClientPortal onLogout={handleLogout} />;
  }
  
  // Show authentication form
  if (showAuthForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center px-4">
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Brain className="h-8 w-8 text-yellow-400" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
                Infinite Wealth Solutions
              </h1>
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="text-gray-400">
              {isSignUp ? 'Get started with your AI agent' : 'Access your AI agent dashboard'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-gray-300 mb-2">
                <Mail className="inline h-4 w-4 mr-2" />
                Email
              </label>
              <input
                type="email"
                id="auth-email"
                value={authForm.email}
                onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-gray-300 mb-2">
                <Lock className="inline h-4 w-4 mr-2" />
                Password
              </label>
              <input
                type="password"
                id="auth-password"
                value={authForm.password}
                onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="auth-confirm-password" className="block text-sm font-medium text-gray-300 mb-2">
                  <Lock className="inline h-4 w-4 mr-2" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="auth-confirm-password"
                  value={authForm.confirmPassword}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all"
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                />
              </div>
            )}

            {authError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{authError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {authLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                </span>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => setShowAuthForm(false)}
              className="text-gray-400 hover:text-gray-300 transition-colors text-sm"
            >
              ← Back to main page
            </button>
          </div>
        </div>
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
          <div className="flex items-center justify-center space-x-3 text-center">
            <Brain className="h-10 w-10 text-yellow-400" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
              Infinite Wealth Solutions
            </h1>
          </div>
          <p className="text-center text-blue-300 mt-2 text-base sm:text-lg">AI Agents</p>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
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

          {/* Get Started Button */}
          <div className="mb-16">
            <button
              onClick={handleSubscribe}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/25 text-lg mr-4"
            >
              Get Started - Access AI Agent Studio
            </button>
            <button
              onClick={() => setShowAuthForm(true)}
              className="bg-transparent border-2 border-gray-600 hover:border-yellow-400 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 hover:bg-yellow-400/10 text-lg"
            >
              Login
            </button>
          </div>

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

            {/* Progress Indicator */}
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

            {/* Question Container */}
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

            {/* Navigation Buttons */}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-yellow-400/50 transition-all duration-300 group">
              <div className="bg-yellow-400/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-400/20 transition-colors">
                <TrendingUp className="h-8 w-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Cut Costs</h3>
              <p className="text-gray-400">Reduce operational expenses with intelligent automation</p>
            </div>
            
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-blue-400/50 transition-all duration-300 group">
              <div className="bg-blue-400/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-400/20 transition-colors">
                <Zap className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Increase Efficiency</h3>
              <p className="text-gray-400">Streamline processes with AI-powered solutions</p>
            </div>
            
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-yellow-400/50 transition-all duration-300 group">
              <div className="bg-yellow-400/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-400/20 transition-colors">
                <Phone className="h-8 w-8 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Generate Sales</h3>
              <p className="text-gray-400">Book more meetings and close more deals</p>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Section */}
      <SubscriptionSection onSubscribe={handleSubscribe} />

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

export default App;