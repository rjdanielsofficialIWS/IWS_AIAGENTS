import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Loader, CheckCircle2, AlertCircle, Sparkles, X,
  Plus, ChevronLeft, ChevronRight, Calendar, Clock,
  Video, Link2, Link2Off, RefreshCw, Send, Edit3, Image,
} from 'lucide-react';
import { supabase } from '../services/vapiAI';

// ─────────────────────────────────────────────
// BRAND COLOURS
// ─────────────────────────────────────────────
const GOLD    = '#D6B25E';
const GOLD_L  = '#F0D27C';
const BG      = '#0a0a0a';
const SURFACE = '#111111';
const BORDER  = 'rgba(255,255,255,0.08)';

// ─────────────────────────────────────────────
// POSTIZ CONFIG
// ─────────────────────────────────────────────
const POSTIZ_FRONTEND_URL = 'https://www.tiktok.com/v2/auth/authorize/?client_key=awfz2mivhmm64h6g&redirect_uri=https%3A%2F%2Fplatform.postiz.com%2Fintegrations%2Fsocial%2Ftiktok&state=elfh1gyabkl&response_type=code&scope=video.list%2Cuser.info.basic%2Cvideo.publish%2Cvideo.upload%2Cuser.info.profile%2Cuser.info.stats';
const POSTIZ_CLIENT_ID    = 'pca_vu9LtBtHReFqeuA465OI8tOqONvva7gS';
const POSTIZ_REDIRECT_URL = 'https://infinitewealthsolutionsai.com/mediamachine/oauth/postiz/callback';

// localStorage keys
const LS_TOKEN_KEY           = 'postiz_access_token';    // Postiz OAuth access token
const LS_STATE_KEY           = 'postiz_oauth_state';     // CSRF state for Postiz login
const LS_SOCIAL_RETURN_KEY   = 'postiz_social_return';   // flag: user is returning from Postiz after connecting a channel

// ─────────────────────────────────────────────
// SUPABASE STORAGE
// ─────────────────────────────────────────────
const BUCKET          = 'media';
const MAX_BYTES       = 49 * 1024 * 1024;
const SIGNED_URL_SECS = 60 * 60 * 24 * 7;

// ─────────────────────────────────────────────
// PLATFORM DEFINITIONS
// ─────────────────────────────────────────────
type PlatformId =
  | 'instagram' | 'facebook' | 'tiktok' | 'youtube'
  | 'x' | 'linkedin' | 'threads' | 'bluesky';

const PLATFORMS: Record<PlatformId, {
  label: string; color: string; bg: string;
  icon: React.ReactNode; postizType: string;
}> = {
  instagram: {
    label: 'Instagram', postizType: 'instagram',
    color: '#E1306C', bg: 'rgba(225,48,108,0.12)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
  },
  facebook: {
    label: 'Facebook', postizType: 'facebook',
    color: '#1877F2', bg: 'rgba(24,119,242,0.12)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  },
  tiktok: {
    label: 'TikTok', postizType: 'tiktok',
    color: '#ffffff', bg: 'rgba(255,255,255,0.08)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.86 1.56V6.79a4.85 4.85 0 01-1.09-.1z"/></svg>,
  },
  youtube: {
    label: 'YouTube', postizType: 'youtube',
    color: '#FF0000', bg: 'rgba(255,0,0,0.12)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  },
  x: {
    label: 'X (Twitter)', postizType: 'x',
    color: '#ffffff', bg: 'rgba(255,255,255,0.08)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  },
  linkedin: {
    label: 'LinkedIn', postizType: 'linkedin',
    color: '#0A66C2', bg: 'rgba(10,102,194,0.12)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  },
  threads: {
    label: 'Threads', postizType: 'threads',
    color: '#ffffff', bg: 'rgba(255,255,255,0.08)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 011.435.027c-.092-.866-.345-1.449-.764-1.727-.474-.315-1.208-.454-2.116-.408-.717.038-1.395.234-1.97.57l-.898-1.754c.86-.47 1.868-.739 2.949-.789 1.505-.073 2.748.247 3.614.928.867.683 1.35 1.737 1.434 3.131.02.274.023.55.009.825l.001.013c.011.16.02.32.027.482.048 1.265.08 2.107-.024 2.948-.133 1.09-.478 2.032-1.048 2.806-1.237 1.673-3.147 2.616-5.49 2.73zm.041-8.99c-1.052.077-1.863.4-2.307.872-.39.417-.555.947-.496 1.596.086.95.783 1.532 2.016 1.46.927-.052 1.637-.435 2.11-1.137.54-.8.738-1.923.574-3.343a11.548 11.548 0 00-1.897-.448z"/></svg>,
  },
  bluesky: {
    label: 'Bluesky', postizType: 'bluesky',
    color: '#0085ff', bg: 'rgba(0,133,255,0.12)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.299-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/></svg>,
  },
};

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'done'; path: string; url: string; fileName: string; mime: string; size: number }
  | { status: 'error'; message: string };

type PostizIntegration = {
  id: string; name: string; identifier: string;
  picture?: string; profile?: string; disabled?: boolean;
};

type ViewMode = 'composer' | 'calendar';

type ScheduledPost = {
  id: string; content: string; platforms: string[];
  scheduledAt: Date; status: 'scheduled' | 'published' | 'failed';
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function prettyBytes(b: number) {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}
function generateState() {
  const a = new Uint8Array(16);
  window.crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}
function buildPostizAuthUrl(state: string) {
  return `${POSTIZ_FRONTEND_URL}/oauth/authorize?${new URLSearchParams({
    client_id: POSTIZ_CLIENT_ID,
    response_type: 'code',
    redirect_uri: POSTIZ_REDIRECT_URL,
    state,
  })}`;
}

// All Postiz Public API calls go through Netlify proxy to avoid CORS
async function postizProxy(path: string, token: string, method = 'GET', body?: object) {
  const res = await fetch('/.netlify/functions/postiz-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, token, method, body }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error || `Postiz API error (${res.status})`);
  }
  return res.json();
}

async function fetchIntegrations(token: string): Promise<PostizIntegration[]> {
  const data = await postizProxy('/public/v1/integrations', token);
  return Array.isArray(data?.integrations) ? data.integrations : Array.isArray(data) ? data : [];
}

// ─────────────────────────────────────────────
// PLATFORM ICON
// ─────────────────────────────────────────────
function PlatformIcon({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' | 'lg' }) {
  const p = PLATFORMS[id as PlatformId];
  const dim = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  if (!p) return (
    <div className={`${dim} rounded-xl flex items-center justify-center bg-white/10`}>
      <span className="text-xs text-white/50">{id?.[0]?.toUpperCase()}</span>
    </div>
  );
  return (
    <div className={`${dim} rounded-xl flex items-center justify-center shrink-0`}
      style={{ background: p.bg, color: p.color }}>
      {p.icon}
    </div>
  );
}

// ─────────────────────────────────────────────
// CONNECT ACCOUNTS MODAL
//
// HOW IT WORKS:
// The Postiz OAuth token only grants access to /public/v1/ endpoints.
// Connecting individual social platforms requires a full Postiz browser session.
//
// Flow:
//   1. User clicks a platform → Postiz integrations page opens in a NEW TAB
//   2. They connect the platform inside Postiz (takes ~10 seconds)
//   3. They close that tab and click "Done, refresh channels" here
//   4. We fetch the updated integrations list and the new channel appears
// ─────────────────────────────────────────────
function ConnectAccountsModal({
  open, onClose, integrations, onConnectPostiz, postizToken, integrationsLoading, onRefresh,
}: {
  open: boolean; onClose: () => void; integrations: PostizIntegration[];
  onConnectPostiz: () => void; postizToken: string | null; integrationsLoading: boolean;
  onRefresh: () => void;
}) {
  if (!open) return null;

  const connectedIds = integrations.map(i => i.identifier);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        style={{ background: SURFACE, borderColor: BORDER }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b shrink-0" style={{ borderColor: BORDER }}>
          <div>
            <h2 className="text-base font-bold text-white">Connect Channels</h2>
            <p className="text-sm text-white/40 mt-0.5">Link your social accounts to start scheduling</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {!postizToken ? (
          // Step 0 — Postiz account not yet connected
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
              style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}>
              <Link2 className="w-7 h-7" style={{ color: GOLD }} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Connect your Postiz account first</h3>
            <p className="text-sm text-white/40 mb-6 max-w-xs">
              Authorize once with Postiz, then connect any social platform directly from this page.
            </p>
            <button onClick={onConnectPostiz}
              className="px-6 py-3 rounded-xl text-sm font-bold transition hover:brightness-110"
              style={{ background: GOLD, color: '#000' }}>
              Authorize Postiz Account
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-6 space-y-5">

            {/* TikTok highlight banner — shown when TikTok not yet connected */}
            {!integrations.find(i => i.identifier === 'tiktok') && (
              <div className="rounded-xl border p-4 flex items-center gap-4"
                style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
                  {PLATFORMS.tiktok.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white">Connect TikTok</div>
                  <div className="text-xs text-white/40 mt-0.5">Schedule & publish videos directly to TikTok</div>
                </div>
                <button
                  onClick={() => window.open(`${POSTIZ_FRONTEND_URL}/integrations`, '_blank')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition hover:brightness-110 shrink-0"
                  style={{ background: GOLD, color: '#000' }}>
                  Connect
                </button>
              </div>
            )}
            {integrations.length > 0 && (
              <div>
                <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">
                  Connected ({integrations.length})
                </div>
                <div className="space-y-2">
                  {integrations.map(int => (
                    <div key={int.id} className="flex items-center gap-3 p-3 rounded-xl border"
                      style={{ borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.05)' }}>
                      <PlatformIcon id={int.identifier} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{int.name}</div>
                        <div className="text-xs text-white/30">{int.profile || int.identifier}</div>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How to add a channel — step by step */}
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${GOLD}25`, background: `${GOLD}06` }}>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>
                How to add a channel
              </div>
              {[
                { n: '1', text: 'Click "Open Postiz" below — it opens in a new tab' },
                { n: '2', text: 'Find the platform you want (e.g. TikTok) and click Connect' },
                { n: '3', text: 'Authorize the platform — it only takes a few seconds' },
                { n: '4', text: 'Come back to this tab and click "Refresh Channels"' },
              ].map(step => (
                <div key={step.n} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                    style={{ background: `${GOLD}25`, color: GOLD }}>
                    {step.n}
                  </div>
                  <p className="text-sm text-white/60">{step.text}</p>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.open(`${POSTIZ_FRONTEND_URL}/integrations`, '_blank')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition hover:brightness-110"
                style={{ background: GOLD, color: '#000' }}>
                <Link2 className="w-4 h-4" /> Open Postiz to Add a Channel
              </button>
              <button
                onClick={onRefresh}
                disabled={integrationsLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition hover:bg-white/5 disabled:opacity-40"
                style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.5)' }}>
                {integrationsLoading
                  ? <><Loader className="w-4 h-4 animate-spin" /> Refreshing…</>
                  : <><RefreshCw className="w-4 h-4" /> Refresh Channels</>
                }
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// POST COMPOSER MODAL
// ─────────────────────────────────────────────
function PostComposerModal({
  open, onClose, integrations, token, defaultDate, onSuccess,
}: {
  open: boolean; onClose: () => void; integrations: PostizIntegration[];
  token: string | null; defaultDate?: Date; onSuccess?: () => void;
}) {
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [scheduleType, setScheduleType] = useState<'now' | 'schedule'>('schedule');
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [videoFile, setVideoFile]   = useState<File | null>(null);
  const [videoUpload, setVideoUpload] = useState<UploadState>({ status: 'idle' });
  const [imageFiles, setImageFiles]   = useState<File[]>([]);
  const [imageUploads, setImageUploads] = useState<UploadState[]>([]);
  const [perPlatform, setPerPlatform] = useState<Record<string, string>>({});
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk]     = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [tone, setTone]             = useState('engaging, value-first');
  const [showAi, setShowAi]         = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedIntegrations([]); setContent(''); setPerPlatform({});
      setVideoFile(null); setVideoUpload({ status: 'idle' });
      setImageFiles([]); setImageUploads([]);
      setSubmitOk(false); setSubmitError(null);
      setShowAi(false); setExpandedPlatform(null);
    }
  }, [open]);

  useEffect(() => {
    if (defaultDate) {
      const d = new Date(defaultDate); d.setHours(10, 0, 0, 0);
      setScheduleDate(d.toISOString().slice(0, 16));
    }
  }, [defaultDate]);

  const getPublicOrSignedUrl = async (path: string) => {
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (pub?.data?.publicUrl) return pub.data.publicUrl;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECS);
    if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed URL');
    return data.signedUrl;
  };

  const uploadFile = async (file: File, kind: 'video' | 'image', setU: (s: UploadState) => void) => {
    if (file.size > MAX_BYTES) { setU({ status: 'error', message: `File too large. Max ${prettyBytes(MAX_BYTES)}` }); return; }
    setU({ status: 'uploading' } as UploadState);
    try {
      const ext  = file.name.split('.').pop();
      const path = `media-machine/${kind}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      const url = await getPublicOrSignedUrl(path);
      setU({ status: 'done', path, url, fileName: file.name, mime: file.type, size: file.size });
    } catch (e: any) { setU({ status: 'error', message: e.message }); }
  };

  const buildSettings = (identifier: string, postContent: string) => {
    switch (identifier) {
      case 'x':                   return { __type: 'x', who_can_reply_post: 'everyone' };
      case 'instagram':
      case 'instagram-standalone': return { __type: identifier, post_type: 'post' };
      case 'youtube':             return { __type: 'youtube', title: postContent.slice(0, 100) || 'Video', type: 'public', selfDeclaredMadeForKids: 'no' };
      case 'tiktok':              return { __type: 'tiktok', privacy_level: 'PUBLIC_TO_EVERYONE', duet: true, stitch: true, comment: true, autoAddMusic: 'no', brand_content_toggle: false, brand_organic_toggle: false, content_posting_method: 'DIRECT_POST' };
      case 'linkedin':            return { __type: 'linkedin' };
      case 'linkedin-page':       return { __type: 'linkedin-page' };
      case 'facebook':            return { __type: 'facebook' };
      case 'threads':             return { __type: 'threads' };
      case 'bluesky':             return { __type: 'bluesky' };
      default:                    return { __type: identifier };
    }
  };

  const handleSubmit = async () => {
    if (!token)                        { setSubmitError('Not connected. Connect your accounts first.'); return; }
    if (!selectedIntegrations.length)  { setSubmitError('Select at least one channel.'); return; }
    if (!content.trim())               { setSubmitError('Write some content first.'); return; }
    setSubmitting(true); setSubmitError(null);
    try {
      const mediaImages: { id: string; path: string }[] = [];
      imageUploads.forEach((u, i) => { if (u.status === 'done') mediaImages.push({ id: `img-${i}`, path: (u as any).url }); });
      const videoArr  = videoUpload.status === 'done' ? [{ id: 'video-0', path: (videoUpload as any).url }] : [];
      const dateUTC   = scheduleType === 'now' ? new Date().toISOString() : new Date(scheduleDate).toISOString();
      const posts     = selectedIntegrations.map(integId => {
        const int         = integrations.find(i => i.id === integId);
        const identifier  = int?.identifier || '';
        const postContent = perPlatform[integId]?.trim() || content;
        return {
          integration: { id: integId },
          value:       [{ content: postContent, image: [...mediaImages, ...videoArr] }],
          settings:    buildSettings(identifier, postContent),
        };
      });
      await postizProxy('/public/v1/posts', token, 'POST', { type: scheduleType, date: dateUTC, shortLink: false, tags: [], posts });
      setSubmitOk(true);
      setTimeout(() => { onClose(); onSuccess?.(); }, 1600);
    } catch (e: any) { setSubmitError(e.message || 'Failed to schedule'); }
    finally { setSubmitting(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl flex flex-col rounded-2xl border overflow-hidden shadow-2xl max-h-[90vh]"
        style={{ background: SURFACE, borderColor: BORDER }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
          <h2 className="text-base font-bold text-white">Create Post</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAi(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition hover:bg-white/10"
              style={{ color: showAi ? GOLD_L : 'rgba(255,255,255,0.4)', background: showAi ? `${GOLD}18` : 'transparent' }}>
              <Sparkles className="w-3.5 h-3.5" /> AI Write
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/30 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Channel selector */}
          <div>
            <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">Post to</div>
            {integrations.length === 0 ? (
              <div className="text-sm text-white/30 py-2 px-3 rounded-xl border" style={{ borderColor: BORDER }}>
                No channels connected yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {integrations.map(int => {
                  const selected = selectedIntegrations.includes(int.id);
                  const p = PLATFORMS[int.identifier as PlatformId];
                  return (
                    <button key={int.id}
                      onClick={() => setSelectedIntegrations(prev =>
                        prev.includes(int.id) ? prev.filter(x => x !== int.id) : [...prev, int.id]
                      )}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition"
                      style={{
                        borderColor: selected ? (p?.color || GOLD) : BORDER,
                        background:  selected ? (p?.bg || `${GOLD}15`) : 'transparent',
                        color:       selected ? (p?.color || GOLD) : 'rgba(255,255,255,0.4)',
                      }}>
                      <PlatformIcon id={int.identifier} size="sm" />
                      <span className="max-w-[90px] truncate text-xs">{int.name}</span>
                      {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI panel */}
          {showAi && (
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${GOLD}30`, background: `${GOLD}06` }}>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>AI Caption Generator</div>
              <input value={tone} onChange={e => setTone(e.target.value)}
                placeholder="Tone: confident, engaging, value-first…"
                className="w-full rounded-lg border bg-black/30 px-3 py-2 text-sm text-white placeholder-white/25 outline-none"
                style={{ borderColor: BORDER }} />
              <button onClick={async () => {
                setAiLoading(true);
                try {
                  const { data, error } = await supabase.functions.invoke('content-ai', { body: { tone, content } });
                  if (error) throw error;
                  if (data?.best?.instagram) setContent(data.best.instagram);
                } catch (e: any) { setSubmitError(e.message); }
                finally { setAiLoading(false); }
              }} disabled={aiLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40 transition hover:brightness-110"
                style={{ background: GOLD, color: '#000' }}>
                {aiLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate
              </button>
            </div>
          )}

          {/* Content */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="What's on your mind? Write your post content here…"
              rows={5}
              className="w-full bg-transparent px-4 pt-4 pb-2 text-sm text-white placeholder-white/20 outline-none resize-none" />
            <div className="flex items-center gap-1 px-3 py-2.5 border-t" style={{ borderColor: BORDER }}>
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white text-xs font-bold transition">
                <Image className="w-3.5 h-3.5" /> Image
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    setImageFiles(files);
                    const states: UploadState[] = files.map(() => ({ status: 'idle' }));
                    setImageUploads(states);
                    files.forEach((f, i) => uploadFile(f, 'image', s => setImageUploads(prev => prev.map((x, xi) => xi === i ? s : x))));
                  }} />
              </label>
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white text-xs font-bold transition">
                <Video className="w-3.5 h-3.5" /> Video
                <input type="file" accept="video/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setVideoFile(f); uploadFile(f, 'video', setVideoUpload); } }} />
              </label>
              <div className="ml-auto text-xs" style={{ color: content.length > 280 ? '#f87171' : 'rgba(255,255,255,0.2)' }}>
                {content.length}
              </div>
            </div>
          </div>

          {/* Media previews */}
          {(imageFiles.length > 0 || videoFile) && (
            <div className="flex flex-wrap gap-2">
              {imageFiles.map((f, i) => {
                const u = imageUploads[i];
                return (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border" style={{ borderColor: BORDER }}>
                    <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="" />
                    {u?.status === 'uploading' && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader className="w-4 h-4 animate-spin text-white" /></div>}
                    {u?.status === 'done'      && <div className="absolute bottom-1 right-1"><CheckCircle2 className="w-4 h-4 text-green-400" /></div>}
                  </div>
                );
              })}
              {videoFile && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm text-white/60" style={{ borderColor: BORDER }}>
                  <Video className="w-4 h-4" />
                  <span className="truncate max-w-[130px] text-xs">{videoFile.name}</span>
                  {videoUpload.status === 'uploading' && <Loader className="w-3.5 h-3.5 animate-spin" />}
                  {videoUpload.status === 'done'      && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                </div>
              )}
            </div>
          )}

          {/* Per-platform customization */}
          {selectedIntegrations.length > 0 && (
            <div>
              <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">
                Customize per channel <span className="text-white/20 normal-case">(optional)</span>
              </div>
              <div className="space-y-1.5">
                {selectedIntegrations.map(integId => {
                  const int      = integrations.find(i => i.id === integId);
                  if (!int) return null;
                  const expanded = expandedPlatform === integId;
                  return (
                    <div key={integId} className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                      <button onClick={() => setExpandedPlatform(expanded ? null : integId)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/4 transition">
                        <PlatformIcon id={int.identifier} size="sm" />
                        <span className="text-sm font-semibold text-white flex-1 text-left">{int.name}</span>
                        {perPlatform[integId] && <span className="text-xs font-bold text-green-400">Custom</span>}
                        <ChevronRight className={`w-4 h-4 text-white/25 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                      </button>
                      {expanded && (
                        <div className="px-4 pb-4 border-t" style={{ borderColor: BORDER }}>
                          <textarea value={perPlatform[integId] || ''}
                            onChange={e => setPerPlatform(prev => ({ ...prev, [integId]: e.target.value }))}
                            placeholder={`Custom caption for ${int.name}…`}
                            rows={3}
                            className="w-full mt-3 bg-black/25 rounded-lg border px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none resize-none"
                            style={{ borderColor: BORDER }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Schedule */}
          <div>
            <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">When to post</div>
            <div className="flex gap-2 mb-3">
              {(['schedule', 'now'] as const).map(t => (
                <button key={t} onClick={() => setScheduleType(t)}
                  className="px-4 py-2 rounded-xl text-sm font-bold border transition"
                  style={{
                    borderColor: scheduleType === t ? GOLD : BORDER,
                    background:  scheduleType === t ? `${GOLD}18` : 'transparent',
                    color:       scheduleType === t ? GOLD_L : 'rgba(255,255,255,0.35)',
                  }}>
                  {t === 'schedule' ? '🗓 Schedule' : '⚡ Post Now'}
                </button>
              ))}
            </div>
            {scheduleType === 'schedule' && (
              <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                className="rounded-xl border bg-black/25 px-4 py-2.5 text-sm text-white outline-none"
                style={{ borderColor: BORDER }} />
            )}
          </div>

          {submitError && (
            <div className="flex items-start gap-2 p-3 rounded-xl border text-sm text-red-200"
              style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3 shrink-0" style={{ borderColor: BORDER }}>
          <span className="text-xs text-white/25">
            {selectedIntegrations.length > 0
              ? `${selectedIntegrations.length} channel${selectedIntegrations.length !== 1 ? 's' : ''} selected`
              : 'No channels selected'}
          </span>
          <button onClick={handleSubmit} disabled={submitting || submitOk}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
            style={{ background: submitOk ? '#22c55e' : GOLD, color: '#000' }}>
            {submitting  ? <Loader className="w-4 h-4 animate-spin" />  :
             submitOk    ? <CheckCircle2 className="w-4 h-4" />         :
                           <Send className="w-4 h-4" />}
            {submitting ? 'Scheduling…' : submitOk ? 'Scheduled!' : scheduleType === 'now' ? 'Post Now' : 'Schedule Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CALENDAR PANEL
// ─────────────────────────────────────────────
function CalendarPanel({ token, integrations }: { token: string | null; integrations: PostizIntegration[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts]             = useState<ScheduledPost[]>([]);
  const [loading, setLoading]         = useState(false);
  const [composerOpen, setComposerOpen]   = useState(false);
  const [composerDate, setComposerDate]   = useState<Date | undefined>();

  const year       = currentDate.getFullYear();
  const month      = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay   = new Date(year, month, 1).getDay();
  const monthName  = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const today      = new Date();

  const loadPosts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const start = new Date(year, month, 1).toISOString();
      const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const data  = await postizProxy(
        `/public/v1/posts?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, token
      );
      const list = Array.isArray(data?.posts) ? data.posts : Array.isArray(data) ? data : [];
      setPosts(list.map((p: any) => ({
        id: p.id || p.postId,
        content: p.value?.[0]?.content || p.content || '',
        platforms: p.integrations?.map((i: any) => i.identifier || i.type) || [],
        scheduledAt: new Date(p.publishDate || p.scheduledAt || p.date),
        status: p.state === 'PUBLISHED' ? 'published' : p.state === 'ERROR' ? 'failed' : 'scheduled',
      })));
    } catch (e) { /* fail silently */ }
    finally { setLoading(false); }
  }, [token, year, month]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const postsOnDay = (day: number) => posts.filter(p => {
    const d = new Date(p.scheduledAt);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-base font-bold text-white w-44 text-center">{monthName}</span>
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 rounded-lg text-xs font-bold border hover:bg-white/8 transition"
            style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
            Today
          </button>
          {loading && <Loader className="w-4 h-4 animate-spin text-white/20" />}
        </div>
        <button onClick={() => { setComposerDate(undefined); setComposerOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition hover:brightness-110"
          style={{ background: GOLD, color: '#000' }}>
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      <div className="grid grid-cols-7 border-b shrink-0" style={{ borderColor: BORDER }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2.5 text-center text-xs font-bold text-white/25 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-7" style={{ gridAutoRows: 'minmax(100px,1fr)' }}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} className="border-r border-b" style={{ borderColor: BORDER, background: 'rgba(255,255,255,0.01)' }} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day       = i + 1;
          const dayPosts  = postsOnDay(day);
          const isToday   = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          const isWeekend = [0, 6].includes(new Date(year, month, day).getDay());
          return (
            <div key={day}
              className="border-r border-b p-2 cursor-pointer hover:bg-white/3 transition group min-h-[100px]"
              style={{ borderColor: BORDER, background: isWeekend ? 'rgba(255,255,255,0.01)' : 'transparent' }}
              onClick={() => { setComposerDate(new Date(year, month, day, 10, 0)); setComposerOpen(true); }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1.5"
                style={isToday
                  ? { background: GOLD, color: '#000' }
                  : { color: isWeekend ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)' }}>
                {day}
              </div>
              <div className="space-y-1">
                {dayPosts.slice(0, 3).map(post => (
                  <div key={post.id} className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-xs truncate"
                    style={{
                      background: post.status === 'published' ? 'rgba(34,197,94,0.15)' : post.status === 'failed' ? 'rgba(239,68,68,0.15)' : `${GOLD}18`,
                      color:      post.status === 'published' ? '#86efac'              : post.status === 'failed' ? '#fca5a5'              : GOLD_L,
                    }}>
                    {post.platforms[0] && <div className="shrink-0" style={{ width: 12, height: 12 }}><PlatformIcon id={post.platforms[0]} size="sm" /></div>}
                    <span className="truncate">{post.content || '(Post)'}</span>
                  </div>
                ))}
                {dayPosts.length > 3 && <div className="text-xs text-white/25 pl-1.5">+{dayPosts.length - 3} more</div>}
              </div>
              {dayPosts.length === 0 && (
                <div className="opacity-0 group-hover:opacity-100 transition text-xs text-white/20 flex items-center gap-1 mt-1 px-1">
                  <Plus className="w-3 h-3" /> Add
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PostComposerModal
        open={composerOpen} onClose={() => setComposerOpen(false)}
        integrations={integrations} token={token}
        defaultDate={composerDate} onSuccess={loadPosts}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPOSER / POSTS LIST PANEL
// ─────────────────────────────────────────────
function ComposerPanel({ integrations, token }: { integrations: PostizIntegration[]; token: string | null }) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [posts, setPosts]   = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'published' | 'failed'>('all');

  const loadPosts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const end   = new Date(); end.setMonth(end.getMonth() + 3);
      const start = new Date(); start.setMonth(start.getMonth() - 1);
      const data  = await postizProxy(
        `/public/v1/posts?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`, token
      );
      const list = Array.isArray(data?.posts) ? data.posts : Array.isArray(data) ? data : [];
      setPosts(list.map((p: any) => ({
        id: p.id || p.postId,
        content: p.value?.[0]?.content || p.content || '',
        platforms: p.integrations?.map((i: any) => i.identifier || i.type) || [],
        scheduledAt: new Date(p.publishDate || p.scheduledAt || p.date),
        status: p.state === 'PUBLISHED' ? 'published' : p.state === 'ERROR' ? 'failed' : 'scheduled',
      })).sort((a: ScheduledPost, b: ScheduledPost) => b.scheduledAt.getTime() - a.scheduledAt.getTime()));
    } catch (e) {}
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const filtered = posts.filter(p => filter === 'all' || p.status === filter);
  const counts = {
    all:       posts.length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
    failed:    posts.filter(p => p.status === 'failed').length,
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-8 py-5 border-b shrink-0" style={{ borderColor: BORDER }}>
        <div>
          <h1 className="text-xl font-black text-white">Posts</h1>
          <p className="text-sm text-white/30 mt-0.5">Schedule and manage your content</p>
        </div>
        <button onClick={() => setComposerOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition hover:brightness-110"
          style={{ background: GOLD, color: '#000' }}>
          <Plus className="w-4 h-4" /> Create Post
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 px-8 py-5 border-b shrink-0" style={{ borderColor: BORDER }}>
        {[
          { key: 'scheduled', label: 'Scheduled', color: GOLD },
          { key: 'published', label: 'Published',  color: '#22c55e' },
          { key: 'failed',    label: 'Failed',     color: '#ef4444' },
        ].map(s => (
          <div key={s.key} className="rounded-xl border p-4 cursor-pointer transition hover:bg-white/4"
            style={{ borderColor: BORDER }} onClick={() => setFilter(s.key as any)}>
            <div className="text-2xl font-black" style={{ color: s.color }}>{counts[s.key as keyof typeof counts]}</div>
            <div className="text-xs font-semibold text-white/30 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-8 py-3 border-b shrink-0" style={{ borderColor: BORDER }}>
        {(['all', 'scheduled', 'published', 'failed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize"
            style={{
              background: filter === f ? `${GOLD}18` : 'transparent',
              color:      filter === f ? GOLD_L : 'rgba(255,255,255,0.35)',
            }}>
            {f} {f !== 'all' && <span className="ml-1 opacity-60">{counts[f]}</span>}
          </button>
        ))}
        {loading && <Loader className="ml-auto w-4 h-4 animate-spin text-white/20" />}
      </div>

      {/* Post list */}
      <div className="flex-1 overflow-y-auto px-8 py-5">
        {!token ? (
          <div className="flex flex-col items-center justify-center h-56 text-center">
            <div className="w-16 h-16 rounded-2xl border mb-4 flex items-center justify-center" style={{ borderColor: BORDER }}>
              <Link2Off className="w-7 h-7 text-white/15" />
            </div>
            <div className="text-sm font-bold text-white/30">Connect your accounts to get started</div>
          </div>
        ) : loading && posts.length === 0 ? (
          <div className="flex items-center justify-center h-40 gap-3 text-white/25">
            <Loader className="w-5 h-5 animate-spin" /> Loading posts…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center">
            <div className="w-14 h-14 rounded-2xl border mb-4 flex items-center justify-center" style={{ borderColor: BORDER }}>
              <Edit3 className="w-6 h-6 text-white/15" />
            </div>
            <div className="text-sm font-bold text-white/30">No {filter === 'all' ? '' : filter} posts yet</div>
            {filter === 'all' && (
              <button onClick={() => setComposerOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl text-sm font-bold hover:brightness-110 transition"
                style={{ background: GOLD, color: '#000' }}>
                Create your first post
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(post => (
              <div key={post.id} className="flex items-start gap-4 p-4 rounded-xl border hover:bg-white/3 transition cursor-pointer"
                style={{ borderColor: BORDER }}>
                <div className="flex -space-x-1.5 shrink-0 pt-0.5">
                  {post.platforms.slice(0, 3).map((pid, i) => (
                    <div key={i} className="rounded-full border-2" style={{ borderColor: SURFACE }}>
                      <PlatformIcon id={pid} size="sm" />
                    </div>
                  ))}
                  {post.platforms.length > 3 && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white/40 border-2"
                      style={{ borderColor: SURFACE, background: SURFACE }}>
                      +{post.platforms.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 line-clamp-2">{post.content || '(No caption)'}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-white/25 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {post.scheduledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold shrink-0"
                  style={{
                    background: post.status === 'published' ? 'rgba(34,197,94,0.12)' : post.status === 'failed' ? 'rgba(239,68,68,0.12)' : `${GOLD}12`,
                    color:      post.status === 'published' ? '#86efac'              : post.status === 'failed' ? '#fca5a5'              : GOLD_L,
                  }}>
                  {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <PostComposerModal
        open={composerOpen} onClose={() => setComposerOpen(false)}
        integrations={integrations} token={token} onSuccess={loadPosts}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────
function Sidebar({ view, setView, integrations, onOpenConnect, postizToken }: {
  view: ViewMode; setView: (v: ViewMode) => void;
  integrations: PostizIntegration[]; onOpenConnect: () => void; postizToken: string | null;
}) {
  return (
    <aside className="w-52 shrink-0 flex flex-col border-r h-full overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
      <div className="px-5 py-5 border-b" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_L})` }}>
            <Send className="w-4 h-4 text-black" />
          </div>
          <div className="leading-none">
            <div className="text-xs font-black text-white">MEDIA</div>
            <div className="text-xs font-bold mt-0.5" style={{ color: GOLD }}>MACHINE</div>
          </div>
        </div>
      </div>

      <nav className="px-3 py-4 space-y-0.5">
        {([
          { id: 'composer', label: 'Posts',    icon: <Edit3 className="w-4 h-4" /> },
          { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-4 h-4" /> },
        ] as { id: ViewMode; label: string; icon: React.ReactNode }[]).map(item => (
          <button key={item.id} onClick={() => setView(item.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition"
            style={{
              background:  view === item.id ? `${GOLD}15` : 'transparent',
              color:       view === item.id ? GOLD_L : 'rgba(255,255,255,0.4)',
              borderLeft:  view === item.id ? `2px solid ${GOLD}` : '2px solid transparent',
            }}>
            {item.icon} {item.label}
          </button>
        ))}
      </nav>

      <div className="px-3 py-4 border-t mt-auto" style={{ borderColor: BORDER }}>
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-xs font-bold text-white/25 uppercase tracking-wider">Channels</span>
          <button onClick={onOpenConnect}
            className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-white/10 text-white/30 hover:text-white transition">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {!postizToken ? (
          <button onClick={onOpenConnect}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition hover:bg-white/5"
            style={{ borderColor: `${GOLD}35`, color: GOLD }}>
            <Link2 className="w-3.5 h-3.5" /> Connect accounts
          </button>
        ) : integrations.length === 0 ? (
          <button onClick={onOpenConnect}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition hover:bg-white/5"
            style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.3)' }}>
            <Plus className="w-3.5 h-3.5" /> Add channels
          </button>
        ) : (
          <div className="space-y-0.5 max-h-44 overflow-y-auto">
            {integrations.map(int => (
              <div key={int.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition">
                <PlatformIcon id={int.identifier} size="sm" />
                <span className="text-xs text-white/50 truncate flex-1">{int.name}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// TOP BAR
// ─────────────────────────────────────────────
function TopBar({ postizToken, integrations, integrationsLoading, onConnect, onDisconnect, onRefresh, onOpenConnect }: {
  postizToken: string | null; integrations: PostizIntegration[]; integrationsLoading: boolean;
  onConnect: () => void; onDisconnect: () => void; onRefresh: () => void; onOpenConnect: () => void;
}) {
  return (
    <div className="h-12 border-b flex items-center justify-between px-6 shrink-0"
      style={{ background: SURFACE, borderColor: BORDER }}>
      <Link to="/" className="flex items-center gap-1.5 text-xs font-semibold text-white/30 hover:text-white transition">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </Link>
      <div className="flex items-center gap-2">
        {postizToken ? (
          <>
            <div className="flex items-center gap-1.5 text-xs text-green-400 font-semibold">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {integrationsLoading ? 'Syncing…' : `${integrations.length} channel${integrations.length !== 1 ? 's' : ''}`}
            </div>
            <button onClick={onRefresh} disabled={integrationsLoading}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/30 hover:text-white transition disabled:opacity-30">
              <RefreshCw className={`w-3.5 h-3.5 ${integrationsLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onOpenConnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition hover:bg-white/5"
              style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.5)' }}>
              <Plus className="w-3 h-3" /> Add Channel
            </button>
            <button onClick={onDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition hover:bg-red-500/10"
              style={{ borderColor: 'rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              <Link2Off className="w-3 h-3" /> Disconnect
            </button>
          </>
        ) : (
          <button onClick={onConnect}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition hover:brightness-110"
            style={{ background: GOLD, color: '#000' }}>
            <Link2 className="w-3.5 h-3.5" /> Connect Accounts
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT PAGE
// ─────────────────────────────────────────────
export function MediaDistributionPage() {
  const [view, setView]                       = useState<ViewMode>('composer');
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  // ── AUTH STATE ──
  const [postizToken, setPostizToken]           = useState<string | null>(() => localStorage.getItem(LS_TOKEN_KEY));
  const [integrations, setIntegrations]         = useState<PostizIntegration[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [oauthLoading, setOauthLoading]         = useState(false);
  const [oauthError, setOauthError]             = useState<string | null>(null);

  // ── LOAD INTEGRATIONS ──
  const loadIntegrations = useCallback(async (token: string) => {
    setIntegrationsLoading(true);
    try { setIntegrations(await fetchIntegrations(token)); }
    catch (e) { setIntegrations([]); }
    finally { setIntegrationsLoading(false); }
  }, []);

  useEffect(() => {
    if (postizToken) loadIntegrations(postizToken);
    else setIntegrations([]);
  }, [postizToken, loadIntegrations]);

  // ── OAUTH / RETURN CALLBACK ──
  // Handles three possible returns to this URL:
  //   Case A — User returning from Postiz after connecting a social channel
  //            (LS_SOCIAL_RETURN_KEY is set, no code/state in URL)
  //   Case B — Postiz account login callback (code + state in URL)
  //   Case C — Nothing to handle (normal page load)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');
    const state  = params.get('state');
    const error  = params.get('error');

    // ── Case A: returning from Postiz integrations page after adding a channel ──
    const isSocialReturn = localStorage.getItem(LS_SOCIAL_RETURN_KEY) === '1';
    if (isSocialReturn) {
      localStorage.removeItem(LS_SOCIAL_RETURN_KEY);
      window.history.replaceState({}, '', window.location.pathname);
      const token = localStorage.getItem(LS_TOKEN_KEY);
      if (token) {
        // Refresh the integrations list to show the newly connected channel
        loadIntegrations(token);
        setConnectModalOpen(true);
      }
      return;
    }

    // ── Case B: Postiz OAuth login callback ──
    if (!code && !error) return; // Case C — nothing to do

    window.history.replaceState({}, '', window.location.pathname);

    if (error === 'access_denied') { setOauthError('Authorization denied.'); return; }
    if (!code) { setOauthError('No authorization code received.'); return; }

    const savedState = localStorage.getItem(LS_STATE_KEY);
    if (!savedState || savedState !== state) {
      setOauthError('Security check failed. Please try again.');
      return;
    }
    localStorage.removeItem(LS_STATE_KEY);

    setOauthLoading(true);
    fetch('/.netlify/functions/postiz-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async res => {
        if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
        return res.json();
      })
      .then(({ access_token }) => {
        if (!access_token) throw new Error('No access_token received');
        localStorage.setItem(LS_TOKEN_KEY, access_token);
        setPostizToken(access_token);
        setOauthError(null);
        setConnectModalOpen(true);
      })
      .catch((e: any) => setOauthError(e?.message || 'Authorization failed'))
      .finally(() => setOauthLoading(false));

  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = () => {
    const state = generateState();
    localStorage.setItem(LS_STATE_KEY, state);
    window.location.href = buildPostizAuthUrl(state);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(LS_TOKEN_KEY);
    localStorage.removeItem(LS_STATE_KEY);
    localStorage.removeItem(LS_SOCIAL_RETURN_KEY);
    setPostizToken(null);
    setIntegrations([]);
    setOauthError(null);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: BG, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,400&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      {/* Full-screen loading overlay */}
      {oauthLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(10,10,10,0.95)' }}>
          <div className="flex flex-col items-center gap-4">
            <Loader className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
            <div className="text-sm font-bold text-white/60">Completing authorization…</div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {oauthError && (
        <div className="flex items-center gap-3 px-6 py-3 text-sm text-red-200 shrink-0 z-50"
          style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.18)' }}>
          <AlertCircle className="w-4 h-4 shrink-0 text-red-300" /> {oauthError}
          <button onClick={() => setOauthError(null)} className="ml-auto text-red-300/60 hover:text-red-200 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <TopBar
        postizToken={postizToken} integrations={integrations} integrationsLoading={integrationsLoading}
        onConnect={handleConnect} onDisconnect={handleDisconnect}
        onRefresh={() => postizToken && loadIntegrations(postizToken)}
        onOpenConnect={() => setConnectModalOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          view={view} setView={setView} integrations={integrations}
          onOpenConnect={() => setConnectModalOpen(true)} postizToken={postizToken}
        />
        <main className="flex-1 overflow-hidden">
          {view === 'composer' && <ComposerPanel integrations={integrations} token={postizToken} />}
          {view === 'calendar' && <CalendarPanel integrations={integrations} token={postizToken} />}
        </main>
      </div>

      <ConnectAccountsModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        integrations={integrations}
        onConnectPostiz={handleConnect}
        postizToken={postizToken}
        integrationsLoading={integrationsLoading}
        onRefresh={() => postizToken && loadIntegrations(postizToken)}
      />
    </div>
  );
}