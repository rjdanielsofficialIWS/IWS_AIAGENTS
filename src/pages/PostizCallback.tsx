import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader, AlertCircle, CheckCircle2 } from 'lucide-react';

const GOLD = '#D6B25E';
const LS_TOKEN_KEY = 'postiz_access_token';
const LS_STATE_KEY = 'postiz_oauth_state';

export function PostizCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code  = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // User denied access on Postiz
      if (error === 'access_denied') {
        setStatus('error');
        setMessage('Authorization was denied. Please try again.');
        setTimeout(() => navigate('/MediaMachine'), 3000);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('No authorization code received from Postiz.');
        setTimeout(() => navigate('/MediaMachine'), 3000);
        return;
      }

      // CSRF state verification
      const savedState = localStorage.getItem(LS_STATE_KEY);
      if (savedState && state && savedState !== state) {
        setStatus('error');
        setMessage('Security check failed. Please try connecting again.');
        localStorage.removeItem(LS_STATE_KEY);
        setTimeout(() => navigate('/MediaMachine'), 3000);
        return;
      }
      localStorage.removeItem(LS_STATE_KEY);

      // Exchange authorization code for access token via Netlify function
      // The Netlify function calls POST https://api.postiz.com/oauth/token
      // with { grant_type, code, client_id, client_secret }
      try {
        const response = await fetch('/.netlify/functions/postiz-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus('error');
          setMessage(data.error || `Token exchange failed (${response.status})`);
          setTimeout(() => navigate('/MediaMachine'), 3000);
          return;
        }

        if (!data.access_token) {
          setStatus('error');
          setMessage('No access token received. Please try again.');
          setTimeout(() => navigate('/MediaMachine'), 3000);
          return;
        }

        // Store token and redirect back to Media Machine
        localStorage.setItem(LS_TOKEN_KEY, data.access_token);

        setStatus('success');
        setMessage('Postiz account connected successfully!');

        setTimeout(() => navigate('/MediaMachine'), 1500);
      } catch (err) {
        console.error('Postiz callback error:', err);
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
        setTimeout(() => navigate('/MediaMachine'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0a, #111)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}18, transparent 70%)`, filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-20%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, #4f46e518, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Card */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 420, margin: '0 20px', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '48px 40px', textAlign: 'center', color: '#fff' }}>

        {status === 'loading' && (
          <>
            <div style={{ width: 64, height: 64, borderRadius: '50%', border: `3px solid rgba(255,255,255,0.1)`, borderTop: `3px solid ${GOLD}`, animation: 'spin 0.8s linear infinite', margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>Connecting Your Account</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Please wait while we complete the authorization…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle2 style={{ width: 32, height: 32, color: '#4ade80' }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>Connected!</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: '0 0 8px' }}>{message}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Redirecting you back…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <AlertCircle style={{ width: 32, height: 32, color: '#f87171' }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>Connection Failed</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: '0 0 8px' }}>{message}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 24px' }}>Redirecting you back…</p>
            <button
              onClick={() => navigate('/MediaMachine')}
              style={{ padding: '10px 24px', borderRadius: 8, background: `linear-gradient(135deg, ${GOLD}, #F0D27C)`, color: '#000', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              Go Back Now
            </button>
          </>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}