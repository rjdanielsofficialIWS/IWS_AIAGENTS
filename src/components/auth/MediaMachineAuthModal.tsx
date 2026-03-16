import React, { useState } from 'react';
import { X, Loader, AlertCircle, Zap, Video, Share2, Sparkles, CalendarDays, Mic } from 'lucide-react';
import { supabase } from '../../services/vapiAI';

const GOLD   = '#D6B25E';
const GOLD_L = '#F0D27C';
const GOLD_D = '#8F6B1E';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const FEATURES = [
  { icon: <Video size={15} />,       title: 'AI Video Generation',       desc: 'Cinematic AI video from a single image with Kling v3 Pro' },
  { icon: <Share2 size={15} />,      title: 'Multi-Platform Publishing',  desc: 'Auto-publish to Instagram, TikTok, LinkedIn, YouTube & more' },
  { icon: <Sparkles size={15} />,    title: 'AI Caption Generator',       desc: 'Scroll-stopping captions optimized for every platform' },
  { icon: <CalendarDays size={15} />,title: 'AI Content Strategist',      desc: '30-day content calendars, hook libraries & platform strategies' },
  { icon: <Mic size={15} />,         title: 'AI Voice Agents',            desc: '24/7 automated conversations that qualify leads & close sales' },
];

export function MediaMachineAuthModal({ open, onClose, onSuccess }: Props) {
  const [mode, setMode]               = useState<'signin' | 'signup'>('signin');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [sent, setSent]               = useState(false);

  if (!open) return null;

  const reset = () => {
    setEmail(''); setPassword(''); setError(null);
    setSent(false); setLoading(false); setGoogleLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Enter your email address'); return; }
    if (!password)     { setError('Enter your password'); return; }
    setLoading(true); setError(null);
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
        setSent(true);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        reset(); onSuccess();
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true); setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href },
      });
      if (err) throw err;
    } catch (e: any) {
      setError(e.message || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes mmSpin    { to { transform: rotate(360deg); } }
        @keyframes mmFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mmSlideUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        @keyframes mmFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes mmFloatD  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        @keyframes mmShimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .mm2-shimmer {
          background: linear-gradient(90deg, ${GOLD_D} 0%, ${GOLD} 35%, ${GOLD_L} 50%, ${GOLD} 65%, ${GOLD_D} 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: mmShimmer 4s linear infinite;
        }
        .mm2-input:focus {
          border-color: ${GOLD} !important;
          box-shadow: 0 0 0 3px ${GOLD}22 !important;
          outline: none;
        }
        .mm2-google:hover:not(:disabled) { background: rgba(255,255,255,0.1) !important; border-color: rgba(255,255,255,0.22) !important; }
        .mm2-submit:hover:not(:disabled)  { filter: brightness(1.1); }
        .mm2-feature:hover { transform: translateX(5px); background: rgba(214,178,94,0.05); border-radius: 10px; }
        .mm2-feature { transition: transform 0.2s ease, background 0.2s ease; }
        .mm2-float  { animation: mmFloat  5s ease-in-out infinite; }
        .mm2-floatd { animation: mmFloatD 5s ease-in-out 2s infinite; }
        .mm2-fadein { animation: mmFadeIn  0.25s ease both; }
        .mm2-slide  { animation: mmSlideUp 0.45s ease both; }
      `}</style>

      {/* Full-screen overlay */}
      <div
        className="mm2-fadein"
        style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', background: '#000' }}
      >
        {/* ── Left marketing panel (md+) ── */}
        <div
          style={{
            display: 'none',
            width: '55%',
            flexDirection: 'column',
            padding: 'clamp(40px,5vw,72px)',
            background: 'linear-gradient(135deg, #090d12 0%, #0b0f14 60%, #0d0d0d 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
          className="mm2-left"
        >
          <style>{`
            @media (min-width: 768px) { .mm2-left { display: flex !important; } }
          `}</style>

          {/* Glow orbs */}
          <div className="mm2-float"  style={{ position: 'absolute', top: 60,  left: 0,    width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}06 0%, transparent 65%)`, pointerEvents: 'none' }} />
          <div className="mm2-floatd" style={{ position: 'absolute', bottom: 80, right: -40, width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}05 0%, transparent 65%)`, pointerEvents: 'none' }} />

          {/* Logo */}
          <div className="mm2-slide" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0, animationDelay: '0ms' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 8px 28px ${GOLD}35`,
            }}>
              <Zap size={18} color="#000" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: 18, lineHeight: 1, letterSpacing: '-0.02em' }}>MediaMachine</div>
              <div style={{ color: `${GOLD}80`, fontSize: 10, marginTop: 2, fontWeight: 600, letterSpacing: '0.06em' }}>by Infinite Wealth Solutions AI</div>
            </div>
          </div>

          {/* Main copy */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: 40, marginBottom: 32 }}>
            {/* Badge */}
            <div className="mm2-slide" style={{ animationDelay: '80ms', display: 'inline-flex', alignItems: 'center', gap: 6, background: `${GOLD}12`, border: `1px solid ${GOLD}22`, borderRadius: 999, padding: '4px 12px', marginBottom: 20, width: 'fit-content' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, display: 'inline-block', animation: 'mmSpin 0s, mmFadeIn 0s' }} className="animate-pulse" />
              <span style={{ color: GOLD, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI-Powered Content Engine</span>
            </div>

            <h1 className="mm2-slide" style={{ animationDelay: '140ms', fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', color: 'white', margin: '0 0 12px' }}>
              Turn Content Into<br />
              <span className="mm2-shimmer">Paying Clients</span>
            </h1>

            <p className="mm2-slide" style={{ animationDelay: '200ms', fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 380, margin: '0 0 32px' }}>
              The all-in-one AI platform that creates, optimizes, and publishes content across every platform — so you can focus on running your business.
            </p>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="mm2-feature mm2-slide"
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 10px', animationDelay: `${260 + i * 55}ms` }}
                >
                  <div style={{
                    flexShrink: 0, width: 30, height: 30, borderRadius: 8,
                    background: `${GOLD}12`, border: `1px solid ${GOLD}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: GOLD, marginTop: 1,
                  }}>
                    {f.icon}
                  </div>
                  <div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>{f.title}</div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, lineHeight: 1.5, marginTop: 1 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mm2-slide" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24, animationDelay: '560ms' }}>
            {[{ v: '10+', l: 'Social Platforms' }, { v: '30-Day', l: 'Content Calendars' }, { v: '5-in-1', l: 'AI Toolset' }].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{ color: GOLD, fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' }}>{s.v}</div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
          background: 'linear-gradient(160deg, #111 0%, #0d0d0d 50%, #0a0a0a 100%)',
          overflowY: 'auto',
          position: 'relative',
        }}>
          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}
          >
            <X size={16} />
          </button>

          {/* Mobile branding */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }} className="mm2-mobile-brand">
            <style>{`@media (min-width: 768px) { .mm2-mobile-brand { display: none !important; } }`}</style>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, boxShadow: `0 8px 24px ${GOLD}35` }}>
              <Zap size={20} color="#000" />
            </div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em' }}>MediaMachine</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2, fontWeight: 600, letterSpacing: '0.06em' }}>by Infinite Wealth Solutions AI</div>
          </div>

          {/* Card */}
          <div
            className="mm2-slide"
            style={{
              width: '100%', maxWidth: 400,
              background: 'linear-gradient(170deg, #1a1a1a 0%, #141414 100%)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: `0 24px 80px rgba(0,0,0,0.7), inset 0 0 0 1px ${GOLD}0a`,
            }}
          >
            {/* Gold top line */}
            <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${GOLD_D} 15%, ${GOLD} 40%, ${GOLD_L} 55%, ${GOLD} 75%, transparent)` }} />

            <div style={{ padding: '28px 28px 32px' }}>

              {sent ? (
                /* ── Email sent state ── */
                <div style={{ textAlign: 'center', paddingTop: 8, paddingBottom: 4 }}>
                  <div style={{ fontSize: 44, marginBottom: 18 }}>📬</div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: 'white', marginBottom: 10 }}>Check your email</div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, marginBottom: 28 }}>
                    We sent a confirmation link to{' '}
                    <strong style={{ color: GOLD_L }}>{email}</strong>.
                    Click it to finish creating your account.
                  </p>
                  <button
                    onClick={handleClose}
                    style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer', background: `linear-gradient(135deg,${GOLD_D},${GOLD} 50%,${GOLD_L})`, color: '#000', boxShadow: `0 8px 28px ${GOLD}45` }}
                  >
                    Got it
                  </button>
                </div>

              ) : (
                <>
                  {/* Heading */}
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                      {mode === 'signin' ? 'Welcome back' : 'Start for free'}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 5 }}>
                      {mode === 'signin' ? 'Sign in to your MediaMachine account' : 'Create your MediaMachine account'}
                    </p>
                  </div>

                  {/* Toggle */}
                  <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, marginBottom: 20, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {(['signin', 'signup'] as const).map(m => (
                      <button key={m}
                        onClick={() => { setMode(m); setError(null); }}
                        style={{
                          flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer',
                          fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
                          background: mode === m ? `${GOLD}1c` : 'transparent',
                          border: `1px solid ${mode === m ? GOLD + '70' : 'transparent'}`,
                          color: mode === m ? GOLD_L : 'rgba(255,255,255,0.32)',
                        }}
                      >
                        {m === 'signin' ? 'Sign In' : 'Create Account'}
                      </button>
                    ))}
                  </div>

                  {/* Google */}
                  <button
                    className="mm2-google"
                    onClick={handleGoogle}
                    disabled={loading || googleLoading}
                    style={{
                      width: '100%', padding: '12px 0', borderRadius: 12, cursor: 'pointer',
                      fontSize: 14, fontWeight: 700, marginBottom: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.88)', transition: 'all 0.15s',
                      opacity: googleLoading ? 0.65 : 1,
                    }}
                  >
                    {googleLoading ? (
                      <Loader size={17} style={{ animation: 'mmSpin 0.9s linear infinite', color: GOLD }} />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                        <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                        <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
                        <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
                        <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
                      </svg>
                    )}
                    {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                  </button>

                  {/* Divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>or email</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                  </div>

                  {/* Email */}
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Email</label>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      placeholder="you@example.com" autoFocus
                      className="mm2-input"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, fontSize: 14, color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                    />
                  </div>

                  {/* Password */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Password</label>
                    <input
                      type="password" value={password} onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                      placeholder={mode === 'signup' ? 'Choose a strong password' : 'Your password'}
                      className="mm2-input"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, fontSize: 14, color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 10, marginBottom: 14, background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.28)', fontSize: 12, color: '#fca5a5' }}>
                      <AlertCircle size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    className="mm2-submit"
                    onClick={handleSubmit}
                    disabled={loading || googleLoading}
                    style={{
                      width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                      fontSize: 14, fontWeight: 800, cursor: 'pointer',
                      background: `linear-gradient(135deg,${GOLD_D},${GOLD} 50%,${GOLD_L})`,
                      color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: `0 6px 26px ${GOLD}40`,
                      opacity: loading ? 0.65 : 1, transition: 'opacity 0.15s, filter 0.15s',
                    }}
                  >
                    {loading ? (
                      <><Loader size={16} style={{ animation: 'mmSpin 0.9s linear infinite' }} />
                      {mode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
                    ) : (
                      mode === 'signin' ? 'Sign In' : 'Create Free Account'
                    )}
                  </button>

                  {mode === 'signup' && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
                      By creating an account you agree to our{' '}
                      <a href="/terms-and-conditions" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'underline' }}>terms</a>
                      {' & '}
                      <a href="/privacy-policy" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'underline' }}>privacy policy</a>.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
