import React, { useState, useEffect } from 'react';
import { X, Loader, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '../../services/vapiAI';

const GOLD   = '#D6B25E';
const GOLD_L = '#F0D27C';
const GOLD_D = '#8F6B1E';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function MediaMachineAuthModal({ open, onClose, onSuccess }: Props) {
  const [mode, setMode]           = useState<'signin' | 'signup'>('signin');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [sent, setSent]           = useState(false);

  // Blur trigger element on open so mobile keyboard doesn't auto-pop
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 50);
    }
  }, [open]);

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
        reset();
        onSuccess();
        window.location.href = '/InfiniteMedia';
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
        options: { redirectTo: window.location.href.split('#')[0].split('?')[0]},
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
        .mm2-fadein { animation: mmFadeIn  0.2s ease both; }
        .mm2-slide  { animation: mmSlideUp 0.35s ease both; }
      `}</style>

      {/* Backdrop */}
      <div
        className="mm2-fadein"
        onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(12px)',
          padding: '16px',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'fixed', top: 16, right: 16,
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <X size={16} />
        </button>

        {/* Card */}
        <div
          className="mm2-slide"
          style={{
            width: '100%', maxWidth: 420,
            background: 'linear-gradient(170deg, #1a1a1a 0%, #141414 100%)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: `0 32px 80px rgba(0,0,0,0.8), inset 0 0 0 1px ${GOLD}0a`,
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          {/* Gold top line */}
          <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${GOLD_D} 15%, ${GOLD} 40%, ${GOLD_L} 55%, ${GOLD} 75%, transparent)` }} />

          <div style={{ padding: '28px 28px 32px' }}>

            {/* Branding */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, boxShadow: `0 8px 24px ${GOLD}35` }}>
                <Zap size={22} color="#000" />
              </div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em' }}>Infinite Media</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 2, fontWeight: 600, letterSpacing: '0.06em' }}>by Infinite Wealth Solutions AI</div>
            </div>

            {false ? null : (
              <>
                {/* Heading */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                    {mode === 'signin' ? 'Welcome back' : 'Start for free'}
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 5 }}>
                    {mode === 'signin' ? 'Sign in to your Infinite Media account' : 'Create your Infinite Media account'}
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
                  {googleLoading ? 'Redirecting to Google…' : 'Continue with Google'}
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
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="you@example.com"
                    className="mm2-input"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, fontSize: 14, color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
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
                    opacity: loading ? 0.65 : 1,
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
    </>
  );
}
