import React, { useState } from 'react';
import { X, Loader, AlertCircle, Send } from 'lucide-react';
import { supabase } from '../../services/vapiAI';

const GOLD   = '#D6B25E';
const GOLD_L = '#F0D27C';
const GOLD_D = '#8F6B1E';
const BORDER = 'rgba(255,255,255,0.08)';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function MediaMachineAuthModal({ open, onClose, onSuccess }: Props) {
  const [mode, setMode]                   = useState<'signin' | 'signup'>('signin');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [sent, setSent]                   = useState(false);

  if (!open) return null;

  const reset = () => {
    setEmail(''); setPassword(''); setError(null);
    setSent(false); setLoading(false); setGoogleLoading(false);
  };

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
        @keyframes mmAuthUp {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes mmGoldShimmer {
          0%,100% { background-position: 0% 50%; }
          55%     { background-position: 100% 50%; }
        }
        @keyframes mmSpin { to { transform: rotate(360deg); } }
        .mm-shimmer-text {
          background-image: linear-gradient(110deg,#8f6b1e 0%,#d6b25e 25%,#f7e199 40%,#d6b25e 55%,#8f6b1e 80%);
          background-size: 240% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: mmGoldShimmer 4s ease-in-out infinite;
        }
        .mm-input:focus {
          border-color: ${GOLD} !important;
          box-shadow: 0 0 0 3px ${GOLD}22 !important;
        }
        .mm-google-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.1) !important;
          border-color: rgba(255,255,255,0.22) !important;
        }
        .mm-submit-btn:hover:not(:disabled) { filter: brightness(1.12); }
        @media (min-width: 768px) {
          .mm-auth-outer { align-items: center !important; padding: 16px !important; }
          .mm-auth-card  { border-radius: 24px !important; border-bottom: 1px solid ${BORDER} !important; }
        }
      `}</style>

      {/* Overlay */}
      <div
        className="mm-auth-outer"
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
      >
        <div
          onClick={() => { reset(); onClose(); }}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(12px)' }}
        />

        {/* Card */}
        <div
          className="mm-auth-card"
          style={{
            position: 'relative', width: '100%', maxWidth: 420,
            borderRadius: '24px 24px 0 0',
            border: `1px solid rgba(255,255,255,0.1)`,
            borderBottom: 'none',
            background: 'linear-gradient(170deg,#181818 0%,#111 50%,#0e0e0e 100%)',
            boxShadow: `0 -32px 80px rgba(0,0,0,0.8), inset 0 0 0 1px ${GOLD}0f`,
            overflow: 'hidden',
            animation: 'mmAuthUp 0.32s cubic-bezier(0.34,1.3,0.64,1) both',
          }}
        >
          {/* Gold shimmer top line */}
          <div style={{
            height: 3,
            background: `linear-gradient(90deg, transparent, ${GOLD_D} 15%, ${GOLD} 40%, ${GOLD_L} 55%, ${GOLD} 75%, transparent)`,
          }} />

          {/* Close */}
          <button
            onClick={() => { reset(); onClose(); }}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 32, height: 32, borderRadius: 9,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.13)';
              (e.currentTarget as HTMLElement).style.color = '#fff';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)';
            }}
          >
            <X size={15} />
          </button>

          <div style={{ padding: '28px 28px 36px' }}>

            {/* ── Email confirmed state ── */}
            {sent ? (
              <div style={{ textAlign: 'center', paddingTop: 8, paddingBottom: 4 }}>
                <div style={{ fontSize: 44, marginBottom: 18 }}>📬</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: 'white', marginBottom: 10 }}>
                  Check your email
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, marginBottom: 28 }}>
                  We sent a confirmation link to{' '}
                  <strong style={{ color: GOLD_L }}>{email}</strong>.
                  Click it to finish creating your account.
                </p>
                <button
                  onClick={() => { reset(); onClose(); }}
                  style={{
                    width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                    fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    background: `linear-gradient(135deg,${GOLD_D},${GOLD} 50%,${GOLD_L})`,
                    color: '#000', boxShadow: `0 8px 28px ${GOLD}45`,
                  }}
                >
                  Got it
                </button>
              </div>

            ) : (
              <>
                {/* Logo + brand */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 26 }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: 16, marginBottom: 14,
                    background: `linear-gradient(135deg,${GOLD_D},${GOLD},${GOLD_L})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 10px 36px ${GOLD}55`,
                  }}>
                    <Send size={22} color="#000" />
                  </div>
                  <span className="mm-shimmer-text" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em' }}>
                    Media Machine
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
                    color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginTop: 5,
                  }}>
                    by Infinite Wealth Solutions AI
                  </span>
                </div>

                {/* Sign In / Create Account toggle */}
                <div style={{
                  display: 'flex', gap: 5, padding: 4, borderRadius: 14, marginBottom: 22,
                  background: 'rgba(0,0,0,0.35)', border: `1px solid ${BORDER}`,
                }}>
                  {(['signin', 'signup'] as const).map(m => (
                    <button key={m}
                      onClick={() => { setMode(m); setError(null); }}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer',
                        fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
                        background: mode === m ? `${GOLD}1c` : 'transparent',
                        border: `1px solid ${mode === m ? GOLD + '70' : 'transparent'}`,
                        color: mode === m ? GOLD_L : 'rgba(255,255,255,0.32)',
                        boxShadow: mode === m ? `0 2px 14px ${GOLD}22` : 'none',
                      }}
                    >
                      {m === 'signin' ? 'Sign In' : 'Create Account'}
                    </button>
                  ))}
                </div>

                {/* Google OAuth */}
                <button
                  className="mm-google-btn"
                  onClick={handleGoogle}
                  disabled={loading || googleLoading}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 13, cursor: 'pointer',
                    fontSize: 14, fontWeight: 700, marginBottom: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    background: 'rgba(255,255,255,0.055)',
                    border: '1px solid rgba(255,255,255,0.13)',
                    color: 'rgba(255,255,255,0.88)',
                    transition: 'all 0.15s',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    or email
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                </div>

                {/* Email */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'block', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="you@example.com"
                    autoFocus
                    className="mm-input"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '11px 14px', borderRadius: 11,
                      fontSize: 14, color: 'white',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${BORDER}`,
                      outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.09em', display: 'block', marginBottom: 6 }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder={mode === 'signup' ? 'Choose a strong password' : 'Your password'}
                    className="mm-input"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '11px 14px', borderRadius: 11,
                      fontSize: 14, color: 'white',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${BORDER}`,
                      outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                  />
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '10px 12px', borderRadius: 10, marginBottom: 16,
                    background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.28)',
                    fontSize: 12, color: '#fca5a5',
                  }}>
                    <AlertCircle size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  className="mm-submit-btn"
                  onClick={handleSubmit}
                  disabled={loading || googleLoading}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 14, border: 'none',
                    fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    background: `linear-gradient(135deg,${GOLD_D},${GOLD} 50%,${GOLD_L})`,
                    color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: `0 6px 26px ${GOLD}40`,
                    opacity: loading ? 0.65 : 1,
                    transition: 'opacity 0.15s, filter 0.15s',
                  }}
                >
                  {loading ? (
                    <><Loader size={16} style={{ animation: 'mmSpin 0.9s linear infinite' }} />
                    {mode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
                  ) : (
                    mode === 'signin' ? 'Sign In' : 'Create Account'
                  )}
                </button>

                {mode === 'signup' && (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
                    By creating an account you agree to our terms of service.
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
