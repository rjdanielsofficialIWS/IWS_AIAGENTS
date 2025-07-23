import React, { useState } from 'react';
import { Brain, Zap, TrendingUp, Phone, Mail, User, Building, Briefcase, MessageSquare, CheckCircle, AlertCircle, Loader, Lock } from 'lucide-react';
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

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  business?: string;
  services?: string;
  aiRequirements?: string;
}

interface EnhanceState {
  isEnhancing: boolean;
  hasEnhanced: boolean;
}

function App() {
  const [showPortal, setShowPortal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    business: '',
    services: '',
    aiRequirements: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [enhanceState, setEnhanceState] = useState<EnhanceState>({
    isEnhancing: false,
    hasEnhanced: false
  });

  const handleSubscribe = () => {
    setShowPortal(true);
  };

  const handleLogout = () => {
    setShowPortal(false);
  };

  // Show client portal if user is subscribed and wants to access it
  if (showPortal) {
    return <ClientPortal onLogout={handleLogout} />;
  }

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
      // Create a comprehensive enhancement prompt
      const enhancementPrompt = `Please enhance and expand this AI agent requirement description to be more detailed, specific, and actionable. The original request is: "${formData.aiRequirements}"

Please expand it to include:
- Specific tasks and workflows
- Target audience details
- Communication style preferences
- Integration requirements
- Success metrics
- Follow-up procedures
- Any relevant industry-specific considerations

Make it comprehensive but keep it focused and practical. Return only the enhanced description without any additional commentary.`;

      // Using a free AI API service (you can replace this with your preferred AI service)
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY || 'demo-key'}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: enhancementPrompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        const enhancedText = data.choices[0]?.message?.content?.trim();
        
        if (enhancedText) {
          setFormData(prev => ({ ...prev, aiRequirements: enhancedText }));
          setEnhanceState({ isEnhancing: false, hasEnhanced: true });
        } else {
          throw new Error('No enhanced text received');
        }
      } else {
        throw new Error('Failed to enhance prompt');
      }
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      // Fallback enhancement for demo purposes
      const fallbackEnhancement = `${formData.aiRequirements}

Enhanced details to consider:
• Target audience: [Specify your ideal customer profile]
• Communication style: [Professional, friendly, consultative, etc.]
• Key objectives: [Lead qualification, appointment setting, follow-up, etc.]
• Integration needs: [CRM system, calendar booking, email sequences]
• Success metrics: [Conversion rates, response times, meeting bookings]
• Follow-up procedures: [Automated sequences, escalation protocols]
• Industry-specific requirements: [Compliance, terminology, processes]
• Preferred response times and availability windows
• Escalation criteria for complex inquiries`;

      setFormData(prev => ({ ...prev, aiRequirements: fallbackEnhancement }));
      setEnhanceState({ isEnhancing: false, hasEnhanced: true });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

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

    if (!formData.business.trim()) {
      newErrors.business = 'Business description is required';
    }

    if (!formData.services.trim()) {
      newErrors.services = 'Services description is required';
    }

    if (!formData.aiRequirements.trim()) {
      newErrors.aiRequirements = 'AI requirements description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
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

      return true; // With no-cors mode, we can't check response.ok, so assume success
    } catch (error) {
      console.error('Error submitting form:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const success = await submitToGoogleSheets(formData);
      
      if (success) {
        setSubmitStatus('success');
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
            <div className="text-center mb-12">
              <h3 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Transform Your Business?
              </h3>
              <p className="text-gray-300 text-lg">
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

            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
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

              <div>
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

              <div>
                <label htmlFor="aiRequirements" className="block text-sm font-medium text-gray-300 mb-3">
                  <MessageSquare className="inline h-4 w-4 mr-2" />
                  What exactly do you want your AI Sales Agent to do for you? *
                </label>
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={enhancePrompt}
                    disabled={enhanceState.isEnhancing || !formData.aiRequirements.trim()}
                    className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {enhanceState.isEnhancing ? (
                      <>
                        <Loader className="h-3 w-3 animate-spin" />
                        <span>Enhancing...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-3 w-3" />
                        <span>Enhance Prompt</span>
                      </>
                    )}
                  </button>
                </div>
                {enhanceState.hasEnhanced && (
                  <div className="mb-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-sm text-green-300 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Prompt enhanced! Review and edit as needed.
                    </p>
                  </div>
                )}
                <textarea
                  id="aiRequirements"
                  name="aiRequirements"
                  value={formData.aiRequirements}
                  onChange={handleInputChange}
                  rows={6}
                  className={`w-full px-4 py-3 bg-gray-900/50 border ${
                    errors.aiRequirements ? 'border-red-500' : 'border-gray-600'
                  } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all resize-vertical`}
                  placeholder="Be specific about tasks, goals, processes, scripts, target audience, follow-up procedures, CRM integration needs, etc. The more detailed, the better we can customize your AI agent..."
                />
                {errors.aiRequirements && (
                  <p className="mt-2 text-sm text-red-400">{errors.aiRequirements}</p>
                )}
              </div>

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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-yellow-400/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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