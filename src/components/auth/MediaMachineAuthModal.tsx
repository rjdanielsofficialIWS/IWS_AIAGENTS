import React, { useState } from 'react';
import { X, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/vapiAI';

const GOLD   = '#D6B25E';
const GOLD_L = '#F0D27C';
const GOLD_D = '#8F6B1E';
const BORDER = 'rgba(255,255,255,0.08)';
const SURFACE = 'rgba(255,255,255,0.04)';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function MediaMachineAuthModal({ open, onClose, onSuccess }: Props) {
  const [mode, setMode]         = useState<'signin' | 'signup'>('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [sent, setSent]         = useState(false);

  if (!open) return null;

  const reset = () => {
    setEmail(''); setPassword(''); setError(null); setSent(false); setLoading(false);
  };

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Enter your email address'); return; }
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
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full md:max-w-sm rounded-t-2xl md:rounded-2xl border overflow-hidden shadow-2xl flex flex-col"
        style={{ background: '#111', borderColor: BORDER }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER }}>
          <div>
            <h2 className="text-base font-bold text-white">
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-xs text-white/40 mt-0.5">Media Machine by Infinite Wealth Solutions AI</p>
          </div>
          <button
            onClick={() => { reset(); onClose(); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {sent ? (
            <div className="text-center py-4 space-y-2">
              <div className="text-2xl">📬</div>
              <div className="text-sm font-bold text-white">Check your email</div>
              <p className="text-xs text-white/40">We sent a confirmation link to <strong className="text-white/60">{email}</strong>. Click it to activate your account.</p>
              <button
                onClick={() => { reset(); onClose(); }}
                className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold transition hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000' }}
              >
                Got it
              </button>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${BORDER}` }}>
                {(['signin', 'signup'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(null); }}
                    className="flex-1 py-2 rounded-lg text-xs font-bold transition"
                    style={{
                      background: mode === m ? `${GOLD}18` : 'transparent',
                      border: `1px solid ${mode === m ? GOLD : 'transparent'}`,
                      color: mode === m ? GOLD_L : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {m === 'signin' ? 'Sign In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-bold text-white/35 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="you@example.com"
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
                  style={{ borderColor: BORDER }}
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold text-white/35 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder={mode === 'signup' ? 'Choose a password' : 'Your password'}
                  className="mt-1.5 w-full rounded-xl border bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
                  style={{ borderColor: BORDER }}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl border text-xs text-red-200"
                  style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000' }}
              >
                {loading
                  ? <><Loader className="w-4 h-4 animate-spin" /> {mode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
                  : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
