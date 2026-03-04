import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar,
  X,
  Plus,
  Trash2,
  FileText,
  Video,
  Mic,
  ChevronRight,
  Link2,
  Link2Off,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../services/vapiAI';
import { scheduleMedia, getUserPostizAccount } from '../services/postiz';

const GOLD_PRIMARY = '#D6B25E';
const GOLD_HOVER = '#F0D27C';
const GREEN_PROGRESS = '#22c55e';

// ─────────────────────────────────────────────
// POSTIZ CONFIG
// ─────────────────────────────────────────────
const POSTIZ_FRONTEND_URL = 'https://platform.postiz.com';
const POSTIZ_BACKEND_URL = 'https://api.postiz.com';
const POSTIZ_CLIENT_ID = 'pca_vu9LtBtHReFqeuA465OI8tOqONvva7gS';

// FIX 1: Redirect URI must NOT include query string — register this exact URL
// in your Postiz dashboard under Settings > Developers > Apps
const POSTIZ_REDIRECT_URL = 'https://infinitewealthsolutionsai.com/mediamachine';

const LS_TOKEN_KEY = 'postiz_access_token';
const LS_STATE_KEY = 'postiz_oauth_state';

// ─────────────────────────────────────────────
// SUPABASE STORAGE
// ─────────────────────────────────────────────
const BUCKET = 'media';
const MAX_BYTES = 49 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

// ─────────────────────────────────────────────
// POSTIZ PLATFORM MAP
// ─────────────────────────────────────────────
const POSTIZ_PLATFORM_TYPE: Record<string, string> = {
  instagram: 'instagram',
  tiktok: 'tiktok',
  facebook: 'facebook',
  youtube: 'youtube',
  twitterVideo: 'twitter',
  linkedin: 'linkedin',
  twitterPosts: 'twitter',
};

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type MediaKind = 'video' | 'audio' | 'thumbnail';

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'done'; path: string; url: string; fileName: string; mime: string; size: number }
  | { status: 'error'; message: string };

type ScheduleInfo =
  | {
      ok: true;
      timezone: 'America/New_York';
      etDisplay: string;
      rfc3339WithOffset: string;
      utcIso: string;
      unixSeconds: number;
      unixMillis: number;
    }
  | { ok: false; message: string };

type AiGenResponse = {
  tweets: string[];
  captions: { instagram: string[]; facebook: string[]; tiktok: string[] };
  youtubeTitles: string[];
  best: { instagram: string; facebook: string; tiktok: string; youtubeTitle: string };
};

type PlatformKey =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'youtube'
  | 'twitterVideo'
  | 'linkedin'
  | 'twitterPosts';

type PostizIntegration = {
  id: string;
  name: string;
  type: string;
  picture?: string;
};

const PLATFORM_META: Record<PlatformKey, { label: string; sub: string; kind: 'caption' | 'title' | 'text' | 'posts' }> = {
  instagram:    { label: 'Instagram',         sub: 'Reels caption',         kind: 'caption' },
  tiktok:       { label: 'TikTok',            sub: 'Caption',               kind: 'caption' },
  facebook:     { label: 'Facebook',          sub: 'Reels caption',         kind: 'caption' },
  youtube:      { label: 'YouTube',           sub: 'Shorts title',          kind: 'title'   },
  twitterVideo: { label: 'Twitter/X (Video)', sub: 'Post text for video',   kind: 'text'    },
  linkedin:     { label: 'LinkedIn',          sub: 'Post text',             kind: 'text'    },
  twitterPosts: { label: 'Twitter/X Posts',   sub: 'Standalone posts',      kind: 'posts'   },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function prettyBytes(bytes: number) {
  if (!bytes || bytes < 1) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function generateState(): string {
  const arr = new Uint8Array(16);
  window.crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// FIX 2: Redirect URI no longer contains a query string — callback detection
// is handled by checking for the presence of `code` param instead.
function buildPostizAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: POSTIZ_CLIENT_ID,
    response_type: 'code',
    redirect_uri: POSTIZ_REDIRECT_URL,
    state,
  });
  return `${POSTIZ_FRONTEND_URL}/oauth/authorize?${params.toString()}`;
}

async function postizFetch(path: string, token: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${POSTIZ_BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // FIX 3: Token is passed as-is (no "Bearer" prefix) per Postiz docs
      Authorization: token,
      ...(options.headers || {}),
    },
  });
}

async function fetchPostizIntegrations(token: string): Promise<PostizIntegration[]> {
  const res = await postizFetch('/public/v1/integrations', token);
  if (!res.ok) throw new Error(`Failed to load integrations (${res.status})`);
  const data = await res.json();
  return Array.isArray(data?.integrations) ? data.integrations : [];
}

// ─────────────────────────────────────────────
// SUBCOMPONENTS
// ─────────────────────────────────────────────
function PlatformBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-green-200">
      <CheckCircle2 className="h-4 w-4" /> Ready
    </span>
  ) : (
    <span className="text-xs font-bold text-white/50">Missing</span>
  );
}

function FullscreenModal({
  open, title, subtitle, onClose, children,
}: {
  open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} role="button" tabIndex={0} />
      <div className="absolute inset-0 p-3 sm:p-8">
        <div className="h-full w-full rounded-3xl border border-white/10 bg-[#0b0b0b] shadow-[0_30px_120px_rgba(0,0,0,0.85)] overflow-hidden">
          <div className="flex items-start justify-between gap-4 p-4 sm:p-7 border-b border-white/10">
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-extrabold text-white truncate">{title}</div>
              {subtitle && <div className="text-sm text-white/60 mt-1">{subtitle}</div>}
            </div>
            <button type="button" onClick={onClose} className="shrink-0 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 font-extrabold inline-flex items-center gap-2">
              <X className="h-4 w-4" /> Close
            </button>
          </div>
          <div className="h-[calc(100%-70px)] overflow-y-auto p-4 sm:p-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SlideToSubmit({
  disabled, loading, onSubmit, success,
}: {
  disabled: boolean; loading: boolean; onSubmit: () => void; success: boolean;
}) {
  const [val, setVal] = useState(0);

  useEffect(() => { if (!loading && !success) setVal(0); }, [loading, success]);
  useEffect(() => {
    if (val >= 100 && !disabled && !loading && !success) onSubmit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val]);

  const label = success ? 'Submitted' : loading ? 'Submitting…' : disabled ? 'Complete required fields to submit' : 'Slide to submit';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="font-extrabold text-white">{label}</div>
        {success && (
          <span className="inline-flex items-center gap-2 text-green-200 font-extrabold text-sm">
            <CheckCircle2 className="h-4 w-4" /> Done
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="relative">
          <div className="h-12 rounded-2xl border border-white/10 bg-black/25" />
          <div
            className="absolute left-0 top-0 h-12 rounded-2xl"
            style={{
              width: `${Math.max(6, Math.min(100, val))}%`,
              background: disabled || success ? 'rgba(255,255,255,0.06)' : 'rgba(34,197,94,0.18)',
              border: disabled || success ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(34,197,94,0.38)',
              transition: loading ? 'none' : 'width 80ms linear',
            }}
          />
          <input
            type="range" min={0} max={100} value={val}
            onChange={(e) => setVal(Number(e.target.value))}
            disabled={disabled || loading || success}
            className="absolute inset-0 w-full h-12 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Slide to submit"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="inline-flex items-center gap-2 text-sm font-extrabold" style={{ color: disabled ? 'rgba(255,255,255,0.45)' : '#86efac' }}>
              {loading && <Loader className="h-4 w-4 animate-spin" />}
              {success ? 'Submitted' : '⇢'}
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-white/55">Drag the slider all the way to the right to submit.</div>
      </div>
    </div>
  );
}

function ListRow({
  icon, title, subtitle, right, onClick,
}: {
  icon: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode; onClick?: () => void;
}) {
  const clickable = Boolean(onClick);
  return (
    <button type="button" onClick={onClick} disabled={!clickable}
      className={`w-full text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-4 py-4 ${clickable ? '' : 'cursor-default'}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-10 w-10 rounded-2xl border border-white/10 bg-black/25 flex items-center justify-center shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-extrabold text-white truncate">{title}</div>
              {subtitle && <div className="text-xs text-white/60 mt-1 line-clamp-2">{subtitle}</div>}
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {right}
              {clickable && <ChevronRight className="h-4 w-4 text-white/50" />}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function ProgressBarLine({ labels, activeIndex }: { labels: string[]; activeIndex: number }) {
  const pct = labels.length <= 1 ? 100 : Math.round((activeIndex / (labels.length - 1)) * 100);
  return (
    <div className="mt-5">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold text-white">Step <span style={{ color: '#86efac' }}>{activeIndex + 1}</span> / {labels.length}</div>
          <div className="text-xs text-white/60">{pct}%</div>
        </div>
        <div className="mt-3 h-3 w-full rounded-full bg-black/30 border border-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${GREEN_PROGRESS}, rgba(34,197,94,0.55))` }} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          {labels.map((l, i) => (
            <div key={l} className="min-w-0 flex-1 text-center" style={{
              color: i === activeIndex ? 'rgba(255,255,255,0.95)' : i < activeIndex ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)',
              fontWeight: i === activeIndex ? 900 : 800, fontSize: 12,
            }}>
              <span className="truncate inline-block max-w-full">{l}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          {labels.map((l, i) => (
            <div key={`${l}-tick`} className="flex-1 flex justify-center">
              <div className="h-2 w-2 rounded-full" style={{
                backgroundColor: i <= activeIndex ? 'rgba(34,197,94,0.9)' : 'rgba(255,255,255,0.18)',
                boxShadow: i === activeIndex ? '0 0 0 5px rgba(34,197,94,0.12)' : 'none',
              }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PostizConnectBanner({
  token, integrations, integrationsLoading, integrationsError, onConnect, onDisconnect, onRefresh,
}: {
  token: string | null; integrations: PostizIntegration[]; integrationsLoading: boolean;
  integrationsError: string | null; onConnect: () => void; onDisconnect: () => void; onRefresh: () => void;
}) {
  const connected = Boolean(token);
  return (
    <div className="rounded-2xl border p-4 mb-6" style={{
      borderColor: connected ? 'rgba(34,197,94,0.3)' : 'rgba(214,178,94,0.3)',
      background: connected ? 'rgba(34,197,94,0.05)' : 'rgba(214,178,94,0.05)',
    }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl border flex items-center justify-center shrink-0" style={{
            borderColor: connected ? 'rgba(34,197,94,0.3)' : 'rgba(214,178,94,0.3)',
            background: connected ? 'rgba(34,197,94,0.1)' : 'rgba(214,178,94,0.1)',
          }}>
            {connected ? <Link2 className="h-5 w-5 text-green-300" /> : <Link2Off className="h-5 w-5" style={{ color: GOLD_PRIMARY }} />}
          </div>
          <div>
            <div className="font-extrabold text-white text-sm">
              {connected ? 'Social accounts connected' : 'Connect your social accounts'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: connected ? 'rgba(134,239,172,0.8)' : 'rgba(214,178,94,0.7)' }}>
              {connected
                ? integrationsLoading ? 'Loading accounts…'
                  : integrationsError ? integrationsError
                  : integrations.length ? integrations.map((i) => i.name).join(' · ')
                  : 'No accounts found — add them in your Postiz dashboard'
                : 'Authorize to schedule posts directly to your social accounts'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {connected && (
            <button type="button" onClick={onRefresh} disabled={integrationsLoading}
              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-extrabold inline-flex items-center gap-1.5 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${integrationsLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          )}
          <button type="button" onClick={connected ? onDisconnect : onConnect}
            className="rounded-xl px-4 py-2 text-xs font-extrabold inline-flex items-center gap-1.5 border"
            style={connected
              ? { borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5' }
              : { borderColor: 'rgba(214,178,94,0.4)', background: 'rgba(214,178,94,0.12)', color: GOLD_HOVER }}>
            {connected ? <><Link2Off className="h-3.5 w-3.5" /> Disconnect</> : <><Link2 className="h-3.5 w-3.5" /> Connect Accounts</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export function MediaDistributionPage() {
  const [bgOffset, setBgOffset] = useState(0);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, [step]);

  // ── POSTIZ AUTH ──
  const [postizToken, setPostizToken] = useState<string | null>(() => localStorage.getItem(LS_TOKEN_KEY));
  const [integrations, setIntegrations] = useState<PostizIntegration[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [integrationsError, setIntegrationsError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // ── HANDLE OAUTH CALLBACK ──
  // FIX 4: Callback is now detected by the presence of `code` in the URL
  // rather than a `?postiz_callback=1` query param that would break the
  // registered redirect URI matching on Postiz's server.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    // Only proceed if there's a code or error — this is the OAuth callback
    if (!code && !error) return;

    // Clean up the URL immediately so a refresh doesn't re-trigger this
    window.history.replaceState({}, '', window.location.pathname);

    if (error === 'access_denied') {
      setOauthError('Authorization was denied. Please try connecting again.');
      return;
    }
    if (!code) {
      setOauthError('No authorization code received. Please try again.');
      return;
    }

    // FIX 5: Verify the state param to prevent CSRF attacks
    const savedState = localStorage.getItem(LS_STATE_KEY);
    if (!savedState || savedState !== state) {
      setOauthError('Security check failed (state mismatch). Please try again.');
      return;
    }
    localStorage.removeItem(LS_STATE_KEY);

    setOauthLoading(true);

    // FIX 6: The Netlify function handles the full token exchange server-side.
    // It receives only the `code` and appends grant_type, client_id, and
    // client_secret from environment variables — the secret never touches
    // the frontend bundle.
    fetch('/.netlify/functions/postiz-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Token exchange failed (${res.status}). ${text}`);
        }
        return res.json();
      })
      .then(({ access_token }) => {
        if (!access_token) throw new Error('No access_token in response from Netlify function');
        localStorage.setItem(LS_TOKEN_KEY, access_token);
        setPostizToken(access_token);
        setOauthError(null);
      })
      .catch((e: any) => setOauthError(e?.message || 'Failed to complete authorization'))
      .finally(() => setOauthLoading(false));
  }, []);

  // ── LOAD INTEGRATIONS ──
  const loadIntegrations = useCallback(async (token: string) => {
    setIntegrationsLoading(true);
    setIntegrationsError(null);
    try {
      const list = await fetchPostizIntegrations(token);
      setIntegrations(list);
    } catch (e: any) {
      setIntegrationsError(e?.message || 'Failed to load integrations');
      setIntegrations([]);
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (postizToken) loadIntegrations(postizToken);
    else setIntegrations([]);
  }, [postizToken, loadIntegrations]);

  const handleConnect = () => {
    const state = generateState();
    localStorage.setItem(LS_STATE_KEY, state);
    // FIX 7: Redirect to clean Postiz auth URL — no query params in redirect_uri
    window.location.href = buildPostizAuthUrl(state);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(LS_TOKEN_KEY);
    localStorage.removeItem(LS_STATE_KEY);
    setPostizToken(null);
    setIntegrations([]);
    setOauthError(null);
  };

  // ── FORM STATE ──
  const [selected, setSelected] = useState<Record<PlatformKey, boolean>>({
    instagram: false, tiktok: false, facebook: false, youtube: false,
    twitterVideo: false, linkedin: false, twitterPosts: false,
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUpload, setVideoUpload] = useState<UploadState>({ status: 'idle' });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailUpload, setThumbnailUpload] = useState<UploadState>({ status: 'idle' });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUpload, setAudioUpload] = useState<UploadState>({ status: 'idle' });

  const [tone, setTone] = useState('confident, punchy, value-first');
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [captionInstagram, setCaptionInstagram] = useState('');
  const [captionTikTok, setCaptionTikTok] = useState('');
  const [captionFacebook, setCaptionFacebook] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [twitterVideoText, setTwitterVideoText] = useState('');
  const [linkedinText, setLinkedinText] = useState('');
  const [twitterPosts, setTwitterPosts] = useState<string[]>(['', '', '']);

  const [scheduleMode, setScheduleMode] = useState<'same' | 'different'>('same');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleByPlatform, setScheduleByPlatform] = useState<Record<PlatformKey, { date: string; time: string }>>({
    instagram: { date: '', time: '' }, tiktok: { date: '', time: '' }, facebook: { date: '', time: '' },
    youtube: { date: '', time: '' }, twitterVideo: { date: '', time: '' }, linkedin: { date: '', time: '' },
    twitterPosts: { date: '', time: '' },
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);
  const [submitResults, setSubmitResults] = useState<{ platform: string; ok: boolean; message: string }[]>([]);

  const [activeCaptionPlatform, setActiveCaptionPlatform] = useState<Exclude<PlatformKey, 'twitterPosts'> | null>(null);
  const [activeSchedulePlatform, setActiveSchedulePlatform] = useState<PlatformKey | null>(null);
  const [reviewPlatform, setReviewPlatform] = useState<PlatformKey | null>(null);

  const sameDateRef = useRef<HTMLInputElement | null>(null);
  const sameTimeRef = useRef<HTMLInputElement | null>(null);

  const openPicker = (ref: React.RefObject<HTMLInputElement>) => {
    const el = ref.current;
    if (!el) return;
    // @ts-ignore
    if (typeof el.showPicker === 'function') { el.showPicker(); return; }
    el.focus(); el.click();
  };

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => { setBgOffset(window.scrollY * 0.15); raf = 0; });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (raf) window.cancelAnimationFrame(raf); };
  }, []);

  const resetSubmitState = () => { setSubmitOk(false); setSubmitError(null); setSubmitResults([]); };

  // ── FILE UPLOAD ──
  const sizeGuard = (file: File, kind: MediaKind) => {
    if (file.size > MAX_BYTES) {
      const label = kind === 'video' ? 'Video' : kind === 'audio' ? 'Audio' : 'Thumbnail';
      return `${label} is too large (${prettyBytes(file.size)}). Max is ${prettyBytes(MAX_BYTES)}.`;
    }
    return null;
  };

  const getPublicOrSignedUrl = async (path: string) => {
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub?.data?.publicUrl;
    if (publicUrl) return publicUrl;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed to create signed URL');
    return data.signedUrl;
  };

  const uploadFile = async (file: File, kind: MediaKind, setState: (s: UploadState) => void) => {
    resetSubmitState();
    const guardMsg = sizeGuard(file, kind);
    if (guardMsg) { setState({ status: 'error', message: guardMsg }); return; }
    setState({ status: 'uploading' });
    try {
      const safeName = file.name.replace(/\s+/g, '-');
      const ext = safeName.includes('.') ? safeName.split('.').pop() : '';
      const path = `transferrable-everything/${kind}/${Date.now()}-${Math.random().toString(16).slice(2)}${ext ? `.${ext}` : ''}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
      if (upErr) throw new Error(upErr.message || 'Upload failed');
      const url = await getPublicOrSignedUrl(path);
      setState({ status: 'done', path, url, fileName: file.name, mime: file.type || 'unknown', size: file.size });
    } catch (e: any) {
      setState({ status: 'error', message: e?.message || 'Upload failed' });
    }
  };

  // ── TIMEZONE ──
  const TZ_ET = 'America/New_York';
  const pad2 = (n: number) => String(n).padStart(2, '0');

  const formatPartsInTz = (d: Date, timeZone: string) => {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const parts = dtf.formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
    return { year: Number(get('year')), month: Number(get('month')), day: Number(get('day')), hour: Number(get('hour')), minute: Number(get('minute')), second: Number(get('second')) };
  };

  const toUtcFromEtLocal = (dateStr: string, timeStr: string): ScheduleInfo => {
    if (!dateStr || !timeStr) return { ok: false, message: 'Choose a date and time (ET).' };
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    const t = /^(\d{2}):(\d{2})$/.exec(timeStr);
    if (!m || !t) return { ok: false, message: 'Invalid date/time format.' };
    const [y, mo, da, hh, mm] = [m[1], m[2], m[3], t[1], t[2]].map(Number);
    let guess = Date.UTC(y, mo - 1, da, hh, mm, 0);
    for (let i = 0; i < 4; i++) {
      const et = formatPartsInTz(new Date(guess), TZ_ET);
      const diff = Date.UTC(y, mo - 1, da, hh, mm, 0) - Date.UTC(et.year, et.month - 1, et.day, et.hour, et.minute, 0);
      if (Math.abs(diff) < 1000) break;
      guess += diff;
    }
    const utcDate = new Date(guess);
    const etParts = formatPartsInTz(utcDate, TZ_ET);
    const etAsIfUtc = Date.UTC(etParts.year, etParts.month - 1, etParts.day, etParts.hour, etParts.minute, etParts.second);
    const offsetMinutes = Math.round((etAsIfUtc - utcDate.getTime()) / 60000);
    const sign = offsetMinutes <= 0 ? '-' : '+';
    const absMin = Math.abs(offsetMinutes);
    const offsetStr = `${sign}${pad2(Math.floor(absMin / 60))}:${pad2(absMin % 60)}`;
    const rfc3339WithOffset = `${etParts.year}-${pad2(etParts.month)}-${pad2(etParts.day)}T${pad2(etParts.hour)}:${pad2(etParts.minute)}:${pad2(etParts.second)}${offsetStr}`;
    const etDisplay = new Intl.DateTimeFormat('en-US', { timeZone: TZ_ET, year: 'numeric', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' }).format(utcDate);
    return { ok: true, timezone: TZ_ET, etDisplay, rfc3339WithOffset, utcIso: utcDate.toISOString(), unixSeconds: Math.floor(utcDate.getTime() / 1000), unixMillis: utcDate.getTime() };
  };

  // ── DERIVED STATE ──
  const enabledPlatforms = useMemo(() => (Object.keys(selected) as PlatformKey[]).filter((k) => selected[k]), [selected]);
  const hasAnyPlatform = enabledPlatforms.length > 0;
  const videoReady = videoUpload.status === 'done';
  const showTwitterPostsStep = selected.twitterPosts;

  const captionsReady = useMemo(() => {
    const needs = (k: PlatformKey) => selected[k];
    return (!needs('instagram') || captionInstagram.trim().length > 0)
      && (!needs('tiktok') || captionTikTok.trim().length > 0)
      && (!needs('facebook') || captionFacebook.trim().length > 0)
      && (!needs('youtube') || youtubeTitle.trim().length > 0)
      && (!needs('twitterVideo') || twitterVideoText.trim().length > 0)
      && (!needs('linkedin') || linkedinText.trim().length > 0);
  }, [selected, captionInstagram, captionTikTok, captionFacebook, youtubeTitle, twitterVideoText, linkedinText]);

  const twitterPostsReady = useMemo(() => {
    if (!selected.twitterPosts) return true;
    return twitterPosts.map((t) => t.trim()).filter(Boolean).length >= 1;
  }, [selected.twitterPosts, twitterPosts]);

  const scheduleCommonInfo: ScheduleInfo = useMemo(() => {
    if (scheduleMode !== 'same') return { ok: false, message: 'Using different times per platform.' };
    return toUtcFromEtLocal(scheduleDate, scheduleTime);
  }, [scheduleMode, scheduleDate, scheduleTime]);

  const scheduleInfoByPlatform = useMemo(() => {
    const map = {} as Record<PlatformKey, ScheduleInfo>;
    (Object.keys(PLATFORM_META) as PlatformKey[]).forEach((k) => {
      if (!selected[k]) { map[k] = { ok: false, message: 'Not selected.' }; return; }
      if (scheduleMode === 'same') { map[k] = scheduleCommonInfo; return; }
      map[k] = toUtcFromEtLocal(scheduleByPlatform[k]?.date || '', scheduleByPlatform[k]?.time || '');
    });
    return map;
  }, [selected, scheduleMode, scheduleCommonInfo, scheduleByPlatform]);

  const scheduleReady = useMemo(() => {
    if (!hasAnyPlatform) return false;
    if (scheduleMode === 'same') return scheduleCommonInfo.ok;
    return enabledPlatforms.every((k) => scheduleInfoByPlatform[k].ok);
  }, [hasAnyPlatform, scheduleMode, scheduleCommonInfo, enabledPlatforms, scheduleInfoByPlatform]);

  const canProceedFromStep = useMemo(() => {
    if (step === 1) return hasAnyPlatform;
    if (step === 2) return videoReady;
    if (step === 3) return captionsReady;
    if (step === 4) return twitterPostsReady;
    if (step === 5) return scheduleReady;
    return true;
  }, [step, hasAnyPlatform, videoReady, captionsReady, twitterPostsReady, scheduleReady]);

  const reviewReadyToSubmit = hasAnyPlatform && videoReady && captionsReady && twitterPostsReady && scheduleReady && Boolean(postizToken) && integrations.length > 0;

  const getCopyForPlatform = (k: Exclude<PlatformKey, 'twitterPosts'>) => {
    if (k === 'instagram') return captionInstagram;
    if (k === 'tiktok') return captionTikTok;
    if (k === 'facebook') return captionFacebook;
    if (k === 'youtube') return youtubeTitle;
    if (k === 'twitterVideo') return twitterVideoText;
    return linkedinText;
  };

  const copyOkForPlatform = (k: Exclude<PlatformKey, 'twitterPosts'>) => !selected[k] || String(getCopyForPlatform(k) || '').trim().length > 0;
  const scheduleSummaryForPlatform = (k: PlatformKey) => { const i = scheduleInfoByPlatform[k]; return i?.ok ? i.etDisplay : (i?.message || ''); };
  const isPlatformReviewReady = (k: PlatformKey) => k === 'twitterPosts' ? twitterPostsReady && scheduleInfoByPlatform[k]?.ok : copyOkForPlatform(k as Exclude<PlatformKey, 'twitterPosts'>) && scheduleInfoByPlatform[k]?.ok;

  // ── NAVIGATION ──
  const goToNext = () => {
    resetSubmitState();
    if (!canProceedFromStep) return;
    const n = step === 1 ? 2 : step === 2 ? 3 : step === 3 ? (showTwitterPostsStep ? 4 : 5) : step === 4 ? 5 : step === 5 ? 6 : step;
    setStep(n as any);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const goToPrev = () => {
    resetSubmitState();
    if (step === 1) return;
    const p = step === 2 ? 1 : step === 3 ? 2 : step === 4 ? 3 : step === 5 ? (showTwitterPostsStep ? 4 : 3) : 5;
    setStep(p as any);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const stepLabels = useMemo(() => {
    const base = ['Platforms', 'Media', 'Captions', 'Schedule'];
    if (showTwitterPostsStep) base.splice(3, 0, 'Posts');
    return base;
  }, [showTwitterPostsStep]);

  const activeStepIndex = useMemo(() => {
    if (step === 1) return 0;
    if (step === 2) return 1;
    if (step === 3) return 2;
    if (step === 4) return showTwitterPostsStep ? 3 : 2;
    if (step === 5) return showTwitterPostsStep ? 4 : 3;
    return stepLabels.length - 1;
  }, [step, showTwitterPostsStep, stepLabels.length]);

  // ── AI ──
  const runAiForCaptions = async () => {
    setAiError(null); resetSubmitState();
    if (audioUpload.status !== 'done') { setAiError('Upload your audio first.'); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-ai', { body: { audioUrl: audioUpload.url, tone } });
      if (error) throw new Error((error as any)?.context?.body?.details || error.message || 'AI failed.');
      const res = data as AiGenResponse;
      if (selected.instagram && res?.best?.instagram) setCaptionInstagram(res.best.instagram);
      if (selected.facebook && res?.best?.facebook) setCaptionFacebook(res.best.facebook);
      if (selected.tiktok && res?.best?.tiktok) setCaptionTikTok(res.best.tiktok);
      if (selected.youtube && res?.best?.youtubeTitle) setYoutubeTitle(res.best.youtubeTitle);
      const fallback = res?.best?.instagram || res?.best?.tiktok || res?.best?.facebook || '';
      if (selected.twitterVideo && !twitterVideoText.trim() && fallback) setTwitterVideoText(fallback);
      if (selected.linkedin && !linkedinText.trim() && fallback) setLinkedinText(fallback);
    } catch (e: any) { setAiError(e?.message || 'AI generation failed'); }
    finally { setAiLoading(false); }
  };

  const runAiForTwitterPosts = async () => {
    setAiError(null); resetSubmitState();
    if (audioUpload.status !== 'done') { setAiError('Upload your audio first.'); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-ai', { body: { audioUrl: audioUpload.url, tone } });
      if (error) throw new Error((error as any)?.context?.body?.details || error.message || 'AI failed.');
      const res = data as AiGenResponse;
      const cleaned = (Array.isArray(res?.tweets) ? res.tweets : []).map((t) => String(t).trim()).filter(Boolean).slice(0, 8);
      setTwitterPosts(cleaned.length ? cleaned : ['']);
    } catch (e: any) { setAiError(e?.message || 'AI generation failed'); }
    finally { setAiLoading(false); }
  };

  // ── POSTIZ SUBMIT ──
  const submitToPostiz = async () => {
    resetSubmitState();
    if (!hasAnyPlatform) { setSubmitError('Choose at least one platform.'); return; }
    if (videoUpload.status !== 'done') { setSubmitError('Upload your video.'); return; }
    if (!captionsReady) { setSubmitError('Fill in copy for every selected platform.'); return; }
    if (!twitterPostsReady) { setSubmitError('Add at least 1 Twitter/X post.'); return; }
    if (!scheduleReady) { setSubmitError('Complete scheduling for all platforms.'); return; }

    // FIX 8: Guard against submitting without a valid token
    if (!postizToken) { setSubmitError('Connect your social accounts before submitting.'); return; }

    setSubmitting(true);
    const results: { platform: string; ok: boolean; message: string }[] = [];

    try {
      const postPromises: Promise<void>[] = [];

      for (const platformKey of enabledPlatforms) {
        const schedInfo = scheduleInfoByPlatform[platformKey];
        if (!schedInfo.ok) continue;

        const postizType = POSTIZ_PLATFORM_TYPE[platformKey];

        if (platformKey === 'twitterPosts') {
          const tweets = twitterPosts.map((t) => t.trim()).filter(Boolean);
          for (const tweet of tweets) {
            postPromises.push(
              (async () => {
                try {
                  const result = await scheduleMedia({
                    platforms: [postizType],
                    mediaUrls: {
                      video: videoUpload.status === 'done' ? videoUpload.url : undefined,
                    },
                    captions: { content: tweet },
                    scheduledTime: schedInfo.rfc3339WithOffset,
                    timezone: schedInfo.timezone,
                  });
                  results.push({
                    platform: `${PLATFORM_META[platformKey].label} tweet`,
                    ok: result.success,
                    message: result.success ? 'Scheduled' : result.error || 'Failed to schedule',
                  });
                } catch (e: any) {
                  results.push({
                    platform: `${PLATFORM_META[platformKey].label} tweet`,
                    ok: false,
                    message: e?.message || 'Request failed',
                  });
                }
              })()
            );
          }
        } else {
          const content = getCopyForPlatform(platformKey as Exclude<PlatformKey, 'twitterPosts'>);
          postPromises.push(
            (async () => {
              try {
                const result = await scheduleMedia({
                  platforms: [postizType],
                  mediaUrls: {
                    video: videoUpload.status === 'done' ? videoUpload.url : undefined,
                    thumbnail: thumbnailUpload.status === 'done' && platformKey === 'youtube' ? thumbnailUpload.url : undefined,
                  },
                  captions: { content },
                  scheduledTime: schedInfo.rfc3339WithOffset,
                  timezone: schedInfo.timezone,
                });
                results.push({
                  platform: PLATFORM_META[platformKey].label,
                  ok: result.success,
                  message: result.success ? 'Scheduled' : result.error || 'Failed to schedule',
                });
              } catch (e: any) {
                results.push({
                  platform: PLATFORM_META[platformKey].label,
                  ok: false,
                  message: e?.message || 'Request failed',
                });
              }
            })()
          );
        }
      }

      await Promise.all(postPromises);
      setSubmitResults(results);

      if (results.every((r) => !r.ok)) {
        setSubmitError('All posts failed to schedule. Check your connected accounts and try again.');
      } else {
        setSubmitOk(true);
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    } catch (e: any) {
      setSubmitError(e?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── FILE UPLOAD CARD ──
  const FileUploadCard = ({ title, subtitle, kind, accept, file, setFile, upload, setUpload, required }: {
    title: string; subtitle: string; kind: MediaKind; accept: string; file: File | null;
    setFile: (f: File | null) => void; upload: UploadState; setUpload: (s: UploadState) => void; required?: boolean;
  }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold">{title} {required && <span className="text-xs text-white/60">(Required)</span>}</h3>
          <p className="text-white/60 text-sm mt-1">{subtitle}</p>
        </div>
        {upload.status === 'done' && <div className="flex items-center gap-2 text-sm text-green-200"><CheckCircle2 className="h-4 w-4" /> Uploaded</div>}
      </div>
      <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <label className="inline-flex items-center gap-2 cursor-pointer rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-sm font-extrabold">
          <UploadCloud className="h-4 w-4" />
          {file ? 'Change file' : 'Choose file'}
          <input type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); if (f) uploadFile(f, kind, setUpload); }} />
        </label>
        {upload.status === 'uploading' && <span className="inline-flex items-center gap-2 text-sm text-white/60"><Loader className="h-4 w-4 animate-spin" /> Uploading…</span>}
        {upload.status === 'done' && <span className="text-sm text-white/60 truncate">{upload.fileName} ({prettyBytes(upload.size)})</span>}
        {upload.status === 'error' && <span className="inline-flex items-start gap-1.5 text-sm text-red-300"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {upload.message}</span>}
      </div>
    </div>
  );

  // ── BOTTOM NAV ──
  const BottomNav = ({ hideNext }: { hideNext?: boolean }) => (
    <div className="flex items-center gap-3 pt-2">
      {step > 1 && (
        <button type="button" onClick={goToPrev} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-3 font-extrabold">← Back</button>
      )}
      {!hideNext && step < 6 && (
        <button type="button" onClick={goToNext} disabled={!canProceedFromStep}
          className="ml-auto rounded-xl px-6 py-3 font-extrabold disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: canProceedFromStep ? GOLD_PRIMARY : undefined, color: canProceedFromStep ? '#000' : undefined }}>
          Next →
        </button>
      )}
    </div>
  );

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="relative min-h-screen text-white overflow-x-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0d0d0d 100%)' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ transform: `translateY(${bgOffset}px)` }} aria-hidden>
        <div className="absolute rounded-full blur-[120px] opacity-20" style={{ width: 600, height: 600, background: `radial-gradient(circle, ${GOLD_PRIMARY}, transparent 70%)`, top: -200, right: -200 }} />
        <div className="absolute rounded-full blur-[100px] opacity-10" style={{ width: 400, height: 400, background: 'radial-gradient(circle, #4f46e5, transparent 70%)', bottom: 100, left: -100 }} />
      </div>

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-16 pt-10">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-extrabold text-white/60 hover:text-white transition">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Media Distribution</h1>
          <p className="mt-2 text-white/60 text-sm">Schedule your content across all platforms in one workflow.</p>
        </div>

        {oauthLoading && (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3 text-sm text-white/70">
            <Loader className="h-4 w-4 animate-spin shrink-0" /> Completing authorization…
          </div>
        )}
        {oauthError && (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3 text-sm text-red-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-300" /> {oauthError}
          </div>
        )}

        <PostizConnectBanner
          token={postizToken}
          integrations={integrations}
          integrationsLoading={integrationsLoading}
          integrationsError={integrationsError}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onRefresh={() => postizToken && loadIntegrations(postizToken)}
        />

        {step < 6 && <ProgressBarLine labels={stepLabels} activeIndex={activeStepIndex} />}

        <div className="mt-6 space-y-5">

          {/* ── STEP 1: PLATFORMS ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                <h3 className="text-lg font-extrabold">Select Platforms</h3>
                <p className="text-white/60 text-sm mt-1">Choose where you want to publish.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(PLATFORM_META) as PlatformKey[]).map((k) => {
                  const meta = PLATFORM_META[k];
                  const isSelected = selected[k];
                  const hasAccount = integrations.some((i) => i.type.toLowerCase() === POSTIZ_PLATFORM_TYPE[k].toLowerCase());
                  return (
                    <button key={k} type="button" onClick={() => setSelected((s) => ({ ...s, [k]: !s[k] }))}
                      className="w-full text-left rounded-2xl border transition p-4"
                      style={{ borderColor: isSelected ? 'rgba(214,178,94,0.5)' : 'rgba(255,255,255,0.1)', background: isSelected ? 'rgba(214,178,94,0.08)' : 'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-white">{meta.label}</div>
                          <div className="text-xs text-white/50 mt-0.5">{meta.sub}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isSelected ? <span className="text-xs font-extrabold" style={{ color: GOLD_HOVER }}>✓ Selected</span> : <span className="text-xs text-white/30">Select</span>}
                          {postizToken && <span className={`text-xs font-bold ${hasAccount ? 'text-green-300' : 'text-white/30'}`}>{hasAccount ? '● Connected' : '○ No account'}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {!postizToken && hasAnyPlatform && (
                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-200">
                  Connect your social accounts above so posts can be scheduled directly.
                </div>
              )}
              <BottomNav />
            </div>
          )}

          {/* ── STEP 2: MEDIA ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                <h3 className="text-lg font-extrabold">Upload Media</h3>
                <p className="text-white/60 text-sm mt-1">Video is required. Thumbnail and audio are optional.</p>
              </div>
              <FileUploadCard title="Video" subtitle="MP4, MOV, or WebM. Max 49 MB." kind="video" accept="video/*" file={videoFile} setFile={setVideoFile} upload={videoUpload} setUpload={setVideoUpload} required />
              <FileUploadCard title="Thumbnail" subtitle="PNG or JPG. Used for YouTube. Optional." kind="thumbnail" accept="image/*" file={thumbnailFile} setFile={setThumbnailFile} upload={thumbnailUpload} setUpload={setThumbnailUpload} />
              <FileUploadCard title="Audio (for AI captions)" subtitle="MP3 or WAV. Used by AI to generate captions. Optional." kind="audio" accept="audio/*" file={audioFile} setFile={setAudioFile} upload={audioUpload} setUpload={setAudioUpload} />
              <BottomNav />
            </div>
          )}

          {/* ── STEP 3: CAPTIONS ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-lg font-extrabold">Captions & Copy</h3>
                    <p className="text-white/60 text-sm mt-1">Write or generate copy for each platform.</p>
                  </div>
                  <button type="button" onClick={() => setAiMode((v) => !v)}
                    className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-extrabold inline-flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" style={{ color: GOLD_PRIMARY }} />
                    {aiMode ? 'Hide AI' : 'AI Generate'}
                  </button>
                </div>
                {aiMode && (
                  <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                    <div>
                      <label className="text-xs font-extrabold text-white/60">Tone</label>
                      <input type="text" value={tone} onChange={(e) => setTone(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/30"
                        placeholder="confident, punchy, value-first" />
                    </div>
                    {aiError && <div className="text-sm text-red-300 flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {aiError}</div>}
                    <button type="button" onClick={runAiForCaptions} disabled={aiLoading || audioUpload.status !== 'done'}
                      className="rounded-xl px-5 py-2.5 text-sm font-extrabold inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: GOLD_PRIMARY, color: '#000' }}>
                      {aiLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Generate Captions
                    </button>
                    {audioUpload.status !== 'done' && <p className="text-xs text-white/50">Upload audio in the previous step to use AI generation.</p>}
                  </div>
                )}
              </div>

              {(enabledPlatforms.filter((k) => k !== 'twitterPosts') as Exclude<PlatformKey, 'twitterPosts'>[]).map((k) => {
                const meta = PLATFORM_META[k];
                const value = getCopyForPlatform(k);
                const setter = k === 'instagram' ? setCaptionInstagram : k === 'tiktok' ? setCaptionTikTok : k === 'facebook' ? setCaptionFacebook : k === 'youtube' ? setYoutubeTitle : k === 'twitterVideo' ? setTwitterVideoText : setLinkedinText;
                return (
                  <div key={k} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div><div className="font-extrabold text-white">{meta.label}</div><div className="text-xs text-white/50">{meta.sub}</div></div>
                      <PlatformBadge ok={copyOkForPlatform(k)} />
                    </div>
                    <textarea rows={meta.kind === 'title' ? 2 : 4} value={value} onChange={(e) => setter(e.target.value)}
                      placeholder={`${meta.kind === 'title' ? 'Title' : 'Caption'} for ${meta.label}…`}
                      className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 resize-none" />
                    <div className="mt-2 text-xs text-white/40">{value.length} chars</div>
                  </div>
                );
              })}
              <BottomNav />
            </div>
          )}

          {/* ── STEP 4: TWITTER POSTS ── */}
          {step === 4 && showTwitterPostsStep && (
            <div className="space-y-5">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-lg font-extrabold">Twitter/X Posts</h3>
                    <p className="text-white/60 text-sm mt-1">Add standalone tweets. Min 1 required.</p>
                  </div>
                  {audioUpload.status === 'done' && (
                    <button type="button" onClick={runAiForTwitterPosts} disabled={aiLoading}
                      className="rounded-xl px-4 py-2 text-xs font-extrabold inline-flex items-center gap-1.5 disabled:opacity-40"
                      style={{ background: GOLD_PRIMARY, color: '#000' }}>
                      {aiLoading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} AI Generate
                    </button>
                  )}
                </div>
                {aiError && <div className="mt-3 text-sm text-red-300 flex items-start gap-2"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {aiError}</div>}
              </div>
              {twitterPosts.map((post, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="font-extrabold text-white text-sm">Tweet {idx + 1}</div>
                    {twitterPosts.length > 1 && (
                      <button type="button" onClick={() => setTwitterPosts((p) => p.filter((_, i) => i !== idx))}
                        className="rounded-xl border border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/30 p-1.5 text-white/50 hover:text-red-300 transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <textarea rows={3} value={post} onChange={(e) => setTwitterPosts((p) => p.map((v, i) => i === idx ? e.target.value : v))}
                    placeholder="Write your tweet…"
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 resize-none" />
                  <div className="mt-2 text-xs" style={{ color: post.length > 280 ? '#f87171' : 'rgba(255,255,255,0.4)' }}>{post.length}/280</div>
                </div>
              ))}
              <button type="button" onClick={() => setTwitterPosts((p) => [...p, ''])}
                className="w-full rounded-2xl border border-dashed border-white/20 bg-white/3 hover:bg-white/8 p-4 text-sm font-extrabold text-white/60 hover:text-white transition inline-flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> Add Tweet
              </button>
              <BottomNav />
            </div>
          )}

          {/* ── STEP 5: SCHEDULE ── */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                <h3 className="text-lg font-extrabold">Scheduling</h3>
                <p className="text-white/60 text-sm mt-1">All times are Eastern (ET).</p>
              </div>
              <div className="flex gap-3">
                {(['same', 'different'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setScheduleMode(m)}
                    className="flex-1 rounded-2xl border p-4 text-sm font-extrabold transition"
                    style={{ borderColor: scheduleMode === m ? 'rgba(214,178,94,0.5)' : 'rgba(255,255,255,0.1)', background: scheduleMode === m ? 'rgba(214,178,94,0.08)' : 'rgba(255,255,255,0.03)', color: scheduleMode === m ? GOLD_HOVER : 'rgba(255,255,255,0.6)' }}>
                    {m === 'same' ? 'Same time for all' : 'Different per platform'}
                  </button>
                ))}
              </div>

              {scheduleMode === 'same' && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                  <div className="font-extrabold text-white">Publish Date & Time (ET)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-white/60 font-extrabold">Date</label>
                      <button type="button" onClick={() => openPicker(sameDateRef)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-left text-white relative">
                        {scheduleDate || <span className="text-white/30">YYYY-MM-DD</span>}
                        <input ref={sameDateRef} type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                      </button>
                    </div>
                    <div>
                      <label className="text-xs text-white/60 font-extrabold">Time (ET)</label>
                      <button type="button" onClick={() => openPicker(sameTimeRef)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-left text-white relative">
                        {scheduleTime || <span className="text-white/30">HH:MM</span>}
                        <input ref={sameTimeRef} type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                      </button>
                    </div>
                  </div>
                  {scheduleCommonInfo.ok && <div className="text-xs text-green-300 font-extrabold">✓ {scheduleCommonInfo.etDisplay}</div>}
                </div>
              )}

              {scheduleMode === 'different' && (
                <div className="space-y-3">
                  {enabledPlatforms.map((k) => {
                    const info = scheduleInfoByPlatform[k];
                    return (
                      <div key={k} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                        <div className="font-extrabold text-white mb-3">
                          {PLATFORM_META[k].label}
                          <span className="ml-2 text-xs font-bold text-white/50">{info?.ok ? `✓ ${info.etDisplay}` : info?.message}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="date" value={scheduleByPlatform[k]?.date || ''} onChange={(e) => setScheduleByPlatform((prev) => ({ ...prev, [k]: { ...prev[k], date: e.target.value } }))}
                            className="rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-white outline-none focus:border-white/30" />
                          <input type="time" value={scheduleByPlatform[k]?.time || ''} onChange={(e) => setScheduleByPlatform((prev) => ({ ...prev, [k]: { ...prev[k], time: e.target.value } }))}
                            className="rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm text-white outline-none focus:border-white/30" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <BottomNav />
            </div>
          )}

          {/* ── STEP 6: REVIEW & SUBMIT ── */}
          {step === 6 && (
            <div className="space-y-5">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                <h3 className="text-lg font-extrabold">Review</h3>
                <p className="text-white/60 text-sm mt-1">Everything in one clean list. Tap any item to edit.</p>
              </div>

              {!postizToken && (
                <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/8 p-4 text-sm text-yellow-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-extrabold">Social accounts not connected</div>
                      <div className="mt-1 text-yellow-200/70">Connect your accounts above to schedule posts.</div>
                      <button type="button" onClick={handleConnect}
                        className="mt-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-extrabold inline-flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5" /> Connect Now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <ListRow icon={<FileText className="h-5 w-5 text-white" />} title="Platforms" subtitle={enabledPlatforms.length ? enabledPlatforms.map((k) => PLATFORM_META[k].label).join(', ') : 'None'} right={<PlatformBadge ok={hasAnyPlatform} />} onClick={() => setStep(1)} />
                <ListRow icon={<Video className="h-5 w-5 text-white" />} title="Video" subtitle={videoUpload.status === 'done' ? `${videoUpload.fileName} • ${prettyBytes(videoUpload.size)}` : 'Missing'} right={<PlatformBadge ok={videoReady} />} onClick={() => setStep(2)} />
                <ListRow icon={<FileText className="h-5 w-5 text-white" />} title="Thumbnail (Optional)" subtitle={thumbnailUpload.status === 'done' ? `${thumbnailUpload.fileName} • ${prettyBytes(thumbnailUpload.size)}` : 'Not uploaded'} right={<PlatformBadge ok={true} />} onClick={() => setStep(2)} />
                <ListRow icon={<Mic className="h-5 w-5 text-white" />} title="Audio (for AI)" subtitle={audioUpload.status === 'done' ? `${audioUpload.fileName} • ${prettyBytes(audioUpload.size)}` : 'Not uploaded'} right={<PlatformBadge ok={true} />} onClick={() => setStep(showTwitterPostsStep ? 4 : 3)} />
                <ListRow icon={<Calendar className="h-5 w-5" style={{ color: GOLD_HOVER }} />} title="Scheduling" subtitle={scheduleReady ? (scheduleMode === 'same' ? 'Same time for all platforms' : 'Different times per platform') : 'Missing schedule'} right={<PlatformBadge ok={scheduleReady} />} onClick={() => setStep(5)} />
                <ListRow icon={<Link2 className="h-5 w-5 text-green-300" />} title="Social Accounts" subtitle={postizToken ? (integrations.length ? integrations.map((i) => i.name).join(', ') : 'No accounts found') : 'Not connected'} right={<PlatformBadge ok={Boolean(postizToken) && integrations.length > 0} />} />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-extrabold">Per-platform</div>
                  <div className="text-xs text-white/60">Ready <span className="font-extrabold text-white">{enabledPlatforms.filter((k) => isPlatformReviewReady(k)).length}</span>/{enabledPlatforms.length}</div>
                </div>
                <div className="mt-4 space-y-3">
                  {enabledPlatforms.map((k) => (
                    <ListRow key={k} icon={<CheckCircle2 className="h-5 w-5 text-white" />} title={PLATFORM_META[k].label} subtitle={scheduleSummaryForPlatform(k)} right={<PlatformBadge ok={isPlatformReviewReady(k)} />} onClick={() => setReviewPlatform(k)} />
                  ))}
                </div>
              </div>

              {submitResults.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
                  <div className="font-extrabold text-white text-sm mb-3">Submission Results</div>
                  {submitResults.map((r, i) => (
                    <div key={i} className={`flex items-start gap-2 text-sm ${r.ok ? 'text-green-200' : 'text-red-200'}`}>
                      {r.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                      <span><span className="font-extrabold">{r.platform}:</span> {r.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {submitError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-2 text-red-100 text-sm">
                  <AlertCircle className="h-5 w-5 mt-0.5 text-red-300 shrink-0" /> {submitError}
                </div>
              )}

              {submitOk && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 flex items-start gap-2 text-green-100">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-300 shrink-0" />
                  <div>
                    <div className="font-extrabold">Scheduled successfully.</div>
                    <div className="text-sm text-green-100/80">Your posts have been queued in your social media scheduler.</div>
                  </div>
                </div>
              )}

              <SlideToSubmit disabled={!reviewReadyToSubmit} loading={submitting} success={submitOk} onSubmit={submitToPostiz} />
              <BottomNav hideNext />

              <FullscreenModal open={Boolean(reviewPlatform)} title={reviewPlatform ? PLATFORM_META[reviewPlatform].label : ''} subtitle="Copy + schedule summary" onClose={() => setReviewPlatform(null)}>
                {reviewPlatform && (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="text-sm font-extrabold text-white">Schedule (ET)</div>
                      <div className="mt-2 text-sm text-white/70">{scheduleSummaryForPlatform(reviewPlatform)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="text-sm font-extrabold text-white">Copy</div>
                      {reviewPlatform === 'twitterPosts' ? (
                        <div className="mt-3 space-y-3">
                          {twitterPosts.map((t, idx) => t.trim() ? <div key={idx} className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white/80">{t.trim()}</div> : null)}
                          {!twitterPosts.some((t) => t.trim()) && <div className="mt-2 text-sm text-white/50">No posts added</div>}
                        </div>
                      ) : (
                        <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white/80 whitespace-pre-wrap">
                          {String(getCopyForPlatform(reviewPlatform as Exclude<PlatformKey, 'twitterPosts'>) || '').trim() || 'Missing'}
                        </div>
                      )}
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="text-sm font-extrabold text-white">Connected Account</div>
                      <div className="mt-2 space-y-1">
                        {integrations.filter((i) => i.type.toLowerCase() === POSTIZ_PLATFORM_TYPE[reviewPlatform]?.toLowerCase()).map((i) => (
                          <div key={i.id} className="text-sm text-green-300 font-extrabold">✓ {i.name}</div>
                        ))}
                        {!integrations.some((i) => i.type.toLowerCase() === POSTIZ_PLATFORM_TYPE[reviewPlatform]?.toLowerCase()) && (
                          <div className="text-sm text-red-300">No connected account for this platform</div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button type="button" onClick={() => { setReviewPlatform(null); if (reviewPlatform === 'twitterPosts') setStep(4); else { setStep(3); setActiveCaptionPlatform(reviewPlatform as Exclude<PlatformKey, 'twitterPosts'>); } }}
                        className="rounded-xl px-5 py-3 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10">Edit Copy</button>
                      <button type="button" onClick={() => { setReviewPlatform(null); setStep(5); setActiveSchedulePlatform(reviewPlatform); }}
                        className="rounded-xl px-5 py-3 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10">Edit Schedule</button>
                    </div>
                  </div>
                )}
              </FullscreenModal>
            </div>
          )}

        </div>
      </main>

      <div className="relative mt-10 pb-10 text-center text-xs text-white/40">
        Powered by Infinite Wealth Solutions AI.
      </div>
    </div>
  );
}