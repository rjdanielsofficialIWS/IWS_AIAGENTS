import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, PhoneOff, Mail, User, Building, Globe,
  MessageSquare, CheckCircle, AlertCircle, Loader, ArrowLeft, ArrowRight,
  Calendar, X, Share2, Sparkles, Menu, Zap,
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
const HOME_VAPI_FIRST_MESSAGE = 'Infinite Wealth Solutions AI, Alex speaking, how may I help you?';

const useCases = [
  {
    scenario: 'A lead calls at midnight. Your AI agent answers, qualifies them, and books the appointment without you lifting a finger.',
    service: 'AI Phone Agents',
    icon: <Phone className="h-4 w-4" />,
  },
  {
    scenario: 'Your sales rep is busy. AI dials the prospect list, handles objections, and hands off only the interested ones, warm and ready to close.',
    service: 'AI Phone Agents',
    icon: <Phone className="h-4 w-4" />,
  },
  {
    scenario: 'You record one video. AI extracts the transcript, writes platform-specific captions, and schedules posts across every channel automatically.',
    service: 'Social Media Manager',
    icon: <Share2 className="h-4 w-4" />,
  },
  {
    scenario: 'You take a week off. Your content calendar stays full, posts go out on schedule, and your audience keeps growing without you.',
    service: 'Social Media Manager',
    icon: <Share2 className="h-4 w-4" />,
  },
  {
    scenario: 'Your competitor has a slick website. Yours actually converts because it was built around your specific audience and buying journey.',
    service: 'Web Design',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    scenario: 'A prospect visits at 2am and has questions. Your site answers them, builds trust, and drops a booking link before they even think about leaving.',
    service: 'Web Design',
    icon: <Zap className="h-4 w-4" />,
  },
];

const serviceTagColors: Record<string, { bg: string; text: string; border: string }> = {
  'AI Phone Agents':      { bg: 'rgba(200,162,74,0.10)', text: '#C8A24A', border: 'rgba(200,162,74,0.30)' },
  'Social Media Manager': { bg: 'rgba(139,92,246,0.10)', text: '#a78bfa', border: 'rgba(139,92,246,0.30)' },
  'Web Design':           { bg: 'rgba(34,197,94,0.10)',  text: '#4ade80', border: 'rgba(34,197,94,0.30)'  },
};

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
    { id: 'industryServices', title: 'Industry and Services', type: 'textarea' as const, placeholder: 'Example: Plumbing, drain cleaning, water heaters, emergency calls, etc.', rows: 4, icon: MessageSquare, required: true },
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
              <a href="#use-cases" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">Use Cases</a>
              <Link to="/MediaMachine" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">Social Media</Link>
              <a href="#pricing" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">Pricing</a>
            </div>
            <div className="flex items-center space-x-3">
              <a href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding" target="_blank" rel="noopener noreferrer"
                className="hidden sm:flex items-center space-x-2 bg-[#C8A24A] hover:bg-[#E3C36A] text-black font-bold py-2 px-4 rounded-xl transition-all text-sm">
                <Calendar className="h-4 w-4" /><span>Book Consultation</span>
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
              <a href="#use-cases" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all">Use Cases</a>
              <Link to="/MediaMachine" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all">Social Media Manager</Link>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all">Pricing</a>
              <div className="pt-2">
                <a href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 bg-[#C8A24A] text-black font-bold py-2.5 px-4 rounded-xl text-sm">
                  <Calendar className="h-4 w-4" /><span>Book Consultation</span>
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
            <span className="text-sm text-[#C8A24A] font-semibold">The AI Growth Stack for Modern Businesses</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
            <span className="gold-shimmer block font-extrabold">Infinite Wealth Solutions</span>
            <span className="block mt-3 text-white font-bold">Your business runs. We make sure it never stops.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-12 leading-relaxed max-w-3xl mx-auto">
            We build AI systems that multiply your output. One video becomes 30 pieces of content, every missed call becomes a booked appointment, and your business grows even when you're offline.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
            <button data-track="cta" data-track-label="Get a Package Quote"
              onClick={() => document.getElementById('lead-capture')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/25 flex items-center justify-center space-x-3">
              <MessageSquare className="h-6 w-6" /><span>Get a Free AI Demo</span>
            </button>
            <a href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding" target="_blank" rel="noopener noreferrer"
              className="w-full sm:w-auto bg-[#C8A24A] hover:bg-[#E3C36A] text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-black/30 flex items-center justify-center space-x-3">
              <Calendar className="h-6 w-6" /><span>Book Consultation</span>
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {[{ value: '24/7', label: 'Always On' }, { value: '3x', label: 'Services, 1 Stack' }, { value: '100%', label: 'Built for Growth' }].map(s => (
              <div key={s.label}><div className="text-2xl font-black text-[#C8A24A]">{s.value}</div><div className="text-xs text-gray-500 mt-0.5">{s.label}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section id="use-cases" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
              One Input.{' '}
              <span className="bg-gradient-to-r from-[#C8A24A] to-[#E3C36A] bg-clip-text text-transparent">Infinite Output.</span>
            </h2>
            <p className="text-gray-400 text-lg">See how our AI systems turn a single action into compounding results across your entire business.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {useCases.map((uc, i) => {
              const tag = serviceTagColors[uc.service];
              return (
                <div key={i}
                  className="border rounded-xl p-6 flex flex-col gap-4 transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.13)' }}>
                  <p className="text-gray-300 text-sm leading-relaxed flex-1">"{uc.scenario}"</p>
                  <div className="flex items-center gap-2 mt-auto">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
                      style={{ background: tag.bg, color: tag.text, borderColor: tag.border }}>
                      {uc.icon}{uc.service}
                    </span>
                  </div>
                </div>
              );
            })}
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
                  <span className="text-sm text-[#C8A24A] font-semibold">Media Machine, The Content Multiplication Engine</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                  Turn One Video Into 30 Pieces of Content{' '}
                  <span className="bg-gradient-to-r from-[#C8A24A] to-[#E3C36A] bg-clip-text text-transparent">Across Every Platform</span>
                </h2>
                <p className="text-gray-300 text-lg leading-relaxed mb-8">
                  Most creators spend hours making content for one platform. Media Machine flips that model. Upload a video and our AI extracts the transcript, analyzes your content strategy, generates tailored posts for every platform, and schedules everything automatically. You get 10 to 20 assets from a single upload.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    'AI generates platform-specific captions from your video transcript',
                    'Auto-schedules across TikTok, Instagram, LinkedIn, YouTube, X, and 15 more platforms',
                    'Visual content calendar shows your entire pipeline at a glance',
                    'AI suggests future content ideas based on your past performance',
                    'Agencies can manage multiple brands from one dashboard',
                  ].map(f => (
                    <div key={f} className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-[#C8A24A] shrink-0" />
                      <span className="text-gray-300 text-sm">{f}</span>
                    </div>
                  ))}
                </div>
                <Link to="/MediaMachine" className="inline-flex items-center space-x-3 bg-[#C8A24A] hover:bg-[#E3C36A] text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02]">
                  <Share2 className="h-5 w-5" /><span>Start Multiplying Your Content</span><ArrowRight className="h-5 w-5" />
                </Link>
              </div>

              {/* Platform grid — exact SVGs from MediaDistributionPage, no boxes */}
              <div className="grid grid-cols-4 gap-x-6 gap-y-7">
                {[
                  { name: 'Instagram', color: '#E1306C', svg: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
                  { name: 'Facebook', color: '#1877F2', svg: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                  { name: 'TikTok', color: '#ffffff', svg: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.86 1.56V6.79a4.85 4.85 0 01-1.09-.1z' },
                  { name: 'YouTube', color: '#FF0000', svg: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
                  { name: 'X (Twitter)', color: '#ffffff', svg: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                  { name: 'LinkedIn', color: '#0A66C2', svg: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
                  { name: 'Threads', color: '#ffffff', svg: 'M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 011.435.027c-.092-.866-.345-1.449-.764-1.727-.474-.315-1.208-.454-2.116-.408-.717.038-1.395.234-1.97.57l-.898-1.754c.86-.47 1.868-.739 2.949-.789 1.505-.073 2.748.247 3.614.928.867.683 1.35 1.737 1.434 3.131.02.274.023.55.009.825l.001.013c.011.16.02.32.027.482.048 1.265.08 2.107-.024 2.948-.133 1.09-.478 2.032-1.048 2.806-1.237 1.673-3.147 2.616-5.49 2.73zm.041-8.99c-1.052.077-1.863.4-2.307.872-.39.417-.555.947-.496 1.596.086.95.783 1.532 2.016 1.46.927-.052 1.637-.435 2.11-1.137.54-.8.738-1.923.574-3.343a11.548 11.548 0 00-1.897-.448z' },
                  { name: 'Bluesky', color: '#0085ff', svg: 'M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.299-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z' },
                  { name: 'Pinterest', color: '#E60023', svg: 'M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z' },
                  { name: 'Reddit', color: '#FF4500', svg: 'M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z' },
                  { name: 'Discord', color: '#5865F2', svg: 'M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.01.043.027.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z' },
                  { name: '19+ More', color: '#C8A24A', svg: null },
                ].map(p => (
                  <div key={p.name} className="flex flex-col items-center gap-2 cursor-default group">
                    <div className="transition-transform group-hover:scale-110">
                      {p.svg ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8" style={{ color: p.color }}>
                          <path d={p.svg} />
                        </svg>
                      ) : (
                        <span className="w-8 h-8 flex items-center justify-center text-2xl font-black" style={{ color: p.color }}>+</span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-center leading-tight text-white/50 group-hover:text-white/80 transition-colors">{p.name}</span>
                  </div>
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
              Get Your <span className="bg-gradient-to-r from-[#C8A24A] to-[#E3C36A] bg-clip-text text-transparent">Free AI Demo</span>
            </h2>
            <p className="text-gray-400">Tell us about your business and we'll build you a custom AI demo. Free, no strings attached.</p>
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
                <h4 className="text-3xl font-bold mb-6">You're In. Let's Build.</h4>
                <p className="text-lg text-gray-300 mb-8">Your custom AI agent is being built. Test it out here:</p>
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
            {isSubmitting && (
              <p className="text-center text-sm text-gray-400 mt-4 animate-pulse">
                Building your custom AI agent. This may take up to 60 seconds…
              </p>
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
              <p className="text-gray-500 text-sm">We build AI systems that multiply your output, capture every lead, and keep your business growing around the clock.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-300 mb-3 text-sm">Services</h4>
              <div className="space-y-2">
                <button onClick={() => setPhoneModal('voice')} className="block text-gray-500 hover:text-gray-400 text-sm transition-colors">AI Voice Agents</button>
                <Link to="/MediaMachine" className="block text-gray-500 hover:text-gray-400 text-sm transition-colors">Social Media Manager</Link>
                <a href="#pricing" className="block text-gray-500 hover:text-gray-400 text-sm transition-colors">Web Development</a>
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
            <div className="text-sm font-bold leading-tight" style={{ color: GOLD_HOVER }}>Talk to Our AI Agent</div>
            <div className="text-[11px] text-gray-300 leading-tight">Available 24/7. Try it now.</div>
          </div>
        </button>
      </div>

      {/* PHONE MODAL */}
      {phoneModal === 'voice' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-black/80 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.75)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
              <div className="font-bold">Talk to Our AI Agent</div>
              <button className="text-gray-300 hover:text-white" onClick={closePhoneModal}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5">
              <div className="text-center min-h-[420px] flex flex-col items-center justify-center">
                <h3 className="text-xl font-bold mb-2" style={{ color: GOLD_PRIMARY }}>Alex, AI Voice Agent</h3>
                <p className="text-gray-300">
                  {voiceStatus === 'connecting' && 'Connecting…'}
                  {voiceStatus === 'live' && 'Live. Speak normally.'}
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
