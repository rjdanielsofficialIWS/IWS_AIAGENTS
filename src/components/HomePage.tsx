import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain, Zap, TrendingUp, Phone, PhoneOff, Mail, User, Building, Globe,
  MessageSquare, CheckCircle, AlertCircle, Loader, ArrowLeft, ArrowRight,
  Calendar, Users, X, Share2, BarChart2, Sparkles, Menu,
} from 'lucide-react';
import { SubscriptionSection } from './SubscriptionSection';
import Vapi from '@vapi-ai/web';
import { trackHighIntent } from '../lib/analytics';

interface FormData {
  name: string; email: string; phone: string; countryCode: string;
  business: string; websiteUrl: string; industryServices: string;
}

const GOLD_PRIMARY = '#C8A24A';
const GOLD_HOVER = '#E3C36A';
const VAPI_PUBLIC_KEY = 'ebb2120b-ac56-4ce9-b1d5-17966931c665';
const HOME_VAPI_ASSISTANT_ID = '76efe9e0-957c-410a-9163-75acbceec45e';
const HOME_VAPI_FIRST_MESSAGE = 'Infinite Wealth Solutions AI - Alex speaking, how may I help you?';

export function HomePage() {
  const [bgOffset, setBgOffset] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', phone: '', countryCode: '+1', business: '', websiteUrl: '', industryServices: '' });
  const [currentError, setCurrentError] = useState('');
  const [isStepValid, setIsStepValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [phoneModal, setPhoneModal] = useState<'voice' | null>(null);
  const vapiRef = React.useRef<Vapi | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'live' | 'ended' | 'error'>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const questions = [
    {
      id: 'companyInfo', title: 'Company Name', subtitle: 'Website URL is optional, but recommended',
      type: 'multi-input' as const, icon: Building, required: true,
      fields: [
        { id: 'business' as keyof FormData, label: 'Company Name', type: 'input' as const, placeholder: 'Your company name', icon: Building, required: true },
        { id: 'websiteUrl' as keyof FormData, label: 'Website URL (optional)', type: 'input' as const, placeholder: 'https://yourwebsite.com', icon: Globe, required: false },
      ],
    },
    { id: 'industryServices', title: 'Industry and Services', type: 'textarea' as const, placeholder: 'Example: Plumbing — Drain cleaning, water heaters, emergency calls, etc.', rows: 4, icon: MessageSquare, required: true },
    {
      id: 'contactInfo', title: 'Your Contact Info', subtitle: "We'll send your demo link here", type: 'multi-input' as const,
      fields: [
        { id: 'name' as keyof FormData, label: 'Name', type: 'input' as const, placeholder: 'Your full name', icon: User, required: true },
        { id: 'email' as keyof FormData, label: 'Email', type: 'email' as const, placeholder: 'your@email.com', icon: Mail, required: true },
        { id: 'phone' as keyof FormData, label: 'Phone Number', type: 'tel' as const, placeholder: '(555) 123-4567', icon: Phone, required: true },
      ],
    },
  ];

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validatePhone = (p: string) => /^[\d\s\-\(\)]{7,15}$/.test(p.replace(/\s/g, ''));
  const validateUrl = (u: string) => {
    if (!u.trim()) return true;
    try { new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`); return true; } catch { return false; }
  };

  const validateCurrentStep = () => {
    const q = questions[currentStep];
    let valid = true, error = '';
    if (q.type === 'multi-input') {
      for (const f of q.fields || []) {
        const val = (formData[f.id] || '').toString();
        if (f.required !== false && !val.trim()) { valid = false; error = `${f.label} is required`; break; }
        if (f.id === 'email' && val && !validateEmail(val)) { valid = false; error = 'Please enter a valid email'; break; }
        if (f.id === 'phone' && val && !validatePhone(val)) { valid = false; error = 'Please enter a valid phone number'; break; }
        if (f.id === 'websiteUrl' && val && !validateUrl(val)) { valid = false; error = 'Please enter a valid URL'; break; }
      }
    } else {
      const val = formData[q.id as keyof FormData] as string;
      if (!val?.trim()) { valid = false; error = 'This field is required'; }
    }
    setCurrentError(error); setIsStepValid(valid); return valid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    trackHighIntent({ name: 'form_submit', label: 'package_quote_form' });
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      const response = await fetch(`${supabaseUrl}/functions/v1/lead-capture-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        body: JSON.stringify({
          companyName: formData.business, websiteUrl: formData.websiteUrl, industryServices: formData.industryServices,
          contactName: formData.name, contactEmail: formData.email, contactPhone: `${formData.countryCode} ${formData.phone}`,
        }),
      });
      const txt = await response.text();
      if (response.ok) {
        const json = txt ? JSON.parse(txt) : {};
        setSubmitStatus('success'); setCreatedSlug(json.slug || null);
        trackHighIntent({ name: 'form_success', label: 'package_quote_form' });
      } else { setSubmitStatus('error'); }
    } catch { setSubmitStatus('error'); }
    finally { setIsSubmitting(false); }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep === 2) { handleSubmit(); return; }
    setCurrentStep(s => s + 1); setCurrentError('');
  };

  React.useEffect(() => { validateCurrentStep(); }, [currentStep, formData]);

  React.useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { setBgOffset(scrollY * 0.15); raf = 0; });
    };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  React.useEffect(() => {
    if (phoneModal !== 'voice') return;
    let cancelled = false;
    (async () => {
      try {
        setVoiceError(null); setVoiceStatus('connecting');
        try { vapiRef.current?.stop(); } catch {}
        const vapi = new Vapi(VAPI_PUBLIC_KEY); vapiRef.current = vapi;
        vapi.on('call-start', () => { if (!cancelled) setVoiceStatus('live'); });
        vapi.on('call-end', () => { if (!cancelled) setVoiceStatus('ended'); });
        (vapi as any).on?.('error', (e: any) => { if (!cancelled) { setVoiceStatus('error'); setVoiceError(e?.message || 'Error'); } });
        await vapi.start(HOME_VAPI_ASSISTANT_ID);
        try { await (vapi as any).say(HOME_VAPI_FIRST_MESSAGE, false); } catch {}
      } catch (e: any) { if (!cancelled) { setVoiceStatus('error'); setVoiceError(e?.message || 'Failed'); } }
    })();
    return () => {
      cancelled = true;
      try { vapiRef.current?.stop(); } catch {}
      vapiRef.current = null; setVoiceStatus('idle'); setVoiceError(null);
    };
  }, [phoneModal]);

  const closePhoneModal = () => {
    try { vapiRef.current?.stop(); } catch {}
    vapiRef.current = null; setVoiceStatus('idle'); setVoiceError(null); setPhoneModal(null);
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden"
      style={{ backgroundImage: `radial-gradient(1200px 600px at 50% ${-200 + bgOffset}px, rgba(200,162,74,0.18), transparent 62%), linear-gradient(to bottom, #2a2a2a, #0b0b0b, #000)`, backgroundAttachment: 'fixed', backgroundRepeat: 'no-repeat', backgroundSize: 'cover' }}>
      <style>{`
        .gold-shimmer { background-image: linear-gradient(110deg, #b9892b 0%, #f7dc8a 20%, #ffffff 30%, #f1d27b 40%, #b9892b 60%, #f7dc8a 80%, #ffffff 90%, #b9892b 100%); background-size: 240% 100%; background-position: 0% 50%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: goldShimmerSweep 4.8s ease-in-out infinite; }
        @keyframes goldShimmerSweep { 0% { background-position: 0% 50%; } 55% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .svc-card { transition: transform 0.3s ease, border-color 0.3s ease; }
        .svc-card:hover { transform: translateY(-4px); }
      `}</style>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(800px_520px_at_20%_20%,rgba(200,162,74,0.10),transparent_58%),radial-gradient(900px_560px_at_80%_70%,rgba(255,255,255,0.04),transparent_60%)]" />
      </div>

      {/* NAV */}
      <nav className="relative z-20 border-b border-white/5 backdrop-blur-md bg-black/20 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-[#C8A24A]" />
              <span className="text-lg font-black bg-gradient-to-r from-[#C8A24A] to-[#E3C36A] bg-clip-text text-transparent hidden sm:block">Infinite Wealth Solutions AI</span>
              <span className="text-lg font-black bg-gradient-to-r from-[#C8A24A] to-[#E3C36A] bg-clip-text text-transparent sm:hidden">IWS AI</span>
            </div>
            <div className="hidden lg:flex items-center space-x-1">
              <a href="#services" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">AI Voice Agents</a>
              <Link to="/MediaMachine" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">Social Media</Link>
              <a href="#services" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">Lead Generation</a>
              <a href="#services" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">Web Development</a>
              <a href="#pricing" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">Pricing</a>
            </div>
            <div className="flex items-center space-x-3">
              <a href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding" target="_blank" rel="noopener noreferrer"
                className="hidden sm:flex items-center space-x-2 bg-[#C8A24A] hover:bg-[#E3C36A] text-black font-bold py-2 px-4 rounded-xl transition-all text-sm">
                <Calendar className="h-4 w-4" /><span>Get Started</span>
              </a>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/5 bg-black/90 backdrop-blur-md">
            <div className="px-4 py-3 space-y-1">
              <a href="#services" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all">AI Voice Agents</a>
              <Link to="/MediaMachine" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all">Social Media Manager</Link>
              <a href="#services" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all">Lead Generation</a>
              <a href="#services" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all">Web Development</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all">Pricing</a>
              <div className="pt-2">
                <a href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 bg-[#C8A24A] text-black font-bold py-2.5 px-4 rounded-xl text-sm">
                  <Calendar className="h-4 w-4" /><span>Get Started</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-[#C8A24A]/10 border border-[#C8A24A]/20 rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="h-4 w-4 text-[#C8A24A]" />
            <span className="text-sm text-[#C8A24A] font-semibold">AI-Powered Business Solutions</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
            <span className="gold-shimmer block font-extrabold">Infinite Wealth Solutions</span>
            <span className="block mt-3 text-white font-bold">Transform your business with AI</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-12 leading-relaxed max-w-3xl mx-auto">
            From AI-powered voice agents to social media management, high volume lead generation, and custom websites — we deliver premium digital solutions that drive results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
            <button data-track="cta" data-track-label="Get a Package Quote"
              onClick={() => document.getElementById('lead-capture')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/25 flex items-center justify-center space-x-3">
              <MessageSquare className="h-6 w-6" /><span>FREE AI Phone Agent</span>
            </button>
            <Link to="/MediaMachine"
              className="w-full sm:w-auto bg-gradient-to-r from-[#C8A24A]/20 to-[#E3C36A]/20 border border-[#C8A24A]/40 hover:border-[#C8A24A] text-[#E3C36A] font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-3">
              <Share2 className="h-6 w-6" /><span>Social Media Manager</span>
            </Link>
            <a data-track="book" data-track-label="Get Started"
              href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding" target="_blank" rel="noopener noreferrer"
              className="w-full sm:w-auto bg-[#C8A24A] hover:bg-[#E3C36A] text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-black/30 flex items-center justify-center space-x-3">
              <Calendar className="h-6 w-6" /><span>Get Started</span>
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {[{ value: '500+', label: 'Businesses Helped' }, { value: '19+', label: 'Social Platforms' }, { value: '24/7', label: 'AI Availability' }].map(s => (
              <div key={s.label}><div className="text-2xl font-black text-[#C8A24A]">{s.value}</div><div className="text-xs text-gray-500 mt-0.5">{s.label}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Premium Services for{' '}
              <span className="bg-gradient-to-r from-[#C8A24A] to-[#E3C36A] bg-clip-text text-transparent">Modern Businesses</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Comprehensive digital solutions that transform how businesses operate, generate leads, and serve customers.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* AI Voice Agents */}
            <div className="svc-card bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-[#C8A24A]/45 group">
              <div className="bg-[#C8A24A]/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#C8A24A]/20 transition-colors"><Brain className="h-8 w-8 text-[#C8A24A]" /></div>
              <h3 className="text-xl font-bold mb-3 text-center">AI Voice Agents</h3>
              <p className="text-gray-400 text-center text-sm leading-relaxed">Intelligent AI agents that handle calls, bookings, customer service, and sales with human-like natural speech.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />24/7</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Auto Booking</span>
              </div>
              <button onClick={() => setPhoneModal('voice')} className="mt-6 w-full py-2 rounded-lg text-xs font-bold border border-[#C8A24A]/30 text-[#C8A24A] hover:bg-[#C8A24A]/10 transition-all">Try Demo Agent</button>
            </div>

            {/* Social Media — FEATURED */}
            <div className="svc-card bg-gradient-to-br from-[#C8A24A]/10 to-gray-900/50 backdrop-blur-sm border border-[#C8A24A]/40 rounded-xl p-8 hover:border-[#C8A24A]/80 group relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-[#C8A24A] text-black text-[10px] font-black px-2 py-0.5 rounded-full">NEW</div>
              <div className="bg-[#C8A24A]/15 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#C8A24A]/25 transition-colors"><Share2 className="h-8 w-8 text-[#C8A24A]" /></div>
              <h3 className="text-xl font-bold mb-3 text-center">Social Media Manager</h3>
              <p className="text-gray-400 text-center text-sm leading-relaxed">AI-powered scheduling and content creation across 19+ platforms from one unified dashboard.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />AI Content</span>
                <span className="flex items-center gap-1"><BarChart2 className="h-3 w-3" />Analytics</span>
              </div>
              <Link to="/MediaMachine" className="mt-6 w-full py-2 rounded-lg text-xs font-bold bg-[#C8A24A] text-black hover:bg-[#E3C36A] transition-all text-center block">Launch Media Machine</Link>
            </div>

            {/* Lead Generation */}
            <div className="svc-card bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-[#C8A24A]/45 group">
              <div className="bg-[#C8A24A]/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#C8A24A]/20 transition-colors"><TrendingUp className="h-8 w-8 text-[#C8A24A]" /></div>
              <h3 className="text-xl font-bold mb-3 text-center">Lead Generation</h3>
              <p className="text-gray-400 text-center text-sm leading-relaxed">Drive qualified leads through strategic social media marketing, targeted advertising, and digital campaigns.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />Targeted</span>
                <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />Growth</span>
              </div>
              <a href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding" target="_blank" rel="noopener noreferrer" className="mt-6 w-full py-2 rounded-lg text-xs font-bold border border-[#C8A24A]/30 text-[#C8A24A] hover:bg-[#C8A24A]/10 transition-all text-center block">Learn More</a>
            </div>

            {/* Web Development */}
            <div className="svc-card bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-[#C8A24A]/45 group">
              <div className="bg-[#C8A24A]/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#C8A24A]/20 transition-colors"><Zap className="h-8 w-8 text-[#C8A24A]" /></div>
              <h3 className="text-xl font-bold mb-3 text-center">Web Development</h3>
              <p className="text-gray-400 text-center text-sm leading-relaxed">Unique, professionally designed websites built from scratch. No templates — a site that truly represents your brand.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Building className="h-3 w-3" />Custom</span>
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" />Fast</span>
              </div>
              <a href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding" target="_blank" rel="noopener noreferrer" className="mt-6 w-full py-2 rounded-lg text-xs font-bold border border-[#C8A24A]/30 text-[#C8A24A] hover:bg-[#C8A24A]/10 transition-all text-center block">Learn More</a>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL MEDIA SPOTLIGHT */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-[#C8A24A]/8 to-gray-900/50 border border-[#C8A24A]/20 rounded-2xl p-8 sm:p-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center space-x-2 bg-[#C8A24A]/10 border border-[#C8A24A]/20 rounded-full px-4 py-1.5 mb-6">
                  <Share2 className="h-4 w-4 text-[#C8A24A]" />
                  <span className="text-sm text-[#C8A24A] font-semibold">Media Machine</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                  Manage All Your Social Media{' '}
                  <span className="bg-gradient-to-r from-[#C8A24A] to-[#E3C36A] bg-clip-text text-transparent">In One Place</span>
                </h2>
                <p className="text-gray-300 text-lg leading-relaxed mb-8">
                  Connect TikTok, Instagram, LinkedIn, YouTube, and 15+ more platforms. Use AI to generate captions, schedule posts at optimal times, and track performance — all from your personalized dashboard.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    'AI-generated captions and content ideas',
                    'Schedule posts across 19+ social platforms',
                    'Visual content calendar',
                    'Analytics and performance tracking',
                    'Connect multiple client accounts',
                  ].map(f => (
                    <div key={f} className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-[#C8A24A] shrink-0" />
                      <span className="text-gray-300 text-sm">{f}</span>
                    </div>
                  ))}
                </div>
                <Link to="/MediaMachine" className="inline-flex items-center space-x-3 bg-[#C8A24A] hover:bg-[#E3C36A] text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02]">
                  <Share2 className="h-5 w-5" /><span>Launch Media Machine</span><ArrowRight className="h-5 w-5" />
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { name: 'TikTok', color: '#ffffff', bg: 'rgba(255,255,255,0.06)' },
                  { name: 'Instagram', color: '#E1306C', bg: 'rgba(225,48,108,0.12)' },
                  { name: 'LinkedIn', color: '#0A66C2', bg: 'rgba(10,102,194,0.12)' },
                  { name: 'YouTube', color: '#FF0000', bg: 'rgba(255,0,0,0.12)' },
                  { name: 'Facebook', color: '#1877F2', bg: 'rgba(24,119,242,0.12)' },
                  { name: 'Twitter/X', color: '#ffffff', bg: 'rgba(255,255,255,0.06)' },
                  { name: 'Threads', color: '#ffffff', bg: 'rgba(255,255,255,0.06)' },
                  { name: 'Bluesky', color: '#0085ff', bg: 'rgba(0,133,255,0.12)' },
                  { name: 'Reddit', color: '#FF4500', bg: 'rgba(255,69,0,0.12)' },
                  { name: 'Pinterest', color: '#E60023', bg: 'rgba(230,0,35,0.12)' },
                  { name: 'Discord', color: '#5865F2', bg: 'rgba(88,101,242,0.12)' },
                  { name: '+ More', color: '#C8A24A', bg: 'rgba(200,162,74,0.12)' },
                ].map(p => (
                  <div key={p.name} className="aspect-square rounded-xl border flex items-center justify-center text-xs font-bold text-center p-2 transition-all hover:scale-105"
                    style={{ background: p.bg, borderColor: `${p.color}25`, color: p.color }}>{p.name}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LEAD CAPTURE */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Get Your <span className="bg-gradient-to-r from-[#C8A24A] to-[#E3C36A] bg-clip-text text-transparent">FREE AI Demo</span>
            </h2>
            <p className="text-gray-400">See how AI can transform your business in under 5 minutes</p>
          </div>
          <div id="lead-capture" className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 sm:p-12">
            {submitStatus === 'error' && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-red-400" /><p className="text-red-300">Sorry, there was an error. Please try again.</p>
              </div>
            )}
            {submitStatus !== 'success' && (
              <div className="mb-10">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  {questions.map((_, i) => (
                    <React.Fragment key={i}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${i < currentStep ? 'bg-green-500 text-white' : i === currentStep ? 'bg-[#C8A24A] text-black' : 'bg-gray-600 text-gray-400'}`}>
                        {i < currentStep ? <CheckCircle className="h-5 w-5" /> : i + 1}
                      </div>
                      {i < questions.length - 1 && <div className={`w-8 h-1 transition-all ${i < currentStep ? 'bg-green-500' : 'bg-gray-600'}`} />}
                    </React.Fragment>
                  ))}
                </div>
                <p className="text-center text-gray-400 text-sm">Step {currentStep + 1} of {questions.length}</p>
              </div>
            )}
            {submitStatus === 'success' ? (
              <div className="text-center py-12">
                <div className="bg-green-400/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="h-12 w-12 text-green-400" /></div>
                <h4 className="text-3xl font-bold mb-6">You're All Set!</h4>
                <p className="text-lg text-gray-300 mb-8">You can test out your demo agent here:</p>
                <a href={createdSlug ? `https://infinitewealthsolutionsai.com/demo/${createdSlug}` : 'https://infinitewealthsolutionsai.com/demo'}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-[#C8A24A] hover:bg-[#E3C36A] text-black font-bold py-4 px-8 rounded-xl transition-all">
                  <span>View Your Demo</span><ArrowRight className="h-5 w-5" />
                </a>
              </div>
            ) : (
              <div className="relative overflow-hidden">
                <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentStep * 100}%)` }}>
                  {questions.map((question, index) => (
                    <div key={question.id} className="w-full flex-shrink-0 px-4">
                      {question.title && (
                        <div className="text-center mb-8">
                          <h4 className="text-2xl font-bold mb-2">{question.title}
                            {question.subtitle && <span className="block text-sm font-normal text-gray-400 mt-1">{question.subtitle}</span>}
                          </h4>
                        </div>
                      )}
                      <div className="space-y-4">
                        {question.type === 'multi-input' ? (
                          <div className="space-y-4">
                            {question.fields?.map(field => (
                              <div key={field.id}>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  <field.icon className="inline h-4 w-4 mr-2" />{field.label}{field.required === false ? '' : ' *'}
                                </label>
                                {field.id === 'phone' ? (
                                  <div className="flex">
                                    <select value={formData.countryCode} onChange={e => setFormData(p => ({ ...p, countryCode: e.target.value }))}
                                      className="px-3 py-3 bg-gray-900/50 border border-gray-600 border-r-0 rounded-l-lg text-white focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A] transition-all">
                                      <option value="+1">🇨🇦 +1</option>
                                      <option value="+1">🇺🇸 +1</option>
                                      <option value="+44">🇬🇧 +44</option>
                                      <option value="+33">🇫🇷 +33</option>
                                      <option value="+49">🇩🇪 +49</option>
                                      <option value="+61">🇦🇺 +61</option>
                                    </select>
                                    <input type={field.type} name={field.id} value={formData[field.id]} onChange={handleInputChange}
                                      className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A] transition-all" placeholder="555-123-4567" />
                                  </div>
                                ) : (
                                  <input type={field.type} name={field.id} value={formData[field.id]} onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A] transition-all"
                                    placeholder={field.placeholder} />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <textarea name={question.id as string} value={formData[question.id as keyof FormData] as any} onChange={handleInputChange}
                            rows={question.rows || 4}
                            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8A24A]/50 focus:border-[#C8A24A] transition-all resize-vertical"
                            placeholder={question.placeholder} />
                        )}
                        {currentError && index === currentStep && <p className="mt-2 text-sm text-red-400">{currentError}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {submitStatus !== 'success' && (
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-700/50">
                <button type="button" onClick={() => { if (currentStep > 0) { setCurrentStep(s => s - 1); setCurrentError(''); } }} disabled={currentStep === 0}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${currentStep === 0 ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed' : 'bg-gray-600 text-white hover:bg-gray-700'}`}>
                  <ArrowLeft className="h-5 w-5" /><span>Previous</span>
                </button>
                <button type="button" onClick={handleNext} disabled={!isStepValid || isSubmitting}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 ${!isStepValid || isSubmitting ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed' : 'bg-[#C8A24A] text-black hover:bg-[#E3C36A]'}`}>
                  {isSubmitting ? (<><Loader className="h-5 w-5 animate-spin" /><span>Submitting...</span></>) :
                   currentStep === 2 ? (<><span>Submit</span><ArrowRight className="h-5 w-5" /></>) :
                   (<><span>Next</span><ArrowRight className="h-5 w-5" /></>)}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div id="pricing"><SubscriptionSection /></div>

      {/* FOOTER */}
      <footer className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-3"><Zap className="h-6 w-6 text-[#C8A24A]" /><span className="font-bold text-[#C8A24A]">Infinite Wealth Solutions AI</span></div>
              <p className="text-gray-500 text-sm">Transforming businesses with premium AI-powered digital solutions.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-300 mb-3 text-sm">Services</h4>
              <div className="space-y-2">
                <button onClick={() => setPhoneModal('voice')} className="block text-gray-500 hover:text-gray-400 text-sm transition-colors">AI Voice Agents</button>
                <Link to="/MediaMachine" className="block text-gray-500 hover:text-gray-400 text-sm transition-colors">Social Media Manager</Link>
                <a href="#services" className="block text-gray-500 hover:text-gray-400 text-sm transition-colors">Lead Generation</a>
                <a href="#services" className="block text-gray-500 hover:text-gray-400 text-sm transition-colors">Web Development</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-300 mb-3 text-sm">Legal</h4>
              <div className="space-y-2">
                <Link to="/privacy-policy" className="block text-gray-500 hover:text-gray-400 text-sm transition-colors">Privacy Policy</Link>
                <Link to="/terms-and-conditions" className="block text-gray-500 hover:text-gray-400 text-sm transition-colors">Terms & Conditions</Link>
                <Link to="/demo" className="block text-gray-500 hover:text-gray-400 text-sm transition-colors">AI Agent Demos</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center">
            <p className="text-gray-600 text-sm">© 2025 Infinite Wealth Solutions AI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* FLOATING PHONE AGENT */}
      <div className="fixed bottom-5 right-5 z-[60]">
        <button onClick={() => setPhoneModal('voice')}
          className="group flex items-center gap-3 rounded-2xl px-4 py-3 border backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition"
          style={{ borderColor: 'rgba(200,162,74,0.40)', backgroundColor: 'rgba(0,0,0,0.35)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(227,195,106,0.65)'; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,162,74,0.40)'; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.35)'; }}>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(200,162,74,0.18)' }}>
            <Phone className="h-5 w-5" style={{ color: GOLD_HOVER }} />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold leading-tight" style={{ color: GOLD_HOVER }}>Try Our AI Phone Agent</div>
            <div className="text-[11px] text-gray-300 leading-tight">Alex answers instantly</div>
          </div>
        </button>
      </div>

      {/* PHONE MODAL */}
      {phoneModal === 'voice' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-black/80 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.75)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
              <div className="font-bold">Try Our AI Phone Agent</div>
              <button className="text-gray-300 hover:text-white" onClick={closePhoneModal}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5">
              <div className="text-center min-h-[420px] flex flex-col items-center justify-center">
                <h3 className="text-xl font-bold mb-2" style={{ color: GOLD_PRIMARY }}>Alex — AI Voice Agent</h3>
                <p className="text-gray-300">
                  {voiceStatus === 'connecting' && 'Connecting…'}
                  {voiceStatus === 'live' && 'Live — speak normally.'}
                  {voiceStatus === 'ended' && 'Call ended.'}
                  {voiceStatus === 'error' && 'Could not start the call.'}
                  {voiceStatus === 'idle' && 'Ready.'}
                </p>
                {voiceError && <p className="mt-2 text-sm text-red-300">{voiceError}</p>}
                <button className="mt-8 w-28 h-28 rounded-full transition flex items-center justify-center"
                  style={{ backgroundColor: '#DC2626', boxShadow: '0 18px 60px rgba(0,0,0,0.6)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#B91C1C')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#DC2626')}
                  onClick={() => { try { vapiRef.current?.stop(); } catch {} setVoiceStatus('ended'); }}>
                  <PhoneOff className="h-10 w-10 text-white" />
                </button>
                <p className="mt-6 text-xs text-gray-400 max-w-sm">Your mic may prompt for permission. If it doesn't connect, close and try again.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}