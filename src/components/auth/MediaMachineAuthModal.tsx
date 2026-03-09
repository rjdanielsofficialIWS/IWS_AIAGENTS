import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../../services/vapiAI';

const GOLD   = '#D6B25E';
const GOLD_L = '#F0D27C';
const GOLD_D = '#8F6B1E';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = 'signin' | 'signup' | 'forgot';

export function MediaMachineAuthModal({ open, onClose, onSuccess }: Props) {
  const [mode, setMode]           = useState<Mode>('signin');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);
  const [mounted, setMounted]     = useState(false);

  useEffect(() => {
    if (open) { setMounted(false); requestAnimationFrame(() => setMounted(true)); }
    else { setMounted(false); }
  }, [open]);

  if (!open) return null;

  const reset = () => {
    setEmail(''); setPassword(''); setConfirm('');
    setError(null); setSuccess(null); setLoading(false);
  };

  const switchMode = (m: Mode) => { setMode(m); reset(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);

    if (mode === 'forgot') {
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/MediaMachine`,
        });
        if (error) throw error;
        setSuccess('Password reset link sent — check your inbox.');
      } catch (err: any) {
        setError(err.message || 'Something went wrong.');
      } finally { setLoading(false); }
      return;
    }

    if (mode === 'signup' && password !== confirm) { setError('Passwords do not match.'); return; }
    if (mode !== 'forgot' && password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onSuccess();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Check your email to confirm your account, then sign in.');
        setMode('signin');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true); setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/MediaMachine` },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
      setGoogleLoading(false);
    }
  };

  const titles: Record<Mode, { h: string; sub: string }> = {
    signin:  { h: 'Welcome back',        sub: 'Sign in to your Media Machine account' },
    signup:  { h: 'Create an account',   sub: 'Start managing your social channels today' },
    forgot:  { h: 'Reset password',      sub: "We'll send a link to your inbox" },
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(16px)',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Animated glow blob */}
      <div style={{
        position: 'absolute',
        width: 400, height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${GOLD}18 0%, transparent 70%)`,
        top: '50%', left: '50%',
        transform: `translate(-50%, -50%) scale(${mounted ? 1 : 0.8})`,
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        pointerEvents: 'none',
      }} />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 400,
          borderRadius: 20,
          background: 'linear-gradient(160deg, #161616 0%, #1a1a1a 100%)',
          border: `1px solid rgba(214,178,94,0.18)`,
          boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 32px 64px rgba(0,0,0,0.6), 0 0 80px ${GOLD}10`,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          overflow: 'hidden',
        }}
      >
        {/* Top shimmer line */}
        <div style={{
          height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${GOLD}90 40%, ${GOLD_L} 50%, ${GOLD}90 60%, transparent 100%)`,
        }} />

        {/* Header strip */}
        <div style={{
          padding: '20px 24px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Brand mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={14} color="#000" />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
              Media Machine
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.3)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '24px 24px 28px' }}>
          {/* Title */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>
              {titles[mode].h}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4, margin: '4px 0 0' }}>
              {titles[mode].sub}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div style={{
              marginBottom: 16, padding: '10px 14px', borderRadius: 10, fontSize: 13,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5',
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              marginBottom: 16, padding: '10px 14px', borderRadius: 10, fontSize: 13,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac',
            }}>
              {success}
            </div>
          )}

          {/* Google button (not on forgot) */}
          {mode !== 'forgot' && (
            <>
              <button
                onClick={handleGoogle}
                disabled={googleLoading || loading}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 10, padding: '11px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                  marginBottom: 16, opacity: googleLoading || loading ? 0.6 : 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(214,178,94,0.35)`; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              >
                {googleLoading ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                  </svg>
                )}
                Continue with Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontWeight: 600, letterSpacing: '0.05em' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <InputField
              type="email" value={email} onChange={setEmail}
              placeholder="Email address" icon={<Mail size={14} />}
            />

            {mode !== 'forgot' && (
              <InputField
                type={showPw ? 'text' : 'password'} value={password} onChange={setPassword}
                placeholder="Password" icon={<Lock size={14} />}
                suffix={
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', transition: 'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />
            )}

            {mode === 'signup' && (
              <InputField
                type={showPw ? 'text' : 'password'} value={confirm} onChange={setConfirm}
                placeholder="Confirm password" icon={<Lock size={14} />}
              />
            )}

            {/* Forgot password link */}
            {mode === 'signin' && (
              <button type="button" onClick={() => switchMode('forgot')}
                style={{ alignSelf: 'flex-end', fontSize: 12, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s', marginTop: -2 }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                Forgot password?
              </button>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              style={{
                marginTop: 6, width: '100%', padding: '12px 16px',
                borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: `linear-gradient(135deg, ${GOLD_D} 0%, ${GOLD} 50%, ${GOLD_L} 100%)`,
                color: '#0d0d0d', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading || googleLoading ? 0.65 : 1,
                transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
                boxShadow: `0 4px 20px ${GOLD}30`,
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${GOLD}45`; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 20px ${GOLD}30`; }}
            >
              {loading
                ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                : <ArrowRight size={15} />
              }
              {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </button>
          </form>

          {/* Switch mode */}
          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            {mode === 'signin' ? (
              <>Don't have an account?{' '}
                <SwitchBtn onClick={() => switchMode('signup')}>Sign up free</SwitchBtn>
              </>
            ) : mode === 'signup' ? (
              <>Already have an account?{' '}
                <SwitchBtn onClick={() => switchMode('signin')}>Sign in</SwitchBtn>
              </>
            ) : (
              <SwitchBtn onClick={() => switchMode('signin')}>← Back to sign in</SwitchBtn>
            )}
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function InputField({ type, value, onChange, placeholder, icon, suffix }: {
  type: string; value: string; onChange: (v: string) => void;
  placeholder: string; icon: React.ReactNode; suffix?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center',
      background: focused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${focused ? 'rgba(214,178,94,0.45)' : 'rgba(255,255,255,0.09)'}`,
      borderRadius: 12, transition: 'border-color 0.15s, background 0.15s',
    }}>
      <span style={{ position: 'absolute', left: 12, color: focused ? '#D6B25E' : 'rgba(255,255,255,0.25)', transition: 'color 0.15s', display: 'flex', pointerEvents: 'none' }}>
        {icon}
      </span>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          flex: 1, paddingLeft: 36, paddingRight: suffix ? 36 : 14,
          paddingTop: 11, paddingBottom: 11,
          fontSize: 13, color: 'white', background: 'transparent',
          border: 'none', outline: 'none',
        }}
      />
      {suffix && (
        <span style={{ position: 'absolute', right: 12, display: 'flex', alignItems: 'center' }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

function SwitchBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      style={{ color: '#D6B25E', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0, transition: 'color 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#F0D27C')}
      onMouseLeave={e => (e.currentTarget.style.color = '#D6B25E')}
    >
      {children}
    </button>
  );
}
