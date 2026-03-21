import React, { useState, useEffect } from 'react';
import { X, Loader, AlertCircle, Zap, CheckCircle2 } from 'lucide-react';
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
  const [mode, setMode]                   = useState<'signin' | 'signup'>('signin');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [sent, setSent]                   = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
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
        options: { redirectTo: window.location.href.split('#')[0].split('?')[0] },
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
        @keyframes mmSpin      { to { transform: rotate(360deg); } }
        @keyframes mmFadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mmSlideUp   { from { opacity: 0; transform: translateY(24px) scale(0.98); } to { opacity: 1; transform: none; } }
        @keyframes mmOrb1      { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.08); } }
        @keyframes mmOrb2      { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,40px) scale(1.06); } }
        @keyframes mmShimmer   { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes mmPulse     { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes mmBeam      { 0% { transform: translateX(-40vw) skewX(-12deg); opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { transform: translateX(160vw) skewX(-12deg); opacity: 0; } }
        @keyframes mmCardGlow  { 0%,100% { box-shadow: 0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px ${GOLD}12, inset 0 1px 0 rgba(255,255,255,0.06); } 50% { box-shadow: 0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px ${GOLD}40, 0 0 60px ${GOLD}10, inset 0 1px 0 rgba(255,255,255,0.06); } }
        @keyframes mmRingPulse { 0%,100% { transform: scale(1); opacity: 0.55; } 50% { transform: scale(1.22); opacity: 0; } }
        .mm3-shimmer {
          background: linear-gradient(90deg, ${GOLD_D} 0%, ${GOLD} 35%, ${GOLD_L} 50%, ${GOLD} 65%, ${GOLD_D} 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: mmShimmer 3s linear infinite;
        }
        .mm3-card-glow { animation: mmCardGlow 5s ease-in-out infinite; }
        .mm3-benefit {
          display: flex; align-items: center; gap: 10px;
          padding: 7px 0; font-size: 12.5px; color: rgba(255,255,255,0.45);
        }
        .mm3-benefit + .mm3-benefit { border-top: 1px solid rgba(255,255,255,0.04); }
        .mm3-input {
          width: 100%; box-sizing: border-box;
          padding: 13px 16px; border-radius: 12px;
          font-size: 14px; color: white;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          outline: none;
        }
        .mm3-input::placeholder { color: rgba(255,255,255,0.22); }
        .mm3-input:focus {
          border-color: ${GOLD}90 !important;
          box-shadow: 0 0 0 3px ${GOLD}18, 0 1px 8px ${GOLD}15 !important;
          background: rgba(255,255,255,0.06) !important;
        }
        .mm3-google {
          width: 100%; padding: 13px 0; border-radius: 12px; cursor: pointer;
          font-size: 14px; font-weight: 600;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.85);
          transition: all 0.2s;
        }
        .mm3-google:hover:not(:disabled) {
          background: rgba(255,255,255,0.09) !important;
          border-color: rgba(255,255,255,0.2) !important;
          transform: translateY(-1px);
        }
        .mm3-submit {
          width: 100%; padding: 14px 0; border-radius: 12px; border: none;
          font-size: 14px; font-weight: 800; cursor: pointer; letter-spacing: 0.01em;
          background: linear-gradient(135deg, ${GOLD_D} 0%, ${GOLD} 45%, ${GOLD_L} 100%);
          color: #000;
          box-shadow: 0 6px 28px ${GOLD}35, 0 2px 8px ${GOLD}20;
          transition: all 0.2s;
          position: relative; overflow: hidden;
        }
        .mm3-submit::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 100%);
          background-size: 200% 100%; background-position: -100% 0;
          transition: background-position 0.5s;
        }
        .mm3-submit:hover:not(:disabled)::after { background-position: 100% 0; }
        .mm3-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 36px ${GOLD}50, 0 4px 12px ${GOLD}30;
        }
        .mm3-submit:active:not(:disabled) { transform: scale(0.99); }
        .mm3-tab {
          flex: 1; padding: 10px 0; border-radius: 9px; cursor: pointer;
          font-size: 13px; font-weight: 700; transition: all 0.2s;
          border: 1px solid transparent;
        }
        .mm3-fadein { animation: mmFadeIn  0.25s ease both; }
        .mm3-slide  { animation: mmSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      {/* Backdrop */}
      <div
        className="mm3-fadein"
        onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(4,4,4,0.88)', backdropFilter: 'blur(16px)',
          padding: '16px', overflow: 'hidden',
        }}
      >
        {/* Ambient orbs */}
        <div style={{ position: 'absolute', top: '15%', right: '20%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)`, filter: 'blur(60px)', animation: 'mmOrb1 8s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'mmOrb2 10s ease-in-out infinite', pointerEvents: 'none' }} />

        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.4, pointerEvents: 'none' }} />

        {/* Sweeping light beam */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '35vw', height: '100%', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.012) 50%, transparent 100%)', pointerEvents: 'none', animation: 'mmBeam 12s ease-in-out 3s infinite' }} />

        {/* Close */}
        <button
          onClick={handleClose}
          style={{
            position: 'fixed', top: 16, right: 16,
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; }}
        >
          <X size={15} />
        </button>

        {/* Card */}
        <div
          className="mm3-slide mm3-card-glow"
          style={{
            width: '100%', maxWidth: 440, position: 'relative',
            background: 'linear-gradient(175deg, #111111 0%, #0c0c0c 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            maxHeight: '92vh', overflowY: 'auto',
          }}
        >
          {/* Top accent line */}
          <div style={{ height: 2, borderRadius: '24px 24px 0 0', background: `linear-gradient(90deg, transparent 0%, ${GOLD_D} 20%, ${GOLD} 45%, ${GOLD_L} 55%, ${GOLD} 75%, transparent 100%)` }} />

          <div style={{ padding: '32px 32px 36px' }}>

            {sent ? (
              /* ── Confirm email state ── */
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: `${GOLD}15`, border: `1px solid ${GOLD}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle2 size={28} color={GOLD} />
                </div>
                <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Check your inbox</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6, margin: '0 0 28px' }}>
                  We sent a confirmation link to<br />
                  <span style={{ color: GOLD, fontWeight: 600 }}>{email}</span>
                </p>
                <button
                  onClick={() => { setSent(false); setMode('signin'); }}
                  className="mm3-submit"
                  style={{ padding: '12px 0', fontSize: 13 }}
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                {/* Branding */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
                  <div style={{ position: 'relative', width: 52, height: 52, marginBottom: 14 }}>
                    <div style={{ position: 'absolute', inset: -18, borderRadius: '50%', border: `1px solid ${GOLD}28`, animation: 'mmRingPulse 3.5s ease-in-out infinite' }} />
                    <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: `1px solid ${GOLD}18`, animation: 'mmRingPulse 3.5s ease-in-out 1.75s infinite' }} />
                    <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}30 0%, transparent 70%)`, filter: 'blur(8px)' }} />
                    <div style={{ position: 'relative', width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD} 50%, ${GOLD_L})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 32px ${GOLD}45` }}>
                      <Zap size={24} color="#000" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 19, letterSpacing: '-0.03em', color: 'white' }}>Infinite Media</div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.28)', marginTop: 3, textTransform: 'uppercase' }}>by Infinite Wealth Solutions AI</div>
                </div>

                {/* Heading */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
                    {mode === 'signin' ? 'Welcome back' : 'Start for free'}
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13, margin: 0 }}>
                    {mode === 'signin' ? 'Sign in to your Infinite Media account' : 'Create your account — no credit card needed'}
                  </p>
                </div>

                {/* Tab toggle */}
                <div style={{ display: 'flex', gap: 3, padding: 4, borderRadius: 13, marginBottom: 22, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {(['signin', 'signup'] as const).map(m => (
                    <button
                      key={m}
                      className="mm3-tab"
                      onClick={() => { setMode(m); setError(null); }}
                      style={{
                        background: mode === m ? `linear-gradient(135deg, ${GOLD}15, ${GOLD}0d)` : 'transparent',
                        borderColor: mode === m ? `${GOLD}50` : 'transparent',
                        color: mode === m ? GOLD_L : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {m === 'signin' ? 'Sign In' : 'Create Account'}
                    </button>
                  ))}
                </div>

                {/* Google */}
                <button
                  className="mm3-google"
                  onClick={handleGoogle}
                  disabled={loading || googleLoading}
                  style={{ marginBottom: 18, opacity: loading || googleLoading ? 0.6 : 1 }}
                >
                  {googleLoading ? (
                    <Loader size={16} style={{ animation: 'mmSpin 0.9s linear infinite', color: GOLD }} />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>or continue with email</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>

                {/* Email */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="you@example.com"
                    className="mm3-input"
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder={mode === 'signup' ? 'Choose a strong password' : '••••••••••'}
                    className="mm3-input"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '11px 14px', borderRadius: 11, marginBottom: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', fontSize: 12, color: '#fca5a5', lineHeight: 1.5 }}>
                    <AlertCircle size={13} style={{ marginTop: 1, flexShrink: 0, color: '#f87171' }} />
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  className="mm3-submit"
                  onClick={handleSubmit}
                  disabled={loading || googleLoading}
                  style={{ opacity: loading || googleLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {loading ? (
                    <><Loader size={15} style={{ animation: 'mmSpin 0.9s linear infinite' }} />{mode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
                  ) : (
                    mode === 'signin' ? 'Sign In' : 'Create Free Account'
                  )}
                </button>

                {/* Benefit list + social proof (signup only) */}
                {mode === 'signup' && (
                  <>
                    <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>Everything included</div>
                      {[
                        'AI-powered content generation',
                        'Auto-repurpose videos for any platform',
                        'Smart multi-platform scheduling',
                        'Publish to 10+ channels at once',
                      ].map(f => (
                        <div key={f} className="mm3-benefit">
                          <CheckCircle2 size={12} style={{ color: GOLD, flexShrink: 0 }} />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
                      <div style={{ display: 'flex' }}>
                        {[GOLD, GOLD_D, GOLD_L, 'rgba(255,255,255,0.25)'].map((c, i) => (
                          <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: '1.5px solid #0c0c0c', marginLeft: i ? -6 : 0 }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>Trusted by 2,000+ creators</span>
                    </div>
                  </>
                )}

                {mode === 'signup' && (
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.16)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
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
