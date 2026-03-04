import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Loader, UploadCloud, CheckCircle2, AlertCircle, Sparkles,
  Calendar, X, Plus, Trash2, FileText, Video, Mic, Link2, Link2Off,
  RefreshCw, ChevronLeft, ChevronRight, LayoutGrid, List, Settings,
  Search, Clock, Send, Edit3, MoreHorizontal, Zap, Globe, Users,
  BarChart2, PlusCircle, ExternalLink,
} from 'lucide-react';
import { supabase } from '../services/vapiAI';
import { scheduleMedia } from '../services/postiz';

// ─── BRAND COLOURS ────────────────────────────────────────────────
const GOLD        = '#D6B25E';
const GOLD_LIGHT  = '#F0D27C';
const GOLD_DIM    = 'rgba(214,178,94,0.12)';
const GOLD_BORDER = 'rgba(214,178,94,0.35)';

// ─── POSTIZ CONFIG ────────────────────────────────────────────────
const POSTIZ_FRONTEND_URL = 'https://platform.postiz.com';
const POSTIZ_BACKEND_URL  = 'https://api.postiz.com';
const POSTIZ_CLIENT_ID    = 'pca_vu9LtBtHReFqeuA465OI8tOqONvva7gS';
const POSTIZ_REDIRECT_URL = 'https://infinitewealthsolutionsai.com/mediamachine/oauth/postiz/callback';
const LS_TOKEN_KEY        = 'postiz_access_token';
const LS_STATE_KEY        = 'postiz_oauth_state';

// ─── STORAGE ──────────────────────────────────────────────────────
const BUCKET             = 'media';
const MAX_BYTES          = 49 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

// ─── PLATFORM LOGOS (inline SVG) ─────────────────────────────────
const PlatformLogo: React.FC<{ platform: string; size?: number }> = ({ platform, size = 28 }) => {
  const s = size;
  switch (platform.toLowerCase()) {
    case 'instagram':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <defs>
            <radialGradient id="ig" cx="30%" cy="107%" r="150%">
              <stop offset="0%" stopColor="#fdf497"/>
              <stop offset="5%" stopColor="#fdf497"/>
              <stop offset="45%" stopColor="#fd5949"/>
              <stop offset="60%" stopColor="#d6249f"/>
              <stop offset="90%" stopColor="#285AEB"/>
            </radialGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill="url(#ig)"/>
          <path d="M12 7.5A4.5 4.5 0 1 0 12 16.5A4.5 4.5 0 0 0 12 7.5Z" stroke="#fff" strokeWidth="1.5" fill="none"/>
          <circle cx="16.8" cy="7.2" r="1" fill="#fff"/>
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="#fff" strokeWidth="1.5" fill="none"/>
        </svg>
      );
    case 'tiktok':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#010101"/>
          <path d="M15.5 5c.18 1.5 1.08 2.5 2.5 2.8v2.2c-.87 0-1.7-.25-2.5-.7v5.2c0 2.5-2 4.5-4.5 4.5S6.5 17 6.5 14.5 8.5 10 11 10v2.3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2V5h2.5z" fill="#fff"/>
          <path d="M18 7.8c.7.2 1.2.2 2 0" stroke="#00f2ea" strokeWidth="1" fill="none"/>
        </svg>
      );
    case 'facebook':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#1877F2"/>
          <path d="M15.5 12H13v8H10v-8H8.5V9.5H10V8c0-2 1-3 3-3h2v2.5h-1.3c-.6 0-.7.3-.7.8V9.5H15.5L15 12z" fill="#fff"/>
        </svg>
      );
    case 'youtube':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#FF0000"/>
          <path d="M19.8 7.8s-.2-1.4-.8-2c-.8-.8-1.7-.8-2.1-.9C14.5 4.8 12 4.8 12 4.8s-2.5 0-4.9.1c-.4.1-1.3.1-2.1.9-.6.6-.8 2-.8 2S4 9.4 4 11v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.3.8C8.7 18.7 12 18.7 12 18.7s2.5 0 4.9-.2c.4 0 1.3-.1 2.1-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2V11c0-1.6-.2-3.2-.2-3.2z" fill="#FF0000"/>
          <polygon points="10,9 10,15 15.5,12" fill="#fff"/>
        </svg>
      );
    case 'twitter':
    case 'x':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#000"/>
          <path d="M17.5 4h2.5L14 10.8 21 20h-5.3l-4.1-5.4L6.5 20H4l6.5-7.4L4 4h5.5l3.8 5 4.2-5zm-1 14.4h1.4L8 5.4H6.5l10 13z" fill="#fff"/>
        </svg>
      );
    case 'linkedin':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#0A66C2"/>
          <path d="M7 9.5H4.5v9H7v-9zM5.75 8.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM20 18.5h-2.5v-4.4c0-1-.4-1.7-1.3-1.7-.7 0-1.1.5-1.3 1-.1.2-.1.4-.1.6v4.5H12s.03-7.2 0-9h2.8v1.3c.4-.6 1-1.5 2.4-1.5 1.8 0 3.1 1.2 3.1 3.7v5.5H20z" fill="#fff"/>
        </svg>
      );
    case 'threads':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#000"/>
          <path d="M12.4 4c-4 0-6.7 2.6-6.7 7.5 0 5.2 2.5 8.5 6.7 8.5 2.3 0 3.9-.8 5-2.5l-1.4-.9c-.7 1.1-1.9 1.7-3.6 1.7-3 0-5-2.4-5-6.8 0-4.1 2.1-6.1 5-6.1 2 0 3.3.8 4 2.2.5.9.6 2 .5 3.1-.4-.1-.7-.2-1.1-.2-2.3 0-3.7 1.3-3.7 3.2 0 2 1.4 3.3 3.5 3.3 1.3 0 2.3-.5 2.9-1.5.5-.8.7-1.9.7-3.2 0-4.3-2.3-7-6.8-7z" fill="#fff"/>
        </svg>
      );
    case 'bluesky':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#0085ff"/>
          <path d="M12 9.5C10.5 7.5 7 5 5.5 5 4 5 3 6 3 7.5c0 1.3.7 2.5 2 3-.5.1-1 .1-1.5.1 1 2 3.5 2.5 5.5 2.5-.5 1-1.5 2.5-3 3.5 2 0 4-1 5-3 1 2 3 3 5 3-1.5-1-2.5-2.5-3-3.5 2 0 4.5-.5 5.5-2.5-.5 0-1 0-1.5-.1 1.3-.5 2-1.7 2-3 0-1.5-1-2.5-2.5-2.5C17 5 13.5 7.5 12 9.5z" fill="#fff"/>
        </svg>
      );
    case 'pinterest':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#E60023"/>
          <path d="M12 3C7 3 3 7 3 12c0 3.8 2.3 7.1 5.7 8.5-.1-.7-.1-1.7.1-2.4l1.1-4.7s-.3-.6-.3-1.4c0-1.4.8-2.4 1.9-2.4.9 0 1.3.7 1.3 1.5 0 .9-.6 2.3-.9 3.5-.2 1 .5 1.9 1.5 1.9 1.8 0 3.2-1.9 3.2-4.7 0-2.4-1.7-4.1-4.2-4.1-2.9 0-4.5 2.1-4.5 4.3 0 .8.3 1.7.7 2.2.1.1.1.2 0 .3l-.3 1c-.1.3-.3.4-.6.2-1.6-.7-2.6-3-2.6-4.8 0-3.9 2.9-7.5 8.2-7.5 4.3 0 7.7 3.1 7.7 7.2 0 4.3-2.7 7.8-6.5 7.8-1.3 0-2.5-.7-2.9-1.4l-.8 3.1c-.3 1.1-1.1 2.5-1.6 3.3.3.1.6.1.9.1 5 0 9-4 9-9s-4-9-9-9z" fill="#fff"/>
        </svg>
      );
    case 'reddit':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#FF4500"/>
          <circle cx="12" cy="12" r="7" fill="#FF4500"/>
          <path d="M20 12c0-1-.8-1.8-1.8-1.8-.5 0-.9.2-1.2.5-1.2-.8-2.8-1.4-4.6-1.4l.8-3.8 2.6.6c0 .7.6 1.3 1.3 1.3.7 0 1.3-.6 1.3-1.3 0-.7-.6-1.3-1.3-1.3-.5 0-.9.3-1.2.7l-2.9-.6c-.2 0-.3.1-.3.2l-.9 4.2c-1.8 0-3.4.6-4.6 1.4-.3-.3-.8-.5-1.2-.5-1 0-1.8.8-1.8 1.8 0 .7.4 1.4 1 1.7v.4c0 2.7 3.1 4.8 7 4.8s7-2.1 7-4.8v-.4c.6-.3 1-1 1-1.7z" fill="#fff"/>
          <circle cx="9.5" cy="12.5" r="1" fill="#FF4500"/>
          <circle cx="14.5" cy="12.5" r="1" fill="#FF4500"/>
          <path d="M10 14.5s.5 1 2 1 2-1 2-1" stroke="#FF4500" strokeWidth=".8" fill="none" strokeLinecap="round"/>
        </svg>
      );
    case 'discord':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#5865F2"/>
          <path d="M18.5 5.4A17.4 17.4 0 0 0 15 4.3a.07.07 0 0 0-.07.03 12 12 0 0 0-.53 1.08 16 16 0 0 0-4.8 0 10.9 10.9 0 0 0-.54-1.08.07.07 0 0 0-.07-.03A17.4 17.4 0 0 0 5.5 5.4a.07.07 0 0 0-.03.03C4 7.6 3.5 9.7 3.75 11.8a.08.08 0 0 0 .03.05 17.5 17.5 0 0 0 5.25 2.65.07.07 0 0 0 .08-.03 12.5 12.5 0 0 0 1.07-1.75.07.07 0 0 0-.04-.1 11.5 11.5 0 0 1-1.65-.78.07.07 0 0 1-.01-.12l.33-.26a.07.07 0 0 1 .07 0c3.46 1.58 7.2 1.58 10.62 0a.07.07 0 0 1 .07 0l.33.26a.07.07 0 0 1-.01.12 10.8 10.8 0 0 1-1.65.78.07.07 0 0 0-.04.1c.32.6.68 1.18 1.07 1.75a.07.07 0 0 0 .08.03 17.4 17.4 0 0 0 5.26-2.65.07.07 0 0 0 .03-.05c.3-2.58-.49-4.68-2.04-6.37a.06.06 0 0 0-.03-.03zM9.36 10.5c-1.03 0-1.88-.95-1.88-2.11s.83-2.11 1.88-2.11c1.06 0 1.9.96 1.88 2.11 0 1.16-.83 2.11-1.88 2.11zm6.29 0c-1.04 0-1.88-.95-1.88-2.11s.83-2.11 1.88-2.11c1.06 0 1.9.96 1.88 2.11 0 1.16-.82 2.11-1.88 2.11z" fill="#fff"/>
        </svg>
      );
    case 'telegram':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#26A5E4"/>
          <path d="M5 12l3.5 1.5 1.5 4.5 2.5-3 3.5 2.5 3-10L5 12zm3.5 1.5l7-4.5-5 5.5 5 3.5-1.5-4.5" fill="#fff"/>
        </svg>
      );
    case 'mastodon':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#563ACC"/>
          <path d="M20 11.4c0-3.5-2.3-4.6-2.3-4.6-1.1-.5-3-.8-5-.8h-.1c-2 0-3.8.3-4.9.8 0 0-2.3 1.1-2.3 4.6v.7c.1 2.3.4 4.5 2.3 5.1 1 .3 1.9.4 2.7.3l-.1-.8-.3-1.1s-.4.5-1.1.5c-.8 0-1.2-.7-1.2-2.2V12c0-1.5.5-2.2 1.5-2.2.8 0 1.2.5 1.2 1.5l.1 2.7h1.5l.1-2.7c0-1 .4-1.5 1.2-1.5 1 0 1.5.7 1.5 2.2v1.7c0 1.5-.4 2.2-1.2 2.2-.7 0-1.1-.5-1.1-.5l-.3 1.1-.1.8c.8.1 1.7 0 2.7-.3 1.9-.6 2.2-2.8 2.3-5.1v-.7z" fill="#fff"/>
        </svg>
      );
    default:
      return (
        <div style={{ width: s, height: s, borderRadius: 6, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: s * 0.5, color: '#fff' }}>
          {platform[0]?.toUpperCase() || '?'}
        </div>
      );
  }
};

// ─── PLATFORM COLOURS ─────────────────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C', tiktok: '#ff0050', facebook: '#1877F2',
  youtube: '#FF0000', twitter: '#000000', x: '#000000', linkedin: '#0A66C2',
  twitterposts: '#000000', twittervideo: '#000000', threads: '#000000',
  bluesky: '#0085ff', pinterest: '#E60023', reddit: '#FF4500',
  discord: '#5865F2', telegram: '#26A5E4', mastodon: '#563ACC',
};

const POSTIZ_PLATFORM_TYPE: Record<string, string> = {
  instagram: 'instagram', tiktok: 'tiktok', facebook: 'facebook',
  youtube: 'youtube', twitterVideo: 'twitter', linkedin: 'linkedin', twitterPosts: 'twitter',
};

// ─── TYPES ────────────────────────────────────────────────────────
type MediaKind = 'video' | 'audio' | 'thumbnail';
type AppView = 'calendar' | 'list' | 'compose';
type PlatformKey = 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'twitterVideo' | 'linkedin' | 'twitterPosts';
type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'done'; path: string; url: string; fileName: string; mime: string; size: number }
  | { status: 'error'; message: string };
type ScheduleInfo =
  | { ok: true; timezone: string; etDisplay: string; rfc3339WithOffset: string; utcIso: string; unixSeconds: number }
  | { ok: false; message: string };
type PostizIntegration = { id: string; name: string; type: string; picture?: string };
type ScheduledPost = { id: string; platform: string; content: string; scheduledFor: Date; status: 'scheduled' | 'published' | 'failed' };
type AiGenResponse = {
  tweets: string[];
  captions: { instagram: string[]; facebook: string[]; tiktok: string[] };
  youtubeTitles: string[];
  best: { instagram: string; facebook: string; tiktok: string; youtubeTitle: string };
};

const PLATFORM_META: Record<PlatformKey, { label: string; sub: string; kind: 'caption' | 'title' | 'text' | 'posts' }> = {
  instagram:    { label: 'Instagram',  sub: 'Reels caption',     kind: 'caption' },
  tiktok:       { label: 'TikTok',     sub: 'Caption',           kind: 'caption' },
  facebook:     { label: 'Facebook',   sub: 'Reels caption',     kind: 'caption' },
  youtube:      { label: 'YouTube',    sub: 'Shorts title',      kind: 'title'   },
  twitterVideo: { label: 'X (Video)',  sub: 'Post text',         kind: 'text'    },
  linkedin:     { label: 'LinkedIn',   sub: 'Post text',         kind: 'text'    },
  twitterPosts: { label: 'X Posts',   sub: 'Standalone tweets', kind: 'posts'   },
};

// Full list of Postiz-supported platforms for the connect modal
const ALL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok',    label: 'TikTok'    },
  { id: 'facebook',  label: 'Facebook'  },
  { id: 'youtube',   label: 'YouTube'   },
  { id: 'twitter',   label: 'X (Twitter)' },
  { id: 'linkedin',  label: 'LinkedIn'  },
  { id: 'threads',   label: 'Threads'   },
  { id: 'bluesky',   label: 'Bluesky'   },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'reddit',    label: 'Reddit'    },
  { id: 'discord',   label: 'Discord'   },
  { id: 'telegram',  label: 'Telegram'  },
  { id: 'mastodon',  label: 'Mastodon'  },
];

const DEMO_POSTS: ScheduledPost[] = [
  { id: '1', platform: 'instagram', content: 'Building wealth starts with the right mindset. 💰', scheduledFor: new Date(Date.now() + 86400000), status: 'scheduled' },
  { id: '2', platform: 'linkedin', content: 'The 3 strategies we use to grow passive income.', scheduledFor: new Date(Date.now() + 172800000), status: 'scheduled' },
  { id: '3', platform: 'twitter', content: "Financial freedom is not a dream, it's a plan. 🧠", scheduledFor: new Date(Date.now() - 86400000), status: 'published' },
  { id: '4', platform: 'youtube', content: 'How We Built a 7-Figure Portfolio | Full Breakdown', scheduledFor: new Date(Date.now() + 259200000), status: 'scheduled' },
  { id: '5', platform: 'tiktok', content: 'POV: You discovered compound interest at 22 🚀', scheduledFor: new Date(Date.now() - 43200000), status: 'published' },
];

// ─── HELPERS ──────────────────────────────────────────────────────
function prettyBytes(b: number) {
  if (!b) return '0 B';
  const u = ['B','KB','MB','GB'];
  const i = Math.min(3, Math.floor(Math.log(b) / Math.log(1024)));
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}
function generateState() {
  const a = new Uint8Array(16);
  window.crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2,'0')).join('');
}
// Build OAuth2 Authorization Code URL per Postiz docs
function buildAuthUrl(state: string) {
  const params = new URLSearchParams({
  client_id:     POSTIZ_CLIENT_ID,
  response_type: 'code',
  redirect_uri:  POSTIZ_REDIRECT_URL,
  state,
});
  return `${POSTIZ_FRONTEND_URL}/oauth/authorize?${params.toString()}`;
}
async function postizFetch(path: string, token: string, opts: RequestInit = {}) {
  return fetch(`${POSTIZ_BACKEND_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: token, ...(opts.headers || {}) },
  });
}
async function fetchIntegrations(token: string): Promise<PostizIntegration[]> {
  const r = await postizFetch('/public/v1/integrations', token);
  if (!r.ok) throw new Error(`Failed (${r.status})`);
  const d = await r.json();
  return Array.isArray(d?.integrations) ? d.integrations : [];
}

const TZ_ET = 'America/New_York';
const pad2 = (n: number) => String(n).padStart(2,'0');

function formatPartsInTz(d: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false });
  const parts = dtf.formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return { year:+get('year'), month:+get('month'), day:+get('day'), hour:+get('hour'), minute:+get('minute'), second:+get('second') };
}
function toUtcFromEt(dateStr: string, timeStr: string): ScheduleInfo {
  if (!dateStr || !timeStr) return { ok: false, message: 'Choose date & time (ET).' };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const t = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!m || !t) return { ok: false, message: 'Invalid format.' };
  const [y,mo,da,hh,mm] = [m[1],m[2],m[3],t[1],t[2]].map(Number);
  let guess = Date.UTC(y, mo-1, da, hh, mm, 0);
  for (let i = 0; i < 4; i++) {
    const et = formatPartsInTz(new Date(guess), TZ_ET);
    const diff = Date.UTC(y,mo-1,da,hh,mm,0) - Date.UTC(et.year,et.month-1,et.day,et.hour,et.minute,0);
    if (Math.abs(diff) < 1000) break;
    guess += diff;
  }
  const utcDate = new Date(guess);
  const etP = formatPartsInTz(utcDate, TZ_ET);
  const etAsUtc = Date.UTC(etP.year,etP.month-1,etP.day,etP.hour,etP.minute,etP.second);
  const offMin = Math.round((etAsUtc - utcDate.getTime()) / 60000);
  const sign = offMin <= 0 ? '-' : '+';
  const abs = Math.abs(offMin);
  const offStr = `${sign}${pad2(Math.floor(abs/60))}:${pad2(abs%60)}`;
  const rfc = `${etP.year}-${pad2(etP.month)}-${pad2(etP.day)}T${pad2(etP.hour)}:${pad2(etP.minute)}:${pad2(etP.second)}${offStr}`;
  const display = new Intl.DateTimeFormat('en-US',{ timeZone:TZ_ET, year:'numeric', month:'short', day:'2-digit', hour:'numeric', minute:'2-digit', hour12:true, timeZoneName:'short' }).format(utcDate);
  return { ok:true, timezone:TZ_ET, etDisplay:display, rfc3339WithOffset:rfc, utcIso:utcDate.toISOString(), unixSeconds:Math.floor(utcDate.getTime()/1000) };
}

// ─── GLOBAL STYLE ─────────────────────────────────────────────────
const globalStyle = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
  * { box-sizing: border-box; }
  input[type="date"], input[type="time"] { color-scheme: dark; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
  .platform-card:hover { background: rgba(255,255,255,0.06) !important; }
  .row-hover:hover { background: rgba(255,255,255,0.03) !important; }
  .nav-btn:hover { background: rgba(255,255,255,0.07) !important; color: rgba(255,255,255,0.9) !important; }
`;

// ─── CONNECT ACCOUNTS MODAL ───────────────────────────────────────
function ConnectAccountsModal({
  open, onClose, integrations, token, onConnect,
}: {
  open: boolean; onClose: () => void; integrations: PostizIntegration[]; token: string | null; onConnect: () => void;
}) {
  if (!open) return null;
  const connectedTypes = new Set(integrations.map(i => i.type.toLowerCase()));

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }} />

      {/* Panel */}
      <div style={{ position:'relative', width:'100%', maxWidth:560, background:'#131313', borderRadius:18, border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 40px 100px rgba(0,0,0,0.8)', animation:'scaleIn .18s ease', overflow:'hidden', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexShrink:0 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>Connect Social Accounts</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.45)', marginTop:4 }}>
              {token
                ? `${integrations.length} account${integrations.length !== 1 ? 's' : ''} connected via Postiz`
                : 'Authorize Postiz to link your social media accounts'}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.6)', flexShrink:0 }}>
            <X style={{ width:16, height:16 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY:'auto', padding:'20px 24px 24px' }}>
          {!token ? (
            // Not connected — show OAuth CTA
            <div style={{ textAlign:'center', padding:'20px 0 10px' }}>
              <div style={{ width:64, height:64, borderRadius:16, background:GOLD_DIM, border:`1px solid ${GOLD_BORDER}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
                <Link2 style={{ width:28, height:28, color:GOLD }} />
              </div>
              <div style={{ fontSize:16, fontWeight:700, color:'#fff', marginBottom:8 }}>Connect via Postiz</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', lineHeight:1.6, maxWidth:340, margin:'0 auto 24px' }}>
                Postiz securely manages your social media connections. Click below to authorize access — you'll be redirected to Postiz then right back here.
              </div>

              {/* Platform grid preview */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:28 }}>
                {ALL_PLATFORMS.map(p => (
                  <div key={p.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, padding:'12px 8px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    <PlatformLogo platform={p.id} size={28} />
                    <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:600 }}>{p.label}</span>
                  </div>
                ))}
              </div>

              <button onClick={onConnect} style={{ width:'100%', padding:'13px 20px', borderRadius:10, background:`linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`, color:'#000', fontSize:14, fontWeight:800, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <ExternalLink style={{ width:16, height:16 }} /> Authorize with Postiz
              </button>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:12 }}>
                You'll be redirected to Postiz to approve access. No passwords are shared with us.
              </p>
            </div>
          ) : (
            // Connected — show accounts + platform grid
            <>
              {/* Connected accounts */}
              {integrations.length > 0 && (
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:10 }}>Connected Accounts</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {integrations.map(intg => (
                      <div key={intg.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, background:'rgba(74,222,128,0.05)', border:'1px solid rgba(74,222,128,0.15)' }}>
                        <PlatformLogo platform={intg.type} size={28} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{intg.name}</div>
                          <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:1, textTransform:'capitalize' }}>{intg.type}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <span style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', display:'inline-block' }} />
                          <span style={{ fontSize:11, color:'#4ade80', fontWeight:600 }}>Active</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All supported platforms */}
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:10 }}>All Supported Platforms</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
                  {ALL_PLATFORMS.map(p => {
                    const connected = connectedTypes.has(p.id.toLowerCase());
                    return (
                      <div key={p.id} className="platform-card" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'14px 8px', borderRadius:10, background: connected ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.03)', border:`1px solid ${connected ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}`, position:'relative', transition:'background .15s', cursor:'default' }}>
                        <PlatformLogo platform={p.id} size={30} />
                        <span style={{ fontSize:10, color: connected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)', fontWeight:600, textAlign:'center' }}>{p.label}</span>
                        {connected && (
                          <span style={{ position:'absolute', top:6, right:6, width:8, height:8, borderRadius:'50%', background:'#4ade80', boxShadow:'0 0 0 2px rgba(74,222,128,0.2)' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add more via Postiz */}
              <a href="https://platform.postiz.com" target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'11px 16px', borderRadius:10, background:GOLD_DIM, border:`1px solid ${GOLD_BORDER}`, color:GOLD, fontSize:13, fontWeight:700, textDecoration:'none' }}>
                <ExternalLink style={{ width:14, height:14 }} /> Add More Accounts in Postiz Dashboard
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MINI CALENDAR ────────────────────────────────────────────────
function MiniCalendar({ selectedDate, onSelect, posts }: { selectedDate: Date; onSelect: (d:Date) => void; posts: ScheduledPost[] }) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const monthName = viewDate.toLocaleString('default', { month:'long', year:'numeric' });
  const postDays = new Set(posts.filter(p => p.scheduledFor.getFullYear()===year && p.scheduledFor.getMonth()===month).map(p => p.scheduledFor.getDate()));
  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <button type="button" onClick={() => setViewDate(new Date(year,month-1,1))} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', padding:4, lineHeight:0 }}><ChevronLeft style={{width:13,height:13}}/></button>
        <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.75)' }}>{monthName}</span>
        <button type="button" onClick={() => setViewDate(new Date(year,month+1,1))} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', padding:4, lineHeight:0 }}><ChevronRight style={{width:13,height:13}}/></button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1, marginBottom:3 }}>
        {['S','M','T','W','T','F','S'].map((d,i)=><div key={i} style={{textAlign:'center',fontSize:9,fontWeight:600,color:'rgba(255,255,255,0.25)',padding:'2px 0'}}>{d}</div>)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:1 }}>
        {cells.map((day,i) => {
          if (!day) return <div key={i}/>;
          const isToday = day===new Date().getDate() && month===new Date().getMonth() && year===new Date().getFullYear();
          const isSel = day===selectedDate.getDate() && month===selectedDate.getMonth() && year===selectedDate.getFullYear();
          const hasPosts = postDays.has(day);
          return (
            <button key={i} type="button" onClick={()=>onSelect(new Date(year,month,day))}
              style={{ aspectRatio:'1', borderRadius:5, fontSize:10, fontWeight:isSel||isToday?700:400, background:isSel?GOLD:isToday?'rgba(214,178,94,0.12)':'transparent', color:isSel?'#000':isToday?GOLD:'rgba(255,255,255,0.6)', border:isToday&&!isSel?`1px solid ${GOLD_BORDER}`:'1px solid transparent', cursor:'pointer', position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {day}
              {hasPosts && !isSel && <span style={{position:'absolute',bottom:1,left:'50%',transform:'translateX(-50%)',width:3,height:3,borderRadius:'50%',background:GOLD,opacity:0.7}}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────
function Sidebar({ view, onView, integrations, token, onOpenConnectModal, selectedDate, onSelectDate, posts }: {
  view: AppView; onView: (v:AppView) => void; integrations: PostizIntegration[]; token: string|null;
  onOpenConnectModal: () => void; selectedDate: Date; onSelectDate: (d:Date) => void; posts: ScheduledPost[];
}) {
  const navItems: { key: AppView; icon: React.FC<any>; label: string }[] = [
    { key:'calendar', icon:Calendar, label:'Calendar' },
    { key:'list',     icon:List,     label:'Posts' },
    { key:'compose',  icon:Edit3,    label:'New Post' },
  ];

  return (
    <aside style={{ width:232, flexShrink:0, background:'#0f0f0f', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0, overflow:'hidden' }}>
      {/* Logo */}
      <div style={{ padding:'20px 16px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Zap style={{ width:16, height:16, color:'#000' }}/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:'#fff', lineHeight:1 }}>IWS Media</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:3 }}>Distribution Hub</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding:'10px 8px', display:'flex', flexDirection:'column', gap:1 }}>
        {navItems.map(({key,icon:Icon,label}) => {
          const active = view===key;
          return (
            <button key={key} type="button" onClick={()=>onView(key)} className="nav-btn"
              style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', borderRadius:8, border:'none', cursor:'pointer', transition:'all .15s', background:active?GOLD_DIM:'transparent', color:active?GOLD:'rgba(255,255,255,0.5)', fontWeight:active?700:500, fontSize:13, width:'100%', textAlign:'left' }}>
              <Icon style={{width:15,height:15,flexShrink:0}}/>
              {label}
              {key==='list' && posts.filter(p=>p.status==='scheduled').length>0 && (
                <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:8, background:GOLD_DIM, color:GOLD }}>{posts.filter(p=>p.status==='scheduled').length}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mini Calendar */}
      <div style={{ padding:'10px 14px 14px', borderTop:'1px solid rgba(255,255,255,0.05)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <MiniCalendar selectedDate={selectedDate} onSelect={onSelectDate} posts={posts}/>
      </div>

      {/* Channels */}
      <div style={{ padding:'12px 14px', flex:1, overflowY:'auto' }}>
        <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.25)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Channels</div>
        {token && integrations.length > 0 ? (
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {integrations.slice(0,7).map(intg => (
              <div key={intg.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:7, background:'rgba(255,255,255,0.03)' }}>
                <PlatformLogo platform={intg.type} size={20}/>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.65)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{intg.name}</span>
                <span style={{ width:5, height:5, borderRadius:'50%', background:'#4ade80', flexShrink:0 }}/>
              </div>
            ))}
            {integrations.length > 7 && <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', textAlign:'center', padding:'4px 0' }}>+{integrations.length-7} more</div>}
            <button type="button" onClick={onOpenConnectModal} style={{ marginTop:4, width:'100%', padding:'7px 10px', borderRadius:7, border:`1px solid ${GOLD_BORDER}`, background:GOLD_DIM, color:GOLD, fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5, justifyContent:'center' }}>
              <RefreshCw style={{width:11,height:11}}/> Manage
            </button>
          </div>
        ) : (
          <button type="button" onClick={onOpenConnectModal}
            style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1px dashed ${GOLD_BORDER}`, background:GOLD_DIM, color:GOLD, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:7, justifyContent:'center' }}>
            <Link2 style={{width:13,height:13}}/> Connect Accounts
          </button>
        )}
      </div>

      {/* Bottom */}
      <div style={{ padding:'10px 10px 14px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', gap:6 }}>
        {token && (
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 10px', borderRadius:7, background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.15)' }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', flexShrink:0 }}/>
            <span style={{ fontSize:11, color:'rgba(74,222,128,0.9)', fontWeight:600, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Postiz Connected</span>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── TOP BAR ──────────────────────────────────────────────────────
function TopBar({ view, onView, onCompose }: { view: AppView; onView: (v:AppView)=>void; onCompose:()=>void }) {
  const titles: Record<AppView,string> = { calendar:'Content Calendar', list:'Scheduled Posts', compose:'New Post' };
  return (
    <div style={{ height:54, borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 22px', background:'#0d0d0d', position:'sticky', top:0, zIndex:50, flexShrink:0 }}>
      <h1 style={{ fontSize:14, fontWeight:700, color:'#fff', margin:0 }}>{titles[view]}</h1>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ display:'flex', background:'rgba(255,255,255,0.05)', borderRadius:8, padding:2, border:'1px solid rgba(255,255,255,0.08)' }}>
          {(['calendar','list'] as const).map(v => (
            <button key={v} type="button" onClick={()=>onView(v)}
              style={{ padding:'5px 11px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, transition:'all .15s', background:view===v?'rgba(255,255,255,0.1)':'transparent', color:view===v?'#fff':'rgba(255,255,255,0.4)', display:'flex', alignItems:'center', gap:5 }}>
              {v==='calendar'?<LayoutGrid style={{width:12,height:12}}/>:<List style={{width:12,height:12}}/>}
              {v==='calendar'?'Calendar':'Posts'}
            </button>
          ))}
        </div>
        <button type="button" onClick={onCompose}
          style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`, color:'#000', fontSize:12, fontWeight:800, border:'none', cursor:'pointer' }}>
          <PlusCircle style={{width:13,height:13}}/> New Post
        </button>
      </div>
    </div>
  );
}

// ─── CALENDAR VIEW ────────────────────────────────────────────────
function CalendarView({ selectedDate, onSelectDate, posts, onCompose }: { selectedDate:Date; onSelectDate:(d:Date)=>void; posts:ScheduledPost[]; onCompose:()=>void }) {
  const year = selectedDate.getFullYear(), month = selectedDate.getMonth();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const firstDay = new Date(year,month,1).getDay();
  const monthName = selectedDate.toLocaleString('default',{month:'long',year:'numeric'});
  const postsByDay = useMemo(()=>{
    const map: Record<number,ScheduledPost[]> = {};
    posts.forEach(p=>{
      if (p.scheduledFor.getFullYear()===year && p.scheduledFor.getMonth()===month) {
        const d = p.scheduledFor.getDate();
        if (!map[d]) map[d]=[];
        map[d].push(p);
      }
    });
    return map;
  },[posts,year,month]);
  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const weeks: (number|null)[][] = [];
  for (let i=0;i<cells.length;i+=7) weeks.push([...cells.slice(i,i+7),...Array(7-cells.slice(i,i+7).length).fill(null)]);

  return (
    <div style={{ padding:22, animation:'fadeIn .2s ease' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
        <button type="button" onClick={()=>onSelectDate(new Date(year,month-1,1))} style={{ width:30,height:30,borderRadius:7,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,0.5)',lineHeight:0 }}><ChevronLeft style={{width:14,height:14}}/></button>
        <h2 style={{ fontSize:16,fontWeight:700,color:'#fff',margin:0,flex:1 }}>{monthName}</h2>
        <button type="button" onClick={()=>onSelectDate(new Date(year,month+1,1))} style={{ width:30,height:30,borderRadius:7,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'rgba(255,255,255,0.5)',lineHeight:0 }}><ChevronRight style={{width:14,height:14}}/></button>
        <button type="button" onClick={()=>onSelectDate(new Date())} style={{ padding:'5px 12px',borderRadius:6,border:'1px solid rgba(255,255,255,0.1)',background:'none',color:'rgba(255,255,255,0.45)',fontSize:12,fontWeight:600,cursor:'pointer' }}>Today</button>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:1,marginBottom:1 }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} style={{padding:'7px 10px',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.25)',letterSpacing:'0.04em',textTransform:'uppercase'}}>{d}</div>)}
      </div>
      <div style={{ display:'flex',flexDirection:'column',gap:1 }}>
        {weeks.map((week,wi)=>(
          <div key={wi} style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:1 }}>
            {week.map((day,di)=>{
              const isToday = day===new Date().getDate() && month===new Date().getMonth() && year===new Date().getFullYear();
              const dayPosts = day?(postsByDay[day]||[]):[];
              return (
                <div key={di} onClick={day?()=>onSelectDate(new Date(year,month,day)):undefined}
                  style={{ minHeight:90,background:day?'rgba(255,255,255,0.02)':'transparent',border:'1px solid rgba(255,255,255,0.05)',borderRadius:6,padding:'7px 8px',cursor:day?'pointer':'default' }}>
                  {day&&(
                    <>
                      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5 }}>
                        <span style={{ fontSize:12,fontWeight:isToday?700:400,color:isToday?'#000':'rgba(255,255,255,0.55)',background:isToday?GOLD:'transparent',width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center' }}>{day}</span>
                        <button type="button" onClick={e=>{e.stopPropagation();onCompose();}} style={{opacity:0,background:'none',border:'none',cursor:'pointer',color:GOLD,padding:0,lineHeight:0,transition:'opacity .15s'}} className="add-btn"><Plus style={{width:11,height:11}}/></button>
                      </div>
                      {dayPosts.slice(0,3).map(p=>(
                        <div key={p.id} style={{ display:'flex',alignItems:'center',gap:4,padding:'2px 5px',borderRadius:3,background:`${PLATFORM_COLORS[p.platform]||GOLD}18`,borderLeft:`2px solid ${PLATFORM_COLORS[p.platform]||GOLD}`,marginBottom:2 }}>
                          <PlatformLogo platform={p.platform} size={10}/>
                          <span style={{ fontSize:9,color:'rgba(255,255,255,0.65)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>{p.content.slice(0,20)}{p.content.length>20?'…':''}</span>
                        </div>
                      ))}
                      {dayPosts.length>3&&<div style={{fontSize:9,color:'rgba(255,255,255,0.25)',paddingLeft:5}}>+{dayPosts.length-3} more</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LIST VIEW ────────────────────────────────────────────────────
function ListView({ posts }: { posts: ScheduledPost[] }) {
  const [filter, setFilter] = useState<'all'|'scheduled'|'published'>('all');
  const filtered = filter==='all'?posts:posts.filter(p=>p.status===filter);
  return (
    <div style={{ padding:22, animation:'fadeIn .2s ease' }}>
      <div style={{ display:'flex',gap:8,marginBottom:18,flexWrap:'wrap',alignItems:'center' }}>
        {(['all','scheduled','published'] as const).map(f=>(
          <button key={f} type="button" onClick={()=>setFilter(f)}
            style={{ padding:'6px 14px',borderRadius:7,border:`1px solid ${filter===f?GOLD_BORDER:'rgba(255,255,255,0.08)'}`,background:filter===f?GOLD_DIM:'transparent',color:filter===f?GOLD:'rgba(255,255,255,0.45)',fontSize:12,fontWeight:600,cursor:'pointer' }}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
        <div style={{ marginLeft:'auto',display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'6px 12px',border:'1px solid rgba(255,255,255,0.07)' }}>
          <Search style={{width:12,height:12,color:'rgba(255,255,255,0.3)'}}/>
          <input placeholder="Search posts…" style={{ background:'none',border:'none',outline:'none',fontSize:12,color:'rgba(255,255,255,0.7)',width:130 }}/>
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 130px 170px 100px',gap:12,padding:'7px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)',marginBottom:4 }}>
        {['Content','Platform','Scheduled','Status'].map(h=><div key={h} style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</div>)}
      </div>
      {filtered.map(post=>(
        <div key={post.id} className="row-hover" style={{ display:'grid',gridTemplateColumns:'1fr 130px 170px 100px',gap:12,padding:'11px 14px',borderBottom:'1px solid rgba(255,255,255,0.04)',alignItems:'center',borderRadius:6,transition:'background .1s' }}>
          <div style={{ fontSize:13,color:'rgba(255,255,255,0.8)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:500 }}>{post.content}</div>
          <div style={{ display:'flex',alignItems:'center',gap:7 }}>
            <PlatformLogo platform={post.platform} size={20}/>
            <span style={{ fontSize:12,color:'rgba(255,255,255,0.55)',textTransform:'capitalize' }}>{post.platform}</span>
          </div>
          <div style={{ fontSize:12,color:'rgba(255,255,255,0.45)' }}>{post.scheduledFor.toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</div>
          <div>
            {post.status==='published'
              ? <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:12,background:'rgba(74,222,128,0.12)',color:'#4ade80',border:'1px solid rgba(74,222,128,0.25)' }}>Published</span>
              : post.status==='failed'
              ? <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:12,background:'rgba(239,68,68,0.12)',color:'#f87171',border:'1px solid rgba(239,68,68,0.25)' }}>Failed</span>
              : <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:12,background:'rgba(96,165,250,0.12)',color:'#60a5fa',border:'1px solid rgba(96,165,250,0.25)' }}>Scheduled</span>
            }
          </div>
        </div>
      ))}
      {filtered.length===0&&(
        <div style={{ textAlign:'center',padding:'60px 20px',color:'rgba(255,255,255,0.25)' }}>
          <Calendar style={{width:32,height:32,margin:'0 auto 12px',opacity:.3}}/>
          <div style={{fontSize:14,fontWeight:600}}>No posts found</div>
          <div style={{fontSize:12,marginTop:4}}>Create a new post using the button above</div>
        </div>
      )}
    </div>
  );
}

// ─── COMPOSE PANEL ────────────────────────────────────────────────
type Step = 1|2|3|4|5|6;

function ComposePanel({ token, integrations, integrationsLoading, onOpenConnectModal }: {
  token:string|null; integrations:PostizIntegration[]; integrationsLoading:boolean; onOpenConnectModal:()=>void;
}) {
  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<Record<PlatformKey,boolean>>({ instagram:false,tiktok:false,facebook:false,youtube:false,twitterVideo:false,linkedin:false,twitterPosts:false });
  const [videoFile, setVideoFile] = useState<File|null>(null);
  const [videoUpload, setVideoUpload] = useState<UploadState>({status:'idle'});
  const [thumbnailFile, setThumbnailFile] = useState<File|null>(null);
  const [thumbnailUpload, setThumbnailUpload] = useState<UploadState>({status:'idle'});
  const [audioFile, setAudioFile] = useState<File|null>(null);
  const [audioUpload, setAudioUpload] = useState<UploadState>({status:'idle'});
  const [tone, setTone] = useState('confident, punchy, value-first');
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string|null>(null);
  const [captionIG, setCaptionIG] = useState('');
  const [captionTT, setCaptionTT] = useState('');
  const [captionFB, setCaptionFB] = useState('');
  const [ytTitle, setYtTitle] = useState('');
  const [twVidTxt, setTwVidTxt] = useState('');
  const [liTxt, setLiTxt] = useState('');
  const [tweets, setTweets] = useState<string[]>(['']);
  const [schedMode, setSchedMode] = useState<'same'|'different'>('same');
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedByPlatform, setSchedByPlatform] = useState<Record<PlatformKey,{date:string;time:string}>>({
    instagram:{date:'',time:''}, tiktok:{date:'',time:''}, facebook:{date:'',time:''},
    youtube:{date:'',time:''}, twitterVideo:{date:'',time:''}, linkedin:{date:'',time:''}, twitterPosts:{date:'',time:''},
  });
  const [submitOk, setSubmitOk] = useState(false);
  const [submitResults, setSubmitResults] = useState<{platform:string;ok:boolean;message:string}[]>([]);

  const enabledPlatforms = useMemo(()=>(Object.keys(selected) as PlatformKey[]).filter(k=>selected[k]),[selected]);
  const hasAnyPlatform = enabledPlatforms.length>0;
  const videoReady = videoUpload.status==='done';
  const showTwStep = selected.twitterPosts;

  const getCopy = (k:Exclude<PlatformKey,'twitterPosts'>) => {
    if (k==='instagram') return captionIG; if (k==='tiktok') return captionTT;
    if (k==='facebook') return captionFB; if (k==='youtube') return ytTitle;
    if (k==='twitterVideo') return twVidTxt; return liTxt;
  };
  const setCopy = (k:Exclude<PlatformKey,'twitterPosts'>, v:string) => {
    if (k==='instagram') setCaptionIG(v); else if (k==='tiktok') setCaptionTT(v);
    else if (k==='facebook') setCaptionFB(v); else if (k==='youtube') setYtTitle(v);
    else if (k==='twitterVideo') setTwVidTxt(v); else setLiTxt(v);
  };

  const captionsReady = useMemo(()=>(enabledPlatforms.filter(k=>k!=='twitterPosts') as Exclude<PlatformKey,'twitterPosts'>[]).every(k=>getCopy(k).trim().length>0),[enabledPlatforms,captionIG,captionTT,captionFB,ytTitle,twVidTxt,liTxt]);
  const tweetsReady = !selected.twitterPosts || tweets.some(t=>t.trim());

  const schedCommon: ScheduleInfo = useMemo(()=>toUtcFromEt(schedDate,schedTime),[schedDate,schedTime]);
  const schedByKey = useMemo(()=>{
    const map = {} as Record<PlatformKey,ScheduleInfo>;
    (Object.keys(PLATFORM_META) as PlatformKey[]).forEach(k=>{
      if (!selected[k]) { map[k]={ok:false,message:'Not selected.'}; return; }
      map[k] = schedMode==='same' ? schedCommon : toUtcFromEt(schedByPlatform[k]?.date||'',schedByPlatform[k]?.time||'');
    });
    return map;
  },[selected,schedMode,schedCommon,schedByPlatform]);

  const schedReady = hasAnyPlatform&&(schedMode==='same'?schedCommon.ok:enabledPlatforms.every(k=>schedByKey[k].ok));
  const canProceed = step===1?hasAnyPlatform:step===2?videoReady:step===3?captionsReady:step===4?tweetsReady:step===5?schedReady:true;
  const reviewReady = hasAnyPlatform&&videoReady&&captionsReady&&tweetsReady&&schedReady&&Boolean(token)&&integrations.length>0;

  const stepLabels = useMemo(()=>{ const b=['Platforms','Media','Captions','Schedule']; if(showTwStep) b.splice(3,0,'X Posts'); return [...b,'Review']; },[showTwStep]);
  const activeIdx = step===1?0:step===2?1:step===3?2:step===4?(showTwStep?3:2):step===5?(showTwStep?4:3):stepLabels.length-1;

  // Upload
  const getPublicOrSignedUrl = async (path:string) => {
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (pub?.data?.publicUrl) return pub.data.publicUrl;
    const {data,error} = await supabase.storage.from(BUCKET).createSignedUrl(path,SIGNED_URL_SECONDS);
    if (error||!data?.signedUrl) throw new Error(error?.message||'Failed URL');
    return data.signedUrl;
  };
  const uploadFile = async (file:File, kind:MediaKind, setState:(s:UploadState)=>void) => {
    if (file.size>MAX_BYTES){ setState({status:'error',message:`Too large (${prettyBytes(file.size)}). Max ${prettyBytes(MAX_BYTES)}.`}); return; }
    setState({status:'uploading'});
    try {
      const safeName = file.name.replace(/\s+/g,'-');
      const ext = safeName.includes('.')?safeName.split('.').pop():'';
      const path = `transferrable-everything/${kind}/${Date.now()}-${Math.random().toString(16).slice(2)}${ext?`.${ext}`:''}`;
      const {error} = await supabase.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
      if (error) throw new Error(error.message);
      const url = await getPublicOrSignedUrl(path);
      setState({status:'done',path,url,fileName:file.name,mime:file.type||'unknown',size:file.size});
    } catch(e:any){ setState({status:'error',message:e?.message||'Upload failed'}); }
  };

  // AI
  const runAi = async (mode:'captions'|'tweets') => {
    setAiError(null);
    if (audioUpload.status!=='done'){ setAiError('Upload audio first.'); return; }
    setAiLoading(true);
    try {
      const {data,error} = await supabase.functions.invoke('content-ai',{body:{audioUrl:audioUpload.url,tone}});
      if (error) throw new Error(error.message||'AI failed.');
      const res = data as AiGenResponse;
      if (mode==='captions') {
        if (selected.instagram&&res?.best?.instagram) setCaptionIG(res.best.instagram);
        if (selected.facebook&&res?.best?.facebook) setCaptionFB(res.best.facebook);
        if (selected.tiktok&&res?.best?.tiktok) setCaptionTT(res.best.tiktok);
        if (selected.youtube&&res?.best?.youtubeTitle) setYtTitle(res.best.youtubeTitle);
        const fb = res?.best?.instagram||res?.best?.tiktok||'';
        if (selected.twitterVideo&&!twVidTxt.trim()&&fb) setTwVidTxt(fb);
        if (selected.linkedin&&!liTxt.trim()&&fb) setLiTxt(fb);
      } else {
        const cleaned = (Array.isArray(res?.tweets)?res.tweets:[]).map(t=>String(t).trim()).filter(Boolean).slice(0,8);
        setTweets(cleaned.length?cleaned:['']);
      }
    } catch(e:any){ setAiError(e?.message||'AI failed'); }
    finally { setAiLoading(false); }
  };

  // Submit — uses Postiz /public/v1/posts endpoint with OAuth access token
  const doSubmit = async () => {
    setSubmitError(null); setSubmitResults([]);
    setSubmitting(true);
    const results: {platform:string;ok:boolean;message:string}[] = [];
    try {
      await Promise.all(enabledPlatforms.map(async k=>{
        const sched = schedByKey[k];
        if (!sched.ok) return;
        const type = POSTIZ_PLATFORM_TYPE[k];
        if (k==='twitterPosts') {
          await Promise.all(tweets.filter(t=>t.trim()).map(async tweet=>{
            try {
              const r = await scheduleMedia({platforms:[type],mediaUrls:{video:videoUpload.status==='done'?videoUpload.url:undefined},captions:{content:tweet},scheduledTime:sched.rfc3339WithOffset,timezone:TZ_ET});
              results.push({platform:'X tweet',ok:r.success,message:r.success?'Scheduled':r.error||'Failed'});
            } catch(e:any){ results.push({platform:'X tweet',ok:false,message:e?.message||'Failed'}); }
          }));
        } else {
          const content = getCopy(k as Exclude<PlatformKey,'twitterPosts'>);
          try {
            const r = await scheduleMedia({platforms:[type],mediaUrls:{video:videoUpload.status==='done'?videoUpload.url:undefined,thumbnail:thumbnailUpload.status==='done'&&k==='youtube'?thumbnailUpload.url:undefined},captions:{content},scheduledTime:sched.rfc3339WithOffset,timezone:TZ_ET});
            results.push({platform:PLATFORM_META[k].label,ok:r.success,message:r.success?'Scheduled':r.error||'Failed'});
          } catch(e:any){ results.push({platform:PLATFORM_META[k].label,ok:false,message:e?.message||'Failed'}); }
        }
      }));
      setSubmitResults(results);
      if (results.every(r=>!r.ok)) setSubmitError('All posts failed. Check your connected accounts.');
      else setSubmitOk(true);
    } catch(e:any){ setSubmitError(e?.message||'Submit failed'); }
    finally { setSubmitting(false); }
  };

  const navTo = (n:number)=>{ if(n>=1&&n<=6) setStep(n as Step); window.scrollTo({top:0}); };

  const inp: React.CSSProperties = { width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#fff',outline:'none',boxSizing:'border-box' };
  const ta: React.CSSProperties = {...inp,resize:'vertical' as const};

  return (
    <div style={{ maxWidth:680,margin:'0 auto',padding:'22px 22px 40px',animation:'fadeIn .2s ease' }}>

      {/* Step progress */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex',alignItems:'center' }}>
          {stepLabels.map((label,i)=>(
            <React.Fragment key={label}>
              <button type="button" onClick={()=>navTo(i+1)}
                style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:5,background:'none',border:'none',cursor:'pointer',color:i===activeIdx?GOLD:i<activeIdx?'rgba(255,255,255,0.55)':'rgba(255,255,255,0.2)',minWidth:60 }}>
                <div style={{ width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,background:i===activeIdx?GOLD:i<activeIdx?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.05)',color:i===activeIdx?'#000':i<activeIdx?'#fff':'rgba(255,255,255,0.25)',border:i===activeIdx?'none':`1px solid ${i<activeIdx?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.07)'}` }}>
                  {i<activeIdx?'✓':i+1}
                </div>
                <span style={{ fontSize:10,fontWeight:i===activeIdx?700:400 }}>{label}</span>
              </button>
              {i<stepLabels.length-1&&<div style={{ flex:1,height:1,background:i<activeIdx?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.05)',marginBottom:20,minWidth:4 }}/>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── STEP 1: Platforms ── */}
      {step===1&&(
        <div style={{ animation:'fadeIn .2s ease' }}>
          <SecHeader title="Select Platforms" sub="Choose where to publish your content"/>
          {!token&&(
            <div style={{ padding:14,borderRadius:10,border:'1px solid rgba(214,178,94,0.25)',background:'rgba(214,178,94,0.06)',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap' }}>
              <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                <AlertCircle style={{width:15,height:15,color:GOLD,flexShrink:0}}/>
                <span style={{ fontSize:12,color:'rgba(255,255,255,0.6)' }}>Connect your social accounts to schedule posts directly.</span>
              </div>
              <button type="button" onClick={onOpenConnectModal} style={{ padding:'7px 14px',borderRadius:8,background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`,color:'#000',fontSize:12,fontWeight:800,border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap' }}>
                <Link2 style={{width:13,height:13}}/> Connect Accounts
              </button>
            </div>
          )}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:18 }}>
            {(Object.keys(PLATFORM_META) as PlatformKey[]).map(k=>{
              const meta = PLATFORM_META[k]; const on = selected[k];
              const platformType = POSTIZ_PLATFORM_TYPE[k];
              const connected = integrations.some(i=>i.type.toLowerCase()===platformType.toLowerCase());
              return (
                <button key={k} type="button" onClick={()=>setSelected(s=>({...s,[k]:!s[k]}))}
                  style={{ padding:'14px 14px',borderRadius:10,cursor:'pointer',textAlign:'left',transition:'all .15s',border:`1px solid ${on?GOLD_BORDER:'rgba(255,255,255,0.08)'}`,background:on?GOLD_DIM:'rgba(255,255,255,0.02)' }}>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                    <PlatformLogo platform={k==='twitterVideo'||k==='twitterPosts'?'twitter':k} size={26}/>
                    <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                      {token&&<span style={{ fontSize:9,fontWeight:700,color:connected?'#4ade80':'rgba(255,255,255,0.2)' }}>{connected?'● Connected':'○ No account'}</span>}
                      {on&&<CheckCircle2 style={{width:15,height:15,color:GOLD}}/>}
                    </div>
                  </div>
                  <div style={{ fontSize:13,fontWeight:700,color:on?GOLD_LIGHT:'rgba(255,255,255,0.8)' }}>{meta.label}</div>
                  <div style={{ fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:2 }}>{meta.sub}</div>
                </button>
              );
            })}
          </div>
          <StepNav onBack={null} onNext={()=>navTo(2)} canNext={hasAnyPlatform}/>
        </div>
      )}

      {/* ── STEP 2: Media ── */}
      {step===2&&(
        <div style={{ animation:'fadeIn .2s ease' }}>
          <SecHeader title="Upload Media" sub="Video is required. Thumbnail and audio are optional."/>
          <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:18 }}>
            <UpCard title="Video" subtitle="MP4, MOV, or WebM · Max 49 MB" kind="video" accept="video/*" file={videoFile} setFile={setVideoFile} upload={videoUpload} setUpload={setVideoUpload} required uploadFn={uploadFile}/>
            <UpCard title="Thumbnail" subtitle="PNG or JPG · Used for YouTube" kind="thumbnail" accept="image/*" file={thumbnailFile} setFile={setThumbnailFile} upload={thumbnailUpload} setUpload={setThumbnailUpload} uploadFn={uploadFile}/>
            <UpCard title="Audio for AI" subtitle="MP3 or WAV · Powers AI caption generation" kind="audio" accept="audio/*" file={audioFile} setFile={setAudioFile} upload={audioUpload} setUpload={setAudioUpload} uploadFn={uploadFile}/>
          </div>
          <StepNav onBack={()=>navTo(1)} onNext={()=>navTo(3)} canNext={videoReady}/>
        </div>
      )}

      {/* ── STEP 3: Captions ── */}
      {step===3&&(
        <div style={{ animation:'fadeIn .2s ease' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
            <SecHeader title="Captions & Copy" sub="Write or AI-generate copy for each platform" noMb/>
            <button type="button" onClick={()=>setAiMode(v=>!v)}
              style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:8,border:`1px solid ${GOLD_BORDER}`,background:GOLD_DIM,color:GOLD,fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0 }}>
              <Sparkles style={{width:12,height:12}}/>{aiMode?'Hide AI':'AI Generate'}
            </button>
          </div>
          {aiMode&&(
            <div style={{ marginBottom:14,padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10,border:'1px solid rgba(255,255,255,0.08)' }}>
              <label style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:'0.05em',display:'block',marginBottom:6 }}>TONE</label>
              <input style={{...inp,marginBottom:10}} value={tone} onChange={e=>setTone(e.target.value)} placeholder="confident, punchy, value-first"/>
              {aiError&&<div style={{color:'#f87171',fontSize:12,marginBottom:10,display:'flex',gap:6}}><AlertCircle style={{width:13,height:13,flexShrink:0,marginTop:1}}/>{aiError}</div>}
              <button type="button" onClick={()=>runAi('captions')} disabled={aiLoading||audioUpload.status!=='done'}
                style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'8px 15px',borderRadius:8,background:aiLoading||audioUpload.status!=='done'?'rgba(255,255,255,0.06)':`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`,color:aiLoading||audioUpload.status!=='done'?'rgba(255,255,255,0.3)':'#000',fontSize:12,fontWeight:700,border:'none',cursor:aiLoading||audioUpload.status!=='done'?'not-allowed':'pointer' }}>
                {aiLoading?<Loader style={{width:12,height:12,animation:'spin 1s linear infinite'}}/>:<Sparkles style={{width:12,height:12}}/>} Generate Captions
              </button>
              {audioUpload.status!=='done'&&<p style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:8}}>Upload audio in the previous step to use AI.</p>}
            </div>
          )}
          <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:18 }}>
            {(enabledPlatforms.filter(k=>k!=='twitterPosts') as Exclude<PlatformKey,'twitterPosts'>[]).map(k=>{
              const meta=PLATFORM_META[k]; const val=getCopy(k); const ok=val.trim().length>0;
              return (
                <div key={k} style={{ padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10,border:`1px solid ${ok?'rgba(74,222,128,0.18)':'rgba(255,255,255,0.08)'}` }}>
                  <div style={{ display:'flex',alignItems:'center',gap:9,marginBottom:10 }}>
                    <PlatformLogo platform={k==='twitterVideo'?'twitter':k} size={22}/>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{meta.label}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:1}}>{meta.sub}</div></div>
                    {ok&&<CheckCircle2 style={{width:14,height:14,color:'#4ade80'}}/>}
                  </div>
                  <textarea rows={meta.kind==='title'?2:4} style={ta} value={val} onChange={e=>setCopy(k,e.target.value)} placeholder={`${meta.kind==='title'?'Title':'Caption'} for ${meta.label}…`}/>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',marginTop:4}}>{val.length} characters</div>
                </div>
              );
            })}
          </div>
          <StepNav onBack={()=>navTo(2)} onNext={()=>navTo(showTwStep?4:5)} canNext={captionsReady}/>
        </div>
      )}

      {/* ── STEP 4: X Posts ── */}
      {step===4&&showTwStep&&(
        <div style={{ animation:'fadeIn .2s ease' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
            <SecHeader title="X Posts" sub="Add standalone tweets — minimum 1 required" noMb/>
            {audioUpload.status==='done'&&(
              <button type="button" onClick={()=>runAi('tweets')} disabled={aiLoading}
                style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:8,background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`,color:'#000',fontSize:12,fontWeight:700,border:'none',cursor:'pointer',opacity:aiLoading?.6:1,flexShrink:0 }}>
                {aiLoading?<Loader style={{width:12,height:12,animation:'spin 1s linear infinite'}}/>:<Sparkles style={{width:12,height:12}}/>} AI Generate
              </button>
            )}
          </div>
          {aiError&&<div style={{color:'#f87171',fontSize:12,marginBottom:12,display:'flex',gap:6}}><AlertCircle style={{width:13,height:13,flexShrink:0}}/>{aiError}</div>}
          <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:12 }}>
            {tweets.map((post,idx)=>(
              <div key={idx} style={{ padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10,border:'1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
                  <span style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.4)'}}>Tweet {idx+1}</span>
                  {tweets.length>1&&<button type="button" onClick={()=>setTweets(p=>p.filter((_,i)=>i!==idx))} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(239,68,68,0.5)',padding:4,lineHeight:0}}><Trash2 style={{width:13,height:13}}/></button>}
                </div>
                <textarea rows={3} style={ta} value={post} onChange={e=>setTweets(p=>p.map((v,i)=>i===idx?e.target.value:v))} placeholder="Write your tweet…"/>
                <div style={{fontSize:10,color:post.length>280?'#f87171':'rgba(255,255,255,0.25)',marginTop:4}}>{post.length}/280</div>
              </div>
            ))}
          </div>
          <button type="button" onClick={()=>setTweets(p=>[...p,''])}
            style={{ width:'100%',padding:'10px 16px',borderRadius:10,border:'1px dashed rgba(255,255,255,0.12)',background:'transparent',color:'rgba(255,255,255,0.35)',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:18 }}>
            <Plus style={{width:13,height:13}}/> Add Tweet
          </button>
          <StepNav onBack={()=>navTo(3)} onNext={()=>navTo(5)} canNext={tweetsReady}/>
        </div>
      )}

      {/* ── STEP 5: Schedule ── */}
      {step===5&&(
        <div style={{ animation:'fadeIn .2s ease' }}>
          <SecHeader title="Schedule" sub="All times are Eastern (ET)"/>
          <div style={{ display:'flex',gap:8,marginBottom:16 }}>
            {(['same','different'] as const).map(m=>(
              <button key={m} type="button" onClick={()=>setSchedMode(m)}
                style={{ flex:1,padding:'10px 14px',borderRadius:8,border:`1px solid ${schedMode===m?GOLD_BORDER:'rgba(255,255,255,0.08)'}`,background:schedMode===m?GOLD_DIM:'rgba(255,255,255,0.02)',color:schedMode===m?GOLD_LIGHT:'rgba(255,255,255,0.45)',fontSize:12,fontWeight:600,cursor:'pointer' }}>
                {m==='same'?'Same time for all':'Different per platform'}
              </button>
            ))}
          </div>
          {schedMode==='same'&&(
            <div style={{ padding:16,background:'rgba(255,255,255,0.02)',borderRadius:10,border:'1px solid rgba(255,255,255,0.08)',marginBottom:16 }}>
              <div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.5)',marginBottom:12}}>Publish Date & Time (ET)</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                <div><label style={{fontSize:11,color:'rgba(255,255,255,0.35)',display:'block',marginBottom:5}}>Date</label><input type="date" style={inp} value={schedDate} onChange={e=>setSchedDate(e.target.value)}/></div>
                <div><label style={{fontSize:11,color:'rgba(255,255,255,0.35)',display:'block',marginBottom:5}}>Time (ET)</label><input type="time" style={inp} value={schedTime} onChange={e=>setSchedTime(e.target.value)}/></div>
              </div>
              {schedCommon.ok&&<div style={{fontSize:12,color:'#4ade80',fontWeight:600,marginTop:10,display:'flex',gap:5,alignItems:'center'}}><CheckCircle2 style={{width:13,height:13}}/>{schedCommon.etDisplay}</div>}
            </div>
          )}
          {schedMode==='different'&&(
            <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:16 }}>
              {enabledPlatforms.map(k=>{
                const info=schedByKey[k];
                return (
                  <div key={k} style={{ padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10,border:'1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
                      <PlatformLogo platform={k==='twitterVideo'||k==='twitterPosts'?'twitter':k} size={20}/>
                      <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>{PLATFORM_META[k].label}</span>
                      {info?.ok&&<span style={{fontSize:11,color:'#4ade80'}}>{info.etDisplay}</span>}
                    </div>
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                      <input type="date" style={inp} value={schedByPlatform[k]?.date||''} onChange={e=>setSchedByPlatform(prev=>({...prev,[k]:{...prev[k],date:e.target.value}}))}/>
                      <input type="time" style={inp} value={schedByPlatform[k]?.time||''} onChange={e=>setSchedByPlatform(prev=>({...prev,[k]:{...prev[k],time:e.target.value}}))}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <StepNav onBack={()=>navTo(showTwStep?4:3)} onNext={()=>navTo(6)} canNext={schedReady}/>
        </div>
      )}

      {/* ── STEP 6: Review ── */}
      {step===6&&(
        <div style={{ animation:'fadeIn .2s ease' }}>
          <SecHeader title="Review & Schedule" sub="Everything look good? Hit schedule to publish."/>
          {!token&&(
            <div style={{ padding:14,borderRadius:10,border:'1px solid rgba(214,178,94,0.25)',background:'rgba(214,178,94,0.06)',marginBottom:16,display:'flex',alignItems:'flex-start',gap:10 }}>
              <AlertCircle style={{width:15,height:15,color:GOLD,flexShrink:0,marginTop:1}}/>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:GOLD}}>Social accounts not connected</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',marginTop:3}}>You need to connect your Postiz account before scheduling.</div>
                <button type="button" onClick={onOpenConnectModal} style={{ marginTop:8,display:'inline-flex',alignItems:'center',gap:5,padding:'7px 13px',borderRadius:7,background:`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`,color:'#000',fontSize:12,fontWeight:800,border:'none',cursor:'pointer' }}>
                  <Link2 style={{width:12,height:12}}/> Connect Now
                </button>
              </div>
            </div>
          )}
          <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:20 }}>
            {[
              {label:'Platforms',val:enabledPlatforms.length?enabledPlatforms.map(k=>PLATFORM_META[k].label).join(', '):'None',ok:hasAnyPlatform,s:1,icon:<Globe style={{width:14,height:14}}/>},
              {label:'Video',val:videoUpload.status==='done'?`${videoUpload.fileName} · ${prettyBytes(videoUpload.size)}`:'Missing',ok:videoReady,s:2,icon:<Video style={{width:14,height:14}}/>},
              {label:'Captions',val:captionsReady?'All platforms ready':'Some missing',ok:captionsReady,s:3,icon:<FileText style={{width:14,height:14}}/>},
              {label:'Schedule',val:schedReady?(schedMode==='same'?'Same time for all':'Per-platform'):'Not set',ok:schedReady,s:5,icon:<Clock style={{width:14,height:14}}/>},
              {label:'Social Accounts',val:token?(integrations.length?`${integrations.length} connected`:'No accounts'):'Not connected',ok:Boolean(token)&&integrations.length>0,s:null,icon:<Users style={{width:14,height:14}}/>},
            ].map(row=>(
              <div key={row.label} onClick={row.s?()=>navTo(row.s as Step):undefined}
                style={{ display:'flex',alignItems:'center',gap:12,padding:'11px 14px',background:'rgba(255,255,255,0.02)',borderRadius:8,border:'1px solid rgba(255,255,255,0.06)',cursor:row.s?'pointer':'default',transition:'background .1s' }}
                className="row-hover">
                <div style={{ width:30,height:30,borderRadius:7,background:row.ok?'rgba(74,222,128,0.08)':'rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center',color:row.ok?'#4ade80':'rgba(255,255,255,0.35)',flexShrink:0 }}>{row.icon}</div>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{row.label}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.val}</div></div>
                {row.ok?<CheckCircle2 style={{width:15,height:15,color:'#4ade80',flexShrink:0}}/>:<AlertCircle style={{width:15,height:15,color:'rgba(239,68,68,0.4)',flexShrink:0}}/>}
                {row.s&&<ChevronRight style={{width:13,height:13,color:'rgba(255,255,255,0.2)',flexShrink:0}}/>}
              </div>
            ))}
          </div>

          {/* Platform preview row */}
          {enabledPlatforms.length>0&&(
            <div style={{ marginBottom:20,padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10,border:'1px solid rgba(255,255,255,0.07)' }}>
              <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.25)',letterSpacing:'0.07em',textTransform:'uppercase',marginBottom:10}}>PLATFORM SUMMARY</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                {enabledPlatforms.map(k=>{
                  const sched=schedByKey[k];
                  const connected=integrations.some(i=>i.type.toLowerCase()===POSTIZ_PLATFORM_TYPE[k].toLowerCase());
                  return (
                    <div key={k} style={{ display:'flex',alignItems:'center',gap:7,padding:'7px 10px',borderRadius:8,background:connected?'rgba(74,222,128,0.05)':'rgba(255,255,255,0.03)',border:`1px solid ${connected?'rgba(74,222,128,0.18)':'rgba(255,255,255,0.07)'}` }}>
                      <PlatformLogo platform={k==='twitterVideo'||k==='twitterPosts'?'twitter':k} size={18}/>
                      <div><div style={{fontSize:11,fontWeight:700,color:'#fff'}}>{PLATFORM_META[k].label}</div><div style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>{sched?.ok?sched.etDisplay:'No schedule'}</div></div>
                      {connected?<span style={{fontSize:8,color:'#4ade80'}}>●</span>:<span style={{fontSize:8,color:'rgba(255,255,255,0.15)'}}>○</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {submitResults.length>0&&(
            <div style={{ padding:14,borderRadius:10,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.02)',marginBottom:16 }}>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',marginBottom:8,letterSpacing:'0.06em',textTransform:'uppercase'}}>Results</div>
              {submitResults.map((r,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:r.ok?'#4ade80':'#f87171',marginBottom:4}}>
                  {r.ok?<CheckCircle2 style={{width:13,height:13}}/>:<AlertCircle style={{width:13,height:13}}/>}
                  <span style={{fontWeight:600}}>{r.platform}:</span> {r.message}
                </div>
              ))}
            </div>
          )}
          {submitError&&<div style={{padding:12,borderRadius:8,border:'1px solid rgba(239,68,68,0.25)',background:'rgba(239,68,68,0.07)',color:'#fca5a5',fontSize:13,display:'flex',gap:8,marginBottom:16}}><AlertCircle style={{width:14,height:14,flexShrink:0,marginTop:1}}/>{submitError}</div>}
          {submitOk&&(
            <div style={{padding:14,borderRadius:10,border:'1px solid rgba(74,222,128,0.25)',background:'rgba(74,222,128,0.06)',marginBottom:16,display:'flex',gap:10,alignItems:'center'}}>
              <CheckCircle2 style={{width:20,height:20,color:'#4ade80',flexShrink:0}}/>
              <div><div style={{fontSize:14,fontWeight:700,color:'#4ade80'}}>Scheduled successfully!</div><div style={{fontSize:12,color:'rgba(74,222,128,0.65)',marginTop:2}}>Your posts have been queued in Postiz.</div></div>
            </div>
          )}

          <button type="button" onClick={doSubmit} disabled={!reviewReady||submitting||submitOk}
            style={{ width:'100%',padding:'14px 20px',borderRadius:10,fontWeight:800,fontSize:14,cursor:!reviewReady||submitting||submitOk?'not-allowed':'pointer',background:!reviewReady||submitOk?'rgba(255,255,255,0.05)':`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`,color:!reviewReady||submitOk?'rgba(255,255,255,0.25)':'#000',border:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'all .2s' }}>
            {submitting?<><Loader style={{width:15,height:15,animation:'spin 1s linear infinite'}}/>Scheduling…</>:submitOk?<><CheckCircle2 style={{width:15,height:15}}/>Scheduled</>:<><Send style={{width:15,height:15}}/>Schedule Posts</>}
          </button>
          <div style={{marginTop:12}}><StepNav onBack={()=>navTo(5)} onNext={null} canNext={false}/></div>
        </div>
      )}
    </div>
  );
}

// ─── SHARED SUBCOMPONENTS ─────────────────────────────────────────
function SecHeader({ title, sub, noMb }: { title:string; sub:string; noMb?:boolean }) {
  return (
    <div style={{ marginBottom:noMb?0:18 }}>
      <h2 style={{ fontSize:16,fontWeight:700,color:'#fff',margin:0 }}>{title}</h2>
      <p style={{ fontSize:12,color:'rgba(255,255,255,0.4)',margin:'4px 0 0' }}>{sub}</p>
    </div>
  );
}
function StepNav({ onBack, onNext, canNext }: { onBack:(()=>void)|null; onNext:(()=>void)|null; canNext:boolean }) {
  return (
    <div style={{ display:'flex',gap:10,justifyContent:'space-between',paddingTop:6 }}>
      {onBack?<button type="button" onClick={onBack} style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'8px 16px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.6)',fontSize:12,fontWeight:600,cursor:'pointer' }}><ChevronLeft style={{width:13,height:13}}/> Back</button>:<div/>}
      {onNext&&<button type="button" onClick={onNext} disabled={!canNext} style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'8px 18px',borderRadius:8,background:canNext?`linear-gradient(135deg,${GOLD},${GOLD_LIGHT})`:'rgba(255,255,255,0.05)',color:canNext?'#000':'rgba(255,255,255,0.2)',fontSize:12,fontWeight:800,border:'none',cursor:canNext?'pointer':'not-allowed' }}>Continue <ChevronRight style={{width:13,height:13}}/></button>}
    </div>
  );
}
function UpCard({ title, subtitle, kind, accept, file, setFile, upload, setUpload, required, uploadFn }: {
  title:string; subtitle:string; kind:MediaKind; accept:string; file:File|null; setFile:(f:File|null)=>void;
  upload:UploadState; setUpload:(s:UploadState)=>void; required?:boolean;
  uploadFn:(file:File,kind:MediaKind,setState:(s:UploadState)=>void)=>Promise<void>;
}) {
  const done = upload.status==='done';
  return (
    <div style={{ padding:14,background:'rgba(255,255,255,0.02)',borderRadius:10,border:`1px solid ${done?'rgba(74,222,128,0.18)':'rgba(255,255,255,0.08)'}` }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
        <div>
          <div style={{ fontSize:13,fontWeight:700,color:'#fff',display:'flex',alignItems:'center',gap:7 }}>
            {title}
            {required&&<span style={{fontSize:9,padding:'2px 6px',borderRadius:4,background:GOLD_DIM,color:GOLD,fontWeight:800}}>Required</span>}
          </div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:2}}>{subtitle}</div>
        </div>
        {done&&<div style={{display:'flex',alignItems:'center',gap:5,color:'#4ade80',fontSize:12,fontWeight:600}}><CheckCircle2 style={{width:13,height:13}}/>Uploaded</div>}
      </div>
      <div style={{ display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
        <label style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'7px 13px',borderRadius:7,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.75)',fontSize:12,fontWeight:600,cursor:'pointer' }}>
          <UploadCloud style={{width:13,height:13}}/>{file?'Change file':'Choose file'}
          <input type="file" accept={accept} style={{display:'none'}} onChange={e=>{ const f=e.target.files?.[0]??null; setFile(f); if(f) uploadFn(f,kind,setUpload); }}/>
        </label>
        {upload.status==='uploading'&&<span style={{fontSize:12,color:'rgba(255,255,255,0.4)',display:'flex',gap:5,alignItems:'center'}}><Loader style={{width:12,height:12,animation:'spin 1s linear infinite'}}/>Uploading…</span>}
        {upload.status==='done'&&<span style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{upload.fileName} ({prettyBytes(upload.size)})</span>}
        {upload.status==='error'&&<span style={{fontSize:12,color:'#f87171',display:'flex',gap:5,alignItems:'center'}}><AlertCircle style={{width:12,height:12,flexShrink:0}}/>{upload.message}</span>}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
export function MediaDistributionPage() {
  const [view, setView] = useState<AppView>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [posts] = useState<ScheduledPost[]>(DEMO_POSTS);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  // ── Postiz OAuth2 state ──
  const [postizToken, setPostizToken] = useState<string|null>(()=>localStorage.getItem(LS_TOKEN_KEY));
  const [integrations, setIntegrations] = useState<PostizIntegration[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string|null>(null);

  // ── Load integrations when token is available ──
  const loadIntegrations = useCallback(async (token:string) => {
    setIntegrationsLoading(true);
    try { setIntegrations(await fetchIntegrations(token)); }
    catch { setIntegrations([]); }
    finally { setIntegrationsLoading(false); }
  }, []);

  useEffect(()=>{
    if (postizToken) loadIntegrations(postizToken);
    else setIntegrations([]);
  }, [postizToken, loadIntegrations]);

  // ── OAuth2 Authorization Code flow ──
  // Per Postiz docs: redirect to /oauth/authorize with client_id + response_type=code + state
  const handleConnect = () => {
    const state = generateState();
    localStorage.setItem(LS_STATE_KEY, state);
    window.location.href = buildAuthUrl(state);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(LS_TOKEN_KEY);
    localStorage.removeItem(LS_STATE_KEY);
    setPostizToken(null);
    setIntegrations([]);
    setOauthError(null);
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#0a0a0a', color:'#fff', fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <style>{globalStyle}</style>

      {/* Back link */}
      <div style={{ position:'fixed', top:12, left:250, zIndex:100 }}>
        <Link to="/" style={{ display:'inline-flex',alignItems:'center',gap:5,fontSize:11,color:'rgba(255,255,255,0.3)',textDecoration:'none',background:'rgba(0,0,0,0.4)',padding:'4px 10px',borderRadius:7,backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.07)' }}>
          <ArrowLeft style={{width:11,height:11}}/> Back
        </Link>
      </div>

      {/* Sidebar */}
      <Sidebar
        view={view} onView={setView}
        integrations={integrations} token={postizToken}
        onOpenConnectModal={()=>setConnectModalOpen(true)}
        selectedDate={selectedDate} onSelectDate={setSelectedDate} posts={posts}
      />

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:'100vh', minWidth:0 }}>
        <TopBar view={view} onView={setView} onCompose={()=>setView('compose')}/>

        {/* Views */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {view==='calendar' && <CalendarView selectedDate={selectedDate} onSelectDate={setSelectedDate} posts={posts} onCompose={()=>setView('compose')}/>}
          {view==='list'     && <ListView posts={posts}/>}
          {view==='compose'  && (
            <ComposePanel
              token={postizToken}
              integrations={integrations}
              integrationsLoading={integrationsLoading}
              onOpenConnectModal={()=>setConnectModalOpen(true)}
            />
          )}
        </div>
      </div>

      {/* Connect Accounts Modal */}
      <ConnectAccountsModal
        open={connectModalOpen}
        onClose={()=>setConnectModalOpen(false)}
        integrations={integrations}
        token={postizToken}
        onConnect={handleConnect}
      />
    </div>
  );
}