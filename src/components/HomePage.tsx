import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
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
    scenario: 'A lead calls at midnight. Your AI voice agent answers, qualifies them with smart conversation, and books the appointment — without you lifting a finger.',
    service: 'AI Phone Agents',
    icon: <Phone className="h-4 w-4" />,
  },
  {
    scenario: 'Your sales pipeline needs calls made. AI dials your prospect list, handles objections naturally, and transfers only the warm, interested leads directly to you.',
    service: 'AI Phone Agents',
    icon: <Phone className="h-4 w-4" />,
  },
  {
    scenario: 'You record one video. Our AI caption generator extracts the transcript, writes platform-specific posts, and auto-schedules them across 15+ channels instantly.',
    service: 'Social Media Manager',
    icon: <Share2 className="h-4 w-4" />,
  },
  {
    scenario: 'You take a week off. Your AI-powered content calendar stays full, posts publish on schedule, and your audience keeps growing — on autopilot.',
    service: 'Social Media Manager',
    icon: <Share2 className="h-4 w-4" />,
  },
  {
    scenario: 'Your competitor has a website. Yours has an AI-powered 24/7 receptionist that answers questions, builds trust, and drops a booking link before visitors even think of leaving.',
    service: 'Web Design',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    scenario: 'You need leads, not just traffic. We build conversion-first websites engineered around your specific audience, buying journey, and AI automation stack.',
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
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: 'linear-gradient(to bottom, #080808, #0d0d0d)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
        .gold-shimmer { background-image: linear-gradient(110deg, #b9892b 0%, #f7dc8a 20%, #ffffff 30%, #f1d27b 40%, #b9892b 60%, #f7dc8a 80%, #ffffff 90%, #b9892b 100%); background-size: 240% 100%; background-position: 0% 50%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: goldShimmerSweep 5s ease-in-out infinite; }
        @keyframes goldShimmerSweep { 0% { background-position: 0% 50%; } 55% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes iwsFadeUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
        @keyframes iwsFloatOrb { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-18px) scale(1.04); } }
        @keyframes iwsPulseGold { 0%,100% { box-shadow: 0 0 0 0 rgba(200,162,74,0.5); } 50% { box-shadow: 0 0 0 8px rgba(200,162,74,0); } }
        .iws-nav-link { color: rgba(255,255,255,0.42); font-weight: 600; font-size: 13.5px; padding: 8px 16px; border-radius: 10px; transition: color 0.2s, background 0.2s; position: relative; font-family: 'DM Sans', system-ui, sans-serif; }
        .iws-nav-link:hover { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.05); }
        .iws-use-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 28px 26px; transition: border-color 0.25s, background 0.25s, transform 0.25s; }
        .iws-use-card:hover { border-color: rgba(200,162,74,0.28); background: rgba(200,162,74,0.035); transform: translateY(-3px); }
        .iws-form-input { width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.11); border-radius: 13px; color: white; font-size: 15px; font-family: 'DM Sans', system-ui, sans-serif; transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; outline: none; }
        .iws-form-input:focus { border-color: rgba(200,162,74,0.55); background: rgba(255,255,255,0.055); box-shadow: 0 0 0 3px rgba(200,162,74,0.09); }
        .iws-form-input::placeholder { color: rgba(255,255,255,0.22); }
        select.iws-form-input option { background: #1a1a1a; }
        .iws-platform-icon { transition: transform 0.2s; cursor: default; }
        .iws-platform-icon:hover { transform: translateY(-4px); }
      `}</style>

      {/* Background atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{ position: 'absolute', width: 1000, height: 700, borderRadius: '50%', background: `radial-gradient(ellipse, rgba(200,162,74,0.11) 0%, transparent 65%)`, top: `${-280 + bgOffset}px`, left: '50%', transform: 'translateX(-50%)', filter: 'blur(48px)', animation: 'iwsFloatOrb 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 500, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(200,162,74,0.05) 0%, transparent 65%)', bottom: '15%', right: '-5%', filter: 'blur(60px)', animation: 'iwsFloatOrb 18s ease-in-out 3s infinite' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.012) 1px, transparent 0)', backgroundSize: '52px 52px' }} />
      </div>

      {/* NAV */}
      <motion.nav
        initial={{ y: -68, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'sticky', top: 0, zIndex: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)', background: 'rgba(8,8,8,0.88)', height: 68, display: 'flex', alignItems: 'center' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg, #7a5c18, #C8A24A, #E3C36A)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 18px rgba(200,162,74,0.38)', flexShrink: 0 }}>
              <Zap className="h-5 w-5 text-black" />
            </div>
            <div>
              <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 13, fontWeight: 800, color: 'white', letterSpacing: '0.05em', lineHeight: 1.15 }}>INFINITE WEALTH</div>
              <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 9.5, fontWeight: 700, color: '#C8A24A', letterSpacing: '0.14em', lineHeight: 1.15 }}>SOLUTIONS AI</div>
            </div>
          </div>

          <div className="hidden lg:flex items-center" style={{ gap: 2 }}>
            <a href="#use-cases" className="iws-nav-link">Use Cases</a>
            <Link to="/InfiniteMedia" className="iws-nav-link">Infinite Media</Link>
            <a href="#pricing" className="iws-nav-link">Pricing</a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/InfiniteMedia" className="hidden sm:flex items-center gap-2"
              style={{ padding: '9px 20px', borderRadius: 99, background: 'linear-gradient(135deg, #7a5c18, #C8A24A)', color: '#000', fontWeight: 800, fontSize: 13, fontFamily: "'DM Sans', system-ui, sans-serif", boxShadow: '0 4px 18px rgba(200,162,74,0.32)', transition: 'filter 0.15s, transform 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
              Infinite Media
            </Link>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden" style={{ padding: 8, color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'rgba(8,8,8,0.98)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '10px 16px 16px' }}>
            <a href="#use-cases" onClick={() => setMobileMenuOpen(false)} className="block" style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>Use Cases</a>
            <Link to="/InfiniteMedia" onClick={() => setMobileMenuOpen(false)} className="block" style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>Infinite Media</Link>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block" style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>Pricing</a>
            <div style={{ marginTop: 10, padding: '0 16px' }}>
              <Link to="/InfiniteMedia" style={{ display: 'block', textAlign: 'center', padding: '13px 0', borderRadius: 14, background: 'linear-gradient(135deg, #7a5c18, #C8A24A)', color: '#000', fontWeight: 800, fontSize: 14, fontFamily: "'DM Sans', system-ui, sans-serif" }}>Infinite Media</Link>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </motion.nav>

      {/* HERO */}
      <section style={{ position: 'relative', zIndex: 1, minHeight: 'calc(100dvh - 68px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }}
          style={{ maxWidth: 900, width: '100%', textAlign: 'center' }}>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,162,74,0.08)', border: '1px solid rgba(200,162,74,0.22)', borderRadius: 99, padding: '6px 18px', marginBottom: 36 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#C8A24A', display: 'inline-block', animation: 'iwsPulseGold 2.5s ease-in-out infinite' }} />
            <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: '#C8A24A', fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>AI Voice Agents · Social Media Automation · Lead Generation</span>
          </motion.div>

          <motion.h1
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } } }}
            style={{ margin: '0 0 10px', lineHeight: 1 }}>
            <span className="gold-shimmer" style={{ display: 'block', fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(52px, 10vw, 120px)', fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 0.92 }}>
              Infinite Wealth
            </span>
          </motion.h1>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } }}
            style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(18px, 3.2vw, 38px)', fontWeight: 400, color: 'rgba(255,255,255,0.55)', letterSpacing: '-0.01em', marginBottom: 32, lineHeight: 1.2, fontStyle: 'italic' }}>
            Solutions AI
          </motion.div>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } }}
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 'clamp(16px, 2vw, 21px)', color: 'rgba(255,255,255,0.48)', lineHeight: 1.7, maxWidth: 680, margin: '0 auto 48px', fontWeight: 400 }}>
            AI voice agents that answer calls and book appointments 24/7. Social media automation that turns one video into 30 platform-optimized posts. Custom AI systems that grow your business around the clock — without you being in the room.
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 60 }} className="sm:flex-row sm:justify-center">
            <button data-track="cta" data-track-label="Get a Package Quote"
              onClick={() => document.getElementById('lead-capture')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px 36px', borderRadius: 16, background: 'linear-gradient(135deg, #14532d, #16a34a)', color: 'white', fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 8px 32px rgba(22,163,74,0.28)', transition: 'filter 0.15s, transform 0.15s', width: '100%', maxWidth: 280, fontFamily: "'DM Sans', system-ui, sans-serif" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
              <MessageSquare className="h-5 w-5" /><span>Get a Free AI Demo</span>
            </button>
            <Link to="/InfiniteMedia"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px 36px', borderRadius: 16, background: 'linear-gradient(135deg, #7a5c18, #C8A24A)', color: '#000', fontWeight: 800, fontSize: 16, boxShadow: '0 8px 32px rgba(200,162,74,0.22)', transition: 'filter 0.15s, transform 0.15s', width: '100%', maxWidth: 280, fontFamily: "'DM Sans', system-ui, sans-serif" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.08)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
              <Share2 className="h-5 w-5" /><span>Infinite Media</span>
            </Link>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}
            style={{ display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden', maxWidth: 440, margin: '0 auto' }}>
            {[{ value: '24/7', label: 'Always On' }, { value: '3×', label: 'Services, 1 Stack' }, { value: '∞', label: 'Growth Potential' }].map((s, i) => (
              <div key={s.label} style={{ flex: 1, padding: '20px 12px', textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", color: '#C8A24A', fontWeight: 400, fontSize: 26, letterSpacing: '-0.01em' }}>{s.value}</div>
                <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.28)', fontSize: 11, marginTop: 4, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* USE CASES */}
      <section id="use-cases" style={{ position: 'relative', zIndex: 1, padding: '100px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 99, padding: '4px 14px', marginBottom: 22 }}>
              <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Real-World Scenarios</span>
            </div>
            <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(30px, 5vw, 58px)', fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.06, marginBottom: 16 }}>
              One Input.{' '}
              <span style={{ background: 'linear-gradient(135deg, #C8A24A, #E3C36A)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Infinite Output.</span>
            </h2>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.38)', fontSize: 18, maxWidth: 560, margin: '0 auto' }}>
              Real scenarios where AI voice agents, social media automation, and AI content generation compound your results across every channel.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
            {useCases.map((uc, i) => {
              const tag = serviceTagColors[uc.service];
              const num = String(i + 1).padStart(2, '0');
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.55, delay: (i % 3) * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="iws-use-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                    <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 38, fontWeight: 400, color: 'rgba(255,255,255,0.055)', letterSpacing: '-0.01em', lineHeight: 1 }}>{num}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, border: '1px solid', background: tag.bg, color: tag.text, borderColor: tag.border, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                      {uc.icon}{uc.service}
                    </span>
                  </div>
                  <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.55)', fontSize: 14.5, lineHeight: 1.75, fontStyle: 'italic' }}>"{uc.scenario}"</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* INFINITE MEDIA SPOTLIGHT */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: 'linear-gradient(135deg, rgba(200,162,74,0.055) 0%, rgba(255,255,255,0.015) 100%)', border: '1px solid rgba(200,162,74,0.16)', borderRadius: 28, padding: 'clamp(32px, 5vw, 64px)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,162,74,0.07), transparent 65%)', top: '-100px', right: '-100px', pointerEvents: 'none' }} />

            <div className="block lg:grid" style={{ gap: 64, alignItems: 'center' }}>
              <div style={{ gridColumn: '1', marginBottom: 40 }} className="lg:mb-0">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(200,162,74,0.08)', border: '1px solid rgba(200,162,74,0.2)', borderRadius: 99, padding: '5px 14px', marginBottom: 24 }}>
                  <Share2 className="h-4 w-4" style={{ color: '#C8A24A' }} />
                  <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: '#C8A24A', fontSize: 12, fontWeight: 700 }}>Content Multiplication Engine</span>
                </div>
                <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.1, marginBottom: 20 }}>
                  Turn One Video Into{' '}
                  <span style={{ background: 'linear-gradient(135deg, #C8A24A, #E3C36A)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>30 Assets</span>
                  {' '}Across Every Platform
                </h2>
                <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.5)', fontSize: 16, lineHeight: 1.75, marginBottom: 28 }}>
                  Upload once. Our AI content repurposing engine extracts your transcript, generates platform-specific captions optimized for each audience, and auto-schedules across 15+ networks simultaneously. One upload, unlimited reach.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 36 }}>
                  {[
                    'AI caption generator — custom hooks, CTAs, and hashtags per platform',
                    'Auto-publishes to TikTok, Instagram, LinkedIn, YouTube, X, Threads & 12+ more',
                    'Visual content calendar — see your full multi-platform pipeline at a glance',
                    'AI content repurposing & strategy built around your niche and trending topics',
                    'Agency dashboard — manage unlimited brands and clients from one workspace',
                  ].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 99, background: 'rgba(200,162,74,0.14)', border: '1px solid rgba(200,162,74,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <CheckCircle className="h-3 w-3" style={{ color: '#C8A24A' }} />
                      </div>
                      <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.65 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link to="/InfiniteMedia"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 32px', borderRadius: 15, background: 'linear-gradient(135deg, #7a5c18, #C8A24A)', color: '#000', fontWeight: 800, fontSize: 15, fontFamily: "'DM Sans', system-ui, sans-serif", boxShadow: '0 6px 24px rgba(200,162,74,0.28)', transition: 'filter 0.15s, transform 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                  <Share2 className="h-5 w-5" /><span>Start Multiplying Your Content</span><ArrowRight className="h-5 w-5" />
                </Link>
              </div>

              {/* Platform grid */}
              <div style={{ gridColumn: '2', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px 20px', marginTop: 8 }}>
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
                  { name: '+ 6 More', color: '#C8A24A', svg: null },
                ].map(p => (
                  <div key={p.name} className="iws-platform-icon" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
                    {p.svg ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 34, height: 34, color: p.color, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}>
                        <path d={p.svg} />
                      </svg>
                    ) : (
                      <span style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: p.color, fontFamily: "'DM Sans', system-ui, sans-serif" }}>+</span>
                    )}
                    <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.38)', textAlign: 'center', lineHeight: 1.3 }}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* LEAD CAPTURE */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(26px, 4vw, 46px)', fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 12 }}>
              Get Your{' '}
              <span style={{ background: 'linear-gradient(135deg, #C8A24A, #E3C36A)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Free AI Demo</span>
            </h2>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.38)', fontSize: 16 }}>
              Tell us about your business and we'll build you a custom AI voice agent demo — trained on your services, ready to book appointments. Free, no strings attached.
            </p>
          </div>

          <motion.div
            id="lead-capture"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 24, padding: 'clamp(24px, 5vw, 48px)', backdropFilter: 'blur(12px)' }}>
            {submitStatus === 'error' && (
              <div style={{ marginBottom: 24, padding: '14px 18px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
                <AlertCircle className="h-5 w-5 shrink-0" style={{ color: '#f87171' }} />
                <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: '#fca5a5', fontSize: 14 }}>Sorry, there was an error. Please try again.</p>
              </div>
            )}

            {submitStatus !== 'success' && (
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                  {questions.map((_, i) => (
                    <React.Fragment key={i}>
                      <div style={{ width: 36, height: 36, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, transition: 'all 0.3s', background: i < currentStep ? '#16a34a' : i === currentStep ? '#C8A24A' : 'rgba(255,255,255,0.07)', color: i < currentStep ? 'white' : i === currentStep ? '#000' : 'rgba(255,255,255,0.28)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                        {i < currentStep ? <CheckCircle className="h-4 w-4" /> : i + 1}
                      </div>
                      {i < questions.length - 1 && <div style={{ width: 36, height: 1, background: i < currentStep ? '#16a34a' : 'rgba(255,255,255,0.09)', transition: 'background 0.3s' }} />}
                    </React.Fragment>
                  ))}
                </div>
                <p style={{ textAlign: 'center', fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.28)', fontSize: 12 }}>Step {currentStep + 1} of {questions.length}</p>
              </div>
            )}

            {submitStatus === 'success' ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ width: 80, height: 80, borderRadius: 99, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <CheckCircle className="h-10 w-10" style={{ color: '#4ade80' }} />
                </div>
                <h4 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 28, fontWeight: 400, marginBottom: 12 }}>You're In. Let's Build.</h4>
                <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.45)', fontSize: 16, marginBottom: 28 }}>Your custom AI agent is being built. Test it out here:</p>
                <a href={createdSlug ? `https://infinitewealthsolutionsai.com/demo/${createdSlug}` : 'https://infinitewealthsolutionsai.com/demo'}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 32px', borderRadius: 14, background: 'linear-gradient(135deg, #7a5c18, #C8A24A)', color: '#000', fontWeight: 800, fontSize: 16, fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'filter 0.15s' }}>
                  <span>View Your Demo</span><ArrowRight className="h-5 w-5" />
                </a>
              </div>
            ) : (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)', transform: `translateX(-${currentStep * 100}%)` }}>
                  {questions.map((question, index) => (
                    <div key={question.id} style={{ width: '100%', flexShrink: 0, padding: '0 2px' }}>
                      {question.title && (
                        <div style={{ textAlign: 'center', marginBottom: 28 }}>
                          <h4 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, fontWeight: 400, marginBottom: 6 }}>{question.title}</h4>
                          {question.subtitle && <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.38)', fontSize: 13 }}>{question.subtitle}</span>}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {question.type === 'multi-input' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {question.fields?.map(field => (
                              <div key={field.id}>
                                <label style={{ display: 'block', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
                                  <field.icon className="inline h-3.5 w-3.5 mr-1.5" style={{ verticalAlign: 'middle' }} />
                                  {field.label}{field.required === false ? '' : ' *'}
                                </label>
                                {field.id === 'phone' ? (
                                  <div style={{ display: 'flex' }}>
                                    <select value={formData.countryCode} onChange={e => setFormData(p => ({ ...p, countryCode: e.target.value }))}
                                      className="iws-form-input" style={{ width: 100, borderRadius: '13px 0 0 13px', borderRight: 'none', flexShrink: 0 }}>
                                      <option value="+1">🇨🇦 +1</option>
                                      <option value="+1">🇺🇸 +1</option>
                                      <option value="+44">🇬🇧 +44</option>
                                      <option value="+33">🇫🇷 +33</option>
                                      <option value="+49">🇩🇪 +49</option>
                                      <option value="+61">🇦🇺 +61</option>
                                    </select>
                                    <input type={field.type} name={field.id} value={formData[field.id]} onChange={handleInputChange}
                                      className="iws-form-input" style={{ borderRadius: '0 13px 13px 0', flex: 1 }} placeholder="555-123-4567" />
                                  </div>
                                ) : (
                                  <input type={field.type} name={field.id} value={formData[field.id]} onChange={handleInputChange}
                                    className="iws-form-input" placeholder={field.placeholder} />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <textarea name={question.id as string} value={formData[question.id as keyof FormData] as any} onChange={handleInputChange}
                            rows={question.rows || 4}
                            className="iws-form-input" style={{ resize: 'vertical' }}
                            placeholder={question.placeholder} />
                        )}
                        {currentError && index === currentStep && (
                          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: '#f87171', fontSize: 13 }}>{currentError}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {submitStatus !== 'success' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button type="button" onClick={() => { if (currentStep > 0) { setCurrentStep(s => s - 1); setCurrentError(''); } }} disabled={currentStep === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, background: currentStep === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)', color: currentStep === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.55)', border: 'none', cursor: currentStep === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, transition: 'all 0.15s', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  <ArrowLeft className="h-4 w-4" /><span>Previous</span>
                </button>
                <button type="button" onClick={handleNext} disabled={!isStepValid || isSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14, background: !isStepValid || isSubmitting ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #7a5c18, #C8A24A)', color: !isStepValid || isSubmitting ? 'rgba(255,255,255,0.22)' : '#000', border: 'none', cursor: !isStepValid || isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 15, transition: 'all 0.15s', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                  {isSubmitting ? (<><Loader className="h-4 w-4 animate-spin" /><span>Submitting...</span></>) :
                   currentStep === 2 ? (<><span>Submit</span><ArrowRight className="h-4 w-4" /></>) :
                   (<><span>Next</span><ArrowRight className="h-4 w-4" /></>)}
                </button>
              </div>
            )}
            {isSubmitting && (
              <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.28)', marginTop: 16 }}>
                Building your custom AI agent. This may take up to 60 seconds…
              </p>
            )}
          </motion.div>
        </div>
      </section>

      <div id="pricing"><SubscriptionSection /></div>

      {/* FOOTER */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '56px 24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #7a5c18, #C8A24A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap className="h-4 w-4 text-black" />
                </div>
                <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 800, color: '#C8A24A', fontSize: 13 }}>Infinite Wealth Solutions AI</span>
              </div>
              <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.28)', fontSize: 13, lineHeight: 1.75 }}>
                AI systems that multiply your output, capture every lead, and keep your business growing around the clock.
              </p>
            </div>
            <div>
              <h4 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, color: 'rgba(255,255,255,0.38)', marginBottom: 18, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Services</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button onClick={() => setPhoneModal('voice')} style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.28)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, transition: 'color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.28)')}>AI Voice Agents</button>
                <Link to="/InfiniteMedia" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.28)', fontSize: 13, transition: 'color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.28)')}>Infinite Media</Link>
                <a href="#pricing" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.28)', fontSize: 13, transition: 'color 0.15s' }}>Web Development</a>
              </div>
            </div>
            <div>
              <h4 style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, color: 'rgba(255,255,255,0.38)', marginBottom: 18, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Legal</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Link to="/privacy-policy" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.28)', fontSize: 13, transition: 'color 0.15s' }}>Privacy Policy</Link>
                <Link to="/terms-and-conditions" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.28)', fontSize: 13, transition: 'color 0.15s' }}>Terms & Conditions</Link>
                <Link to="/demo" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.28)', fontSize: 13, transition: 'color 0.15s' }}>AI Agent Demos</Link>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, textAlign: 'center' }}>
            <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.18)', fontSize: 12 }}>© 2025 Infinite Wealth Solutions AI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* FLOATING PHONE AGENT */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5, type: 'spring', stiffness: 200, damping: 18 }}
        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 60 }}>
        <button onClick={() => setPhoneModal('voice')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(8,8,8,0.92)', border: '1px solid rgba(200,162,74,0.32)', borderRadius: 18, padding: '12px 18px', backdropFilter: 'blur(20px)', boxShadow: '0 16px 48px rgba(0,0,0,0.55)', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,162,74,0.6)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(200,162,74,0.18)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,162,74,0.32)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(0,0,0,0.55)'; }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(200,162,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'iwsPulseGold 3s ease-in-out infinite' }}>
            <Phone className="h-5 w-5" style={{ color: GOLD_HOVER }} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 13, fontWeight: 800, color: GOLD_HOVER, lineHeight: 1.2 }}>Talk to Our AI Agent</div>
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.3 }}>Available 24/7. Try it now.</div>
          </div>
        </button>
      </motion.div>

      {/* PHONE MODAL */}
      <AnimatePresence>
      {phoneModal === 'voice' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', padding: 16 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: 'linear-gradient(160deg, #111111, #0c0c0c)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 24, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.85)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 800, fontSize: 16 }}>Talk to Our AI Agent</div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.38)', padding: 4, display: 'flex' }} onClick={closePhoneModal}><X className="h-5 w-5" /></button>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ textAlign: 'center', minHeight: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #7a5c18, #C8A24A)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, boxShadow: '0 8px 32px rgba(200,162,74,0.32)' }}>
                  <Phone className="h-8 w-8 text-black" />
                </div>
                <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 20, fontWeight: 400, color: '#C8A24A', marginBottom: 10 }}>Alex, AI Voice Agent</h3>
                <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: 'rgba(255,255,255,0.45)', fontSize: 15, marginBottom: 32 }}>
                  {voiceStatus === 'connecting' && 'Connecting…'}
                  {voiceStatus === 'live' && '● Live. Speak normally.'}
                  {voiceStatus === 'ended' && 'Call ended.'}
                  {voiceStatus === 'error' && 'Could not start the call.'}
                  {voiceStatus === 'idle' && 'Ready.'}
                </p>
                {voiceError && <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{voiceError}</p>}
                <button
                  style={{ width: 100, height: 100, borderRadius: 99, background: voiceStatus === 'live' ? '#16a34a' : '#dc2626', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 12px 40px ${voiceStatus === 'live' ? 'rgba(22,163,74,0.5)' : 'rgba(220,38,38,0.5)'}`, transition: 'all 0.2s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.12)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'}
                  onClick={() => { try { vapiRef.current?.stop(); } catch {} setVoiceStatus('ended'); }}>
                  <PhoneOff className="h-10 w-10 text-white" />
                </button>
                <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.22)', maxWidth: 280, lineHeight: 1.65 }}>
                  Your mic may prompt for permission. If it doesn't connect, close and try again.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
