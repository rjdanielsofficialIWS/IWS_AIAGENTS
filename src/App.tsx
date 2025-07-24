import React, { useState } from 'react';
import { Brain, TrendingUp, Phone, Mail, User, Building, Briefcase, MessageSquare, CheckCircle, AlertCircle, Loader, Zap, ArrowRight, ArrowLeft } from 'lucide-react';

interface FormData {
  name: string;
  email: string;
  phone: string;
  business: string;
  services: string;
  aiRequirements: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  business?: string;
  services?: string;
  aiRequirements?: string;
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    business: '',
    services: '',
    aiRequirements: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 1:
        if (!formData.business.trim()) {
          newErrors.business = 'Business description is required';
        }
        break;
      case 2:
        if (!formData.services.trim()) {
          newErrors.services = 'Services description is required';
        }
        break;
      case 3:
        if (!formData.aiRequirements.trim()) {
          newErrors.aiRequirements = 'AI requirements description is required';
        }
        break;
      case 4:
        if (!formData.name.trim()) {
          newErrors.name = 'Name is required';
        }
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!validateEmail(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        if (!formData.phone.trim()) {
          newErrors.phone = 'Phone number is required';
        } else if (!validatePhone(formData.phone)) {
          newErrors.phone = 'Please enter a valid phone number';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
    setErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const submitToWebhook = async (data: FormData): Promise<boolean> => {
    try {
      // Send to Make.com webhook
      const WEBHOOK_URL = 'https://hook.us2.make.com/xbuqqbpezff1lsgmwqxjkdm3qpwl93qt';
      
      const webhookResponse = await fetch(WEBHOOK_URL, {
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

      // Also send to Google Sheets as backup
      const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznqxRBfCu6PDtgyDXP8IYtFfEF_c1GsHlamgmw26EAkao8JwXTDtV8ZGpjA5uOKBuV/exec';
      
      fetch(GOOGLE_SCRIPT_URL, {
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
      }).catch(error => {
        console.log('Google Sheets backup failed:', error);
      });

      return webhookResponse.ok;
    } catch (error) {
      console.error('Error submitting form:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(4)) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const success = await submitToWebhook(formData);
      
      if (success) {
        setSubmitStatus('success');
        setCurrentStep(1);
        setFormData({
          name: '',
          email: '',
          phone: '',
          business: '',
          services: '',
          aiRequirements: ''
        });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = (step: number): string => {
    switch (step) {
      case 1: return "Tell us about your company";
      case 2: return "What services do you provide?";
      case 3: return "What do you want your AI Agent to do?";
      case 4: return "Let's get in touch";
      default: return "";
    }
  };
  
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
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
            Cut costs, increase efficiency,{' '}
            <span className="bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
              generate more sales
            </span>
          </h2>
          
          <p className="text-xl sm:text-2xl text-gray-300 mb-12 leading-relaxed">
            Let our Agents handle the phone work and book meetings while you focus on closing more sales.
          </p>

          {/* Form Section */}
          <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 sm:p-12 max-w-3xl mx-auto">
            <div className="mb-8">
              <h3 className="text-3xl sm:text-4xl font-bold text-center bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                Create a FREE customized Demo AI Agent within 5 minutes!
              </h3>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center space-x-4">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      step === currentStep 
                        ? 'bg-yellow-400 text-black' 
                        : step < currentStep 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-600 text-gray-300'
                    }`}>
                      {step < currentStep ? <CheckCircle className="h-5 w-5" /> : step}
                    </div>
                    {step < 4 && (
                      <div className={`w-8 h-0.5 mx-2 transition-all duration-300 ${
                        step < currentStep ? 'bg-green-500' : 'bg-gray-600'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center mb-12">
              <h3 className="text-2xl sm:text-3xl font-bold mb-2">
                {getStepTitle(currentStep)}
              </h3>
              <p className="text-gray-400 text-sm">
                Step {currentStep} of 4
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

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Step 1: Company Information */}
              {currentStep === 1 && (
                <div className="transition-all duration-500 ease-in-out">
                  <label htmlFor="business" className="block text-sm font-medium text-gray-300 mb-3">
                    <Building className="inline h-4 w-4 mr-2" />
                    Your Company Name *
                  </label>
                  <textarea
                    id="business"
                    name="business"
                    value={formData.business}
                    onChange={handleInputChange}
                    rows={4}
                    className={`w-full px-4 py-3 bg-gray-900/50 border ${
                      errors.business ? 'border-red-500' : 'border-gray-600'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all resize-vertical`}
                    placeholder="Enter your company name..."
                  />
                  {errors.business && (
                    <p className="mt-2 text-sm text-red-400">{errors.business}</p>
                  )}
                </div>
              )}

              {/* Step 2: Services */}
              {currentStep === 2 && (
                <div className="transition-all duration-500 ease-in-out">
                  <label htmlFor="services" className="block text-sm font-medium text-gray-300 mb-3">
                    <Briefcase className="inline h-4 w-4 mr-2" />
                    What services do you provide? *
                  </label>
                  <textarea
                    id="services"
                    name="services"
                    value={formData.services}
                    onChange={handleInputChange}
                    rows={4}
                    className={`w-full px-4 py-3 bg-gray-900/50 border ${
                      errors.services ? 'border-red-500' : 'border-gray-600'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all resize-vertical`}
                    placeholder="List your main services, products, or offerings..."
                  />
                  {errors.services && (
                    <p className="mt-2 text-sm text-red-400">{errors.services}</p>
                  )}
                </div>
              )}

              {/* Step 3: AI Requirements */}
              {currentStep === 3 && (
                <div className="transition-all duration-500 ease-in-out">
                  <label htmlFor="aiRequirements" className="block text-sm font-medium text-gray-300 mb-3">
                    <MessageSquare className="inline h-4 w-4 mr-2" />
                    What exactly do you want your AI Sales Agent to do for you? *
                  </label>
                  <textarea
                    id="aiRequirements"
                    name="aiRequirements"
                    value={formData.aiRequirements}
                    onChange={handleInputChange}
                    rows={6}
                    className={`w-full px-4 py-3 bg-gray-900/50 border ${
                      errors.aiRequirements ? 'border-red-500' : 'border-gray-600'
                    } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all resize-vertical`}
                    placeholder="Be specific about tasks, goals, processes, scripts, follow-up procedures, CRM integration needs, etc..."
                  />
                  
                  {errors.aiRequirements && (
                    <p className="mt-2 text-sm text-red-400">{errors.aiRequirements}</p>
                  )}
                </div>
              )}

              {/* Step 4: Contact Information */}
              {currentStep === 4 && (
                <div className="transition-all duration-500 ease-in-out space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-3">
                        <User className="inline h-4 w-4 mr-2" />
                        Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 bg-gray-900/50 border ${
                          errors.name ? 'border-red-500' : 'border-gray-600'
                        } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all`}
                        placeholder="Your full name"
                      />
                      {errors.name && (
                        <p className="mt-2 text-sm text-red-400">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-3">
                        <Mail className="inline h-4 w-4 mr-2" />
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 bg-gray-900/50 border ${
                          errors.email ? 'border-red-500' : 'border-gray-600'
                        } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all`}
                        placeholder="your@email.com"
                      />
                      {errors.email && (
                        <p className="mt-2 text-sm text-red-400">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-3">
                      <Phone className="inline h-4 w-4 mr-2" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 bg-gray-900/50 border ${
                        errors.phone ? 'border-red-500' : 'border-gray-600'
                      } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all`}
                      placeholder="+1 (555) 123-4567"
                    />
                    {errors.phone && (
                      <p className="mt-2 text-sm text-red-400">{errors.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-6">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-all duration-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>
                ) : (
                  <div></div>
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold rounded-lg transition-all duration-200"
                  >
                    <span>Next</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-yellow-400/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center space-x-2">
                        <Loader className="h-5 w-5 animate-spin" />
                        <span>Submitting...</span>
                      </span>
                    ) : (
                      'Get Your Custom AI Sales Agent'
                    )}
                  </button>
                )}
              </div>
            </form>
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