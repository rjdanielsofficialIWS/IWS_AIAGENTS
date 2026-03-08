import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../../services/vapiAI';

const GOLD   = '#D6B25E';
const GOLD_L = '#F0D27C';
const GOLD_D = '#8F6B1E';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void; // called after successful sign-in/up
}

type Mode = 'signin' | 'signup';

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

  if (!open) return null;

  const reset = () => {
    setEmail(''); setPassword(''); setConfirm('');
    setError(null); setSuccess(null); setLoading(false);
  };

  const switchMode = (m: Mode) => { setMode(m); reset(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.'); return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }

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
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/mediamachine`,
        },
      });
      if (error) throw error;
      // Page will redirect — onSuccess fires via auth state change after return
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
      setGoogleLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
    >
      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(160deg, #161616 0%, #1c1c1c 100%)',
          border: '1px solid rgba(214,178,94,0.15)',
        }}
      >
        {/* Gold top accent line */}
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 transition-colors"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-7 pt-8 pb-7">
          {/* Logo mark */}
          <div className="flex flex-col items-center mb-7">
            <svg width="36" height="42" viewBox="0 0 240 280" className="mb-3">
              <defs>
                <linearGradient id="amg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={GOLD_D}/>
                  <stop offset="50%" stopColor={GOLD}/>
                  <stop offset="100%" stopColor={GOLD_D}/>
                </linearGradient>
              </defs>
              <path d="M120 8 C165 32 205 38 238 48 V145 C238 198 180 238 120 278 C60 238 2 198 2 145 V48 C35 38 75 32 120 8Z"
                fill="#0d0d0d" stroke="url(#amg)" strokeWidth="10"/>
              <text x="120" y="158" textAnchor="middle"
                fontFamily="ui-sans-serif,system-ui,sans-serif"
                fontSize="68" fontWeight="900" letterSpacing="3" fill="url(#amg)">IWS</text>
            </svg>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {mode === 'signin' ? 'Sign in to MediaMachine' : 'Create your account'}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {mode === 'signin' ? 'Connect and manage your social channels' : 'Get started — it only takes a moment'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 px-3 py-2.5 rounded-xl text-sm"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}>
              {success}
            </div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-2.5 text-sm font-600 transition-all mb-4"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 600,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `rgba(214,178,94,0.3)`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'rgba(255,255,255,0.25)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onFocus={e => (e.target.style.borderColor = `rgba(214,178,94,0.5)`)}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'rgba(255,255,255,0.25)' }} />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onFocus={e => (e.target.style.borderColor = `rgba(214,178,94,0.5)`)}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.25)' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = GOLD)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)')}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Confirm password (signup only) */}
            {mode === 'signup' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={e => (e.target.style.borderColor = `rgba(214,178,94,0.5)`)}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-all mt-1 flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})`,
                color: '#0d0d0d',
                opacity: loading || googleLoading ? 0.7 : 1,
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Switch mode */}
          <p className="mt-5 text-center text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
              className="font-semibold transition-colors"
              style={{ color: GOLD }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = GOLD_L)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = GOLD)}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}