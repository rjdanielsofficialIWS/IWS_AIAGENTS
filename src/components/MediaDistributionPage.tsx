import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Loader, UploadCloud, CheckCircle2, AlertCircle, Sparkles,
  Calendar, X, Plus, Trash2, FileText, Video, Mic, Link2, Link2Off,
  RefreshCw, ChevronLeft, ChevronRight, LayoutGrid, List, Settings,
  Bell, Search, Hash, Image, Clock, Send, Eye, Edit3, MoreHorizontal,
  Zap, Globe, Users, BarChart2, BookOpen, PlusCircle,
} from 'lucide-react';
import { supabase } from '../services/vapiAI';
import { scheduleMedia } from '../services/postiz';

// ─── BRAND COLOURS ───────────────────────────────────────────────
const GOLD = '#D6B25E';
const GOLD_LIGHT = '#F0D27C';
const GOLD_DIM = 'rgba(214,178,94,0.15)';
const GOLD_BORDER = 'rgba(214,178,94,0.35)';

// ─── POSTIZ CONFIG ────────────────────────────────────────────────
const POSTIZ_FRONTEND_URL = 'https://platform.postiz.com';
const POSTIZ_BACKEND_URL = 'https://api.postiz.com';
const POSTIZ_CLIENT_ID = 'pca_vu9LtBtHReFqeuA465OI8tOqONvva7gS';
const POSTIZ_REDIRECT_URL = 'https://infinitewealthsolutionsai.com/mediamachine?postiz_callback=1';
const LS_TOKEN_KEY = 'postiz_access_token';
const LS_STATE_KEY = 'postiz_oauth_state';

// ─── STORAGE ──────────────────────────────────────────────────────
const BUCKET = 'media';
const MAX_BYTES = 49 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

// ─── PLATFORM ICONS (emoji fallbacks) ────────────────────────────
const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸', tiktok: '🎵', facebook: '👥', youtube: '▶️',
  twitter: '𝕏', linkedin: '💼', twitterPosts: '𝕏',
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C', tiktok: '#010101', facebook: '#1877F2',
  youtube: '#FF0000', twitter: '#1DA1F2', linkedin: '#0A66C2', twitterPosts: '#1DA1F2',
};

const POSTIZ_PLATFORM_TYPE: Record<string, string> = {
  instagram: 'instagram', tiktok: 'tiktok', facebook: 'facebook',
  youtube: 'youtube', twitterVideo: 'twitter', linkedin: 'linkedin', twitterPosts: 'twitter',
};

// ─── TYPES ────────────────────────────────────────────────────────
type MediaKind = 'video' | 'audio' | 'thumbnail';
type View = 'calendar' | 'list' | 'compose';
type PlatformKey = 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'twitterVideo' | 'linkedin' | 'twitterPosts';
type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress?: number }
  | { status: 'done'; path: string; url: string; fileName: string; mime: string; size: number }
  | { status: 'error'; message: string };
type ScheduleInfo = { ok: true; etDisplay: string; rfc3339WithOffset: string; utcIso: string; unixSeconds: number } | { ok: false; message: string };
type PostizIntegration = { id: string; name: string; type: string; picture?: string };
type ScheduledPost = { id: string; platform: PlatformKey; content: string; scheduledFor: Date; status: 'scheduled' | 'published' | 'failed'; thumbnail?: string };

const PLATFORM_META: Record<PlatformKey, { label: string; sub: string; kind: 'caption' | 'title' | 'text' | 'posts'; color: string }> = {
  instagram:    { label: 'Instagram',         sub: 'Reels caption',       kind: 'caption', color: '#E1306C' },
  tiktok:       { label: 'TikTok',            sub: 'Caption',             kind: 'caption', color: '#010101' },
  facebook:     { label: 'Facebook',          sub: 'Reels caption',       kind: 'caption', color: '#1877F2' },
  youtube:      { label: 'YouTube',           sub: 'Shorts title',        kind: 'title',   color: '#FF0000' },
  twitterVideo: { label: 'X (Video)',         sub: 'Post text',           kind: 'text',    color: '#1DA1F2' },
  linkedin:     { label: 'LinkedIn',          sub: 'Post text',           kind: 'text',    color: '#0A66C2' },
  twitterPosts: { label: 'X Posts',           sub: 'Standalone tweets',   kind: 'posts',   color: '#1DA1F2' },
};

// ─── HELPERS ──────────────────────────────────────────────────────
function prettyBytes(b: number) {
  if (!b) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(3, Math.floor(Math.log(b) / Math.log(1024)));
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}
function generateState() {
  const a = new Uint8Array(16);
  window.crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}
function buildAuthUrl(state: string) {
  return `${POSTIZ_FRONTEND_URL}/oauth/authorize?${new URLSearchParams({ client_id: POSTIZ_CLIENT_ID, response_type: 'code', redirect_uri: POSTIZ_REDIRECT_URL, state }).toString()}`;
}
async function postizFetch(path: string, token: string, opts: RequestInit = {}) {
  return fetch(`${POSTIZ_BACKEND_URL}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: token, ...(opts.headers || {}) } });
}
async function fetchIntegrations(token: string): Promise<PostizIntegration[]> {
  const r = await postizFetch('/public/v1/integrations', token);
  if (!r.ok) throw new Error(`Failed (${r.status})`);
  const d = await r.json();
  return Array.isArray(d?.integrations) ? d.integrations : [];
}

const TZ_ET = 'America/New_York';
const pad2 = (n: number) => String(n).padStart(2, '0');

function formatPartsInTz(d: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const parts = dtf.formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return { year: +get('year'), month: +get('month'), day: +get('day'), hour: +get('hour'), minute: +get('minute'), second: +get('second') };
}

function toUtcFromEt(dateStr: string, timeStr: string): ScheduleInfo {
  if (!dateStr || !timeStr) return { ok: false, message: 'Choose date & time (ET).' };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const t = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!m || !t) return { ok: false, message: 'Invalid format.' };
  const [y, mo, da, hh, mm] = [m[1], m[2], m[3], t[1], t[2]].map(Number);
  let guess = Date.UTC(y, mo - 1, da, hh, mm, 0);
  for (let i = 0; i < 4; i++) {
    const et = formatPartsInTz(new Date(guess), TZ_ET);
    const diff = Date.UTC(y, mo - 1, da, hh, mm, 0) - Date.UTC(et.year, et.month - 1, et.day, et.hour, et.minute, 0);
    if (Math.abs(diff) < 1000) break;
    guess += diff;
  }
  const utcDate = new Date(guess);
  const etP = formatPartsInTz(utcDate, TZ_ET);
  const etAsUtc = Date.UTC(etP.year, etP.month - 1, etP.day, etP.hour, etP.minute, etP.second);
  const offMin = Math.round((etAsUtc - utcDate.getTime()) / 60000);
  const sign = offMin <= 0 ? '-' : '+';
  const abs = Math.abs(offMin);
  const offStr = `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
  const rfc = `${etP.year}-${pad2(etP.month)}-${pad2(etP.day)}T${pad2(etP.hour)}:${pad2(etP.minute)}:${pad2(etP.second)}${offStr}`;
  const display = new Intl.DateTimeFormat('en-US', { timeZone: TZ_ET, year: 'numeric', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' }).format(utcDate);
  return { ok: true, etDisplay: display, rfc3339WithOffset: rfc, utcIso: utcDate.toISOString(), unixSeconds: Math.floor(utcDate.getTime() / 1000) };
}

// ─── MOCK SCHEDULED POSTS ─────────────────────────────────────────
const DEMO_POSTS: ScheduledPost[] = [
  { id: '1', platform: 'instagram', content: 'Building wealth starts with the right mindset. 💰', scheduledFor: new Date(Date.now() + 86400000), status: 'scheduled' },
  { id: '2', platform: 'linkedin', content: 'The 3 strategies we use to grow passive income.', scheduledFor: new Date(Date.now() + 172800000), status: 'scheduled' },
  { id: '3', platform: 'twitterPosts', content: 'Financial freedom is not a dream, it\'s a plan. 🧠', scheduledFor: new Date(Date.now() - 86400000), status: 'published' },
  { id: '4', platform: 'youtube', content: 'How We Built a 7-Figure Portfolio | Full Breakdown', scheduledFor: new Date(Date.now() + 259200000), status: 'scheduled' },
  { id: '5', platform: 'tiktok', content: 'POV: You discovered compound interest at 22 🚀', scheduledFor: new Date(Date.now() - 43200000), status: 'published' },
];

// ─── MINI COMPONENTS ──────────────────────────────────────────────

function PlatformDot({ platform, size = 8 }: { platform: string; size?: number }) {
  const color = PLATFORM_COLORS[platform] || GOLD;
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

function PlatformAvatar({ platform, size = 32 }: { platform: string; size?: number }) {
  const color = PLATFORM_COLORS[platform] || GOLD;
  const icon = PLATFORM_ICONS[platform] || '📱';
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, flexShrink: 0 }}>
      {icon}
    </div>
  );
}

function Badge({ children, color = GOLD }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${color}22`, color, border: `1px solid ${color}33`, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: 'scheduled' | 'published' | 'failed' }) {
  const map = { scheduled: ['#60a5fa', 'Scheduled'], published: ['#4ade80', 'Published'], failed: ['#f87171', 'Failed'] };
  const [color, label] = map[status];
  return <Badge color={color}>{label}</Badge>;
}

function GoldButton({ children, onClick, disabled, loading, small, outline }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; small?: boolean; outline?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: small ? '6px 14px' : '10px 20px',
        borderRadius: 10, fontWeight: 700, fontSize: small ? 12 : 13, cursor: disabled ? 'not-allowed' : 'pointer',
        border: outline ? `1px solid ${GOLD_BORDER}` : 'none',
        background: outline ? 'transparent' : disabled ? 'rgba(255,255,255,0.06)' : GOLD,
        color: outline ? GOLD : disabled ? 'rgba(255,255,255,0.3)' : '#000',
        opacity: disabled && !outline ? 0.5 : 1,
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {loading && <Loader style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  );
}

// ─── CALENDAR MINI ────────────────────────────────────────────────
function MiniCalendar({ selectedDate, onSelect, posts }: { selectedDate: Date; onSelect: (d: Date) => void; posts: ScheduledPost[] }) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const postDays = new Set(posts.filter(p => {
    const d = p.scheduledFor;
    return d.getFullYear() === year && d.getMonth() === month;
  }).map(p => p.scheduledFor.getDate()));

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}>
          <ChevronLeft style={{ width: 14, height: 14 }} />
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{monthName}</span>
        <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}>
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
          const isSelected = day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
          const hasPost = postDays.has(day);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(new Date(year, month, day))}
              style={{
                aspectRatio: '1', borderRadius: 6, fontSize: 11, fontWeight: isSelected || isToday ? 700 : 400,
                background: isSelected ? GOLD : isToday ? 'rgba(214,178,94,0.15)' : 'transparent',
                color: isSelected ? '#000' : isToday ? GOLD : 'rgba(255,255,255,0.7)',
                border: isToday && !isSelected ? `1px solid ${GOLD_BORDER}` : '1px solid transparent',
                cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {day}
              {hasPost && !isSelected && (
                <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: GOLD, opacity: 0.8 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'calendar', icon: Calendar, label: 'Calendar' },
  { key: 'list', icon: List, label: 'Posts' },
  { key: 'compose', icon: Edit3, label: 'New Post' },
];
const BOTTOM_NAV = [
  { key: 'analytics', icon: BarChart2, label: 'Analytics' },
  { key: 'settings', icon: Settings, label: 'Settings' },
];

function Sidebar({
  view, onView, integrations, onConnect, onDisconnect, token, selectedDate, onSelectDate, posts,
}: {
  view: View; onView: (v: View) => void; integrations: PostizIntegration[]; onConnect: () => void;
  onDisconnect: () => void; token: string | null; selectedDate: Date; onSelectDate: (d: Date) => void; posts: ScheduledPost[];
}) {
  return (
    <aside style={{
      width: 240, flexShrink: 0, background: '#111', borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap style={{ width: 16, height: 16, color: '#000' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1 }}>IWS Media</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Distribution Hub</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
          const active = view === key;
          return (
            <button key={key} type="button" onClick={() => onView(key as View)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: active ? GOLD_DIM : 'transparent',
                color: active ? GOLD : 'rgba(255,255,255,0.55)',
                fontWeight: active ? 700 : 500, fontSize: 13, width: '100%', textAlign: 'left',
              }}>
              <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />
              {label}
              {key === 'list' && posts.filter(p => p.status === 'scheduled').length > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: GOLD_DIM, color: GOLD }}>
                  {posts.filter(p => p.status === 'scheduled').length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mini Calendar */}
      <div style={{ padding: '8px 14px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <MiniCalendar selectedDate={selectedDate} onSelect={onSelectDate} posts={posts} />
      </div>

      {/* Connected Channels */}
      <div style={{ padding: '12px 14px', flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Channels</div>
        {token ? (
          integrations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {integrations.slice(0, 6).map(intg => (
                <div key={intg.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
                  <PlatformAvatar platform={intg.type.toLowerCase()} size={22} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{intg.name}</span>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
                </div>
              ))}
              {integrations.length > 6 && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '4px 0' }}>+{integrations.length - 6} more</div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>No channels yet. Add them in Postiz.</div>
          )
        ) : (
          <button type="button" onClick={onConnect}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px dashed ${GOLD_BORDER}`, background: GOLD_DIM, color: GOLD, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Link2 style={{ width: 14, height: 14 }} /> Connect Accounts
          </button>
        )}
      </div>

      {/* Bottom */}
      <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {token && (
          <button type="button" onClick={onDisconnect}
            style={{ width: '100%', padding: '7px 10px', borderRadius: 7, background: 'none', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(239,68,68,0.7)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <Link2Off style={{ width: 12, height: 12 }} /> Disconnect
          </button>
        )}
      </div>
    </aside>
  );
}

// ─── TOP BAR ──────────────────────────────────────────────────────
function TopBar({ view, onView, onCompose }: { view: View; onView: (v: View) => void; onCompose: () => void }) {
  const titles: Record<View, string> = { calendar: 'Content Calendar', list: 'Scheduled Posts', compose: 'New Post' };
  return (
    <div style={{ height: 56, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#0d0d0d', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <h1 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{titles[view]}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['calendar', 'list'] as const).map(v => (
            <button key={v} type="button" onClick={() => onView(v)}
              style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s', background: view === v ? 'rgba(255,255,255,0.1)' : 'transparent', color: view === v ? '#fff' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 5 }}>
              {v === 'calendar' ? <LayoutGrid style={{ width: 13, height: 13 }} /> : <List style={{ width: 13, height: 13 }} />}
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <GoldButton onClick={onCompose} small>
          <PlusCircle style={{ width: 14, height: 14 }} /> New Post
        </GoldButton>
      </div>
    </div>
  );
}

// ─── CALENDAR VIEW ────────────────────────────────────────────────
function CalendarView({ selectedDate, onSelectDate, posts, onCompose }: { selectedDate: Date; onSelectDate: (d: Date) => void; posts: ScheduledPost[]; onCompose: () => void }) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const postsByDay = useMemo(() => {
    const map: Record<number, ScheduledPost[]> = {};
    posts.forEach(p => {
      if (p.scheduledFor.getFullYear() === year && p.scheduledFor.getMonth() === month) {
        const d = p.scheduledFor.getDate();
        if (!map[d]) map[d] = [];
        map[d].push(p);
      }
    });
    return map;
  }, [posts, year, month]);

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7).concat(Array(7 - (cells.slice(i, i + 7).length)).fill(null)));

  return (
    <div style={{ padding: 24 }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={() => onSelectDate(new Date(year, month - 1, 1))} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{monthName}</h2>
          <button type="button" onClick={() => onSelectDate(new Date(year, month + 1, 1))} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
          <button type="button" onClick={() => onSelectDate(new Date())} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Today
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 1 }}>
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{d}</div>
        ))}
      </div>

      {/* Weeks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {week.map((day, di) => {
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
              const dayPosts = day ? (postsByDay[day] || []) : [];
              return (
                <div key={di} onClick={day ? () => onSelectDate(new Date(year, month, day)) : undefined}
                  style={{
                    minHeight: 100, background: day ? 'rgba(255,255,255,0.02)' : 'transparent',
                    border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, padding: '8px', cursor: day ? 'pointer' : 'default',
                    transition: 'background 0.1s',
                  }}>
                  {day && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{
                          fontSize: 13, fontWeight: isToday ? 700 : 400,
                          color: isToday ? '#000' : 'rgba(255,255,255,0.6)',
                          background: isToday ? GOLD : 'transparent',
                          width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{day}</span>
                        {dayPosts.length > 0 && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); onCompose(); }}
                            style={{ opacity: 0.4, background: 'none', border: 'none', cursor: 'pointer', color: GOLD, padding: 0 }}>
                            <Plus style={{ width: 12, height: 12 }} />
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {dayPosts.slice(0, 3).map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 6px', borderRadius: 4, background: `${PLATFORM_COLORS[p.platform] || GOLD}18`, borderLeft: `2px solid ${PLATFORM_COLORS[p.platform] || GOLD}` }}>
                            <span style={{ fontSize: 10 }}>{PLATFORM_ICONS[p.platform] || '📱'}</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.content.slice(0, 22)}{p.content.length > 22 ? '…' : ''}</span>
                          </div>
                        ))}
                        {dayPosts.length > 3 && (
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', paddingLeft: 6 }}>+{dayPosts.length - 3} more</div>
                        )}
                      </div>
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
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'published'>('all');
  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter);

  return (
    <div style={{ padding: 24 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'scheduled', 'published'] as const).map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${filter === f ? GOLD_BORDER : 'rgba(255,255,255,0.1)'}`, background: filter === f ? GOLD_DIM : 'transparent', color: filter === f ? GOLD : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '6px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.3)' }} />
          <input placeholder="Search posts…" style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'rgba(255,255,255,0.7)', width: 140 }} />
        </div>
      </div>

      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px 100px 40px', gap: 12, padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 4 }}>
        {['Content', 'Platform', 'Scheduled', 'Status', ''].map(h => (
          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
        ))}
      </div>

      {filtered.map(post => (
        <div key={post.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px 100px 40px', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', transition: 'background 0.1s', borderRadius: 6 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{post.content}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <PlatformAvatar platform={post.platform} size={22} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{PLATFORM_META[post.platform]?.label || post.platform}</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            {post.scheduledFor.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
          <StatusBadge status={post.status} />
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}>
            <MoreHorizontal style={{ width: 16, height: 16 }} />
          </button>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
          <Calendar style={{ width: 32, height: 32, margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>No posts found</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Schedule your first post using the New Post button</div>
        </div>
      )}
    </div>
  );
}

// ─── COMPOSE PANEL ────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4 | 5 | 6;

function ComposePanel({ token, integrations, onIntegrationsRefresh, integrationsLoading }: {
  token: string | null; integrations: PostizIntegration[]; onIntegrationsRefresh: () => void; integrationsLoading: boolean;
}) {
  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<Record<PlatformKey, boolean>>({ instagram: false, tiktok: false, facebook: false, youtube: false, twitterVideo: false, linkedin: false, twitterPosts: false });
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
  const [twitterPosts, setTwitterPosts] = useState<string[]>(['']);
  const [scheduleMode, setScheduleMode] = useState<'same' | 'different'>('same');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleByPlatform, setScheduleByPlatform] = useState<Record<PlatformKey, { date: string; time: string }>>({
    instagram: { date: '', time: '' }, tiktok: { date: '', time: '' }, facebook: { date: '', time: '' },
    youtube: { date: '', time: '' }, twitterVideo: { date: '', time: '' }, linkedin: { date: '', time: '' }, twitterPosts: { date: '', time: '' },
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);
  const [submitResults, setSubmitResults] = useState<{ platform: string; ok: boolean; message: string }[]>([]);

  const enabledPlatforms = useMemo(() => (Object.keys(selected) as PlatformKey[]).filter(k => selected[k]), [selected]);
  const hasAnyPlatform = enabledPlatforms.length > 0;
  const videoReady = videoUpload.status === 'done';
  const showTwitterStep = selected.twitterPosts;

  const getCopy = (k: Exclude<PlatformKey, 'twitterPosts'>) => {
    if (k === 'instagram') return captionInstagram;
    if (k === 'tiktok') return captionTikTok;
    if (k === 'facebook') return captionFacebook;
    if (k === 'youtube') return youtubeTitle;
    if (k === 'twitterVideo') return twitterVideoText;
    return linkedinText;
  };
  const setCopy = (k: Exclude<PlatformKey, 'twitterPosts'>, v: string) => {
    if (k === 'instagram') setCaptionInstagram(v);
    else if (k === 'tiktok') setCaptionTikTok(v);
    else if (k === 'facebook') setCaptionFacebook(v);
    else if (k === 'youtube') setYoutubeTitle(v);
    else if (k === 'twitterVideo') setTwitterVideoText(v);
    else setLinkedinText(v);
  };

  const captionsReady = useMemo(() => {
    return (enabledPlatforms.filter(k => k !== 'twitterPosts') as Exclude<PlatformKey, 'twitterPosts'>[])
      .every(k => getCopy(k).trim().length > 0);
  }, [enabledPlatforms, captionInstagram, captionTikTok, captionFacebook, youtubeTitle, twitterVideoText, linkedinText]);

  const twitterPostsReady = !selected.twitterPosts || twitterPosts.some(t => t.trim());

  const scheduleCommonInfo: ScheduleInfo = useMemo(() => toUtcFromEt(scheduleDate, scheduleTime), [scheduleDate, scheduleTime]);
  const scheduleInfoByPlatform = useMemo(() => {
    const map = {} as Record<PlatformKey, ScheduleInfo>;
    (Object.keys(PLATFORM_META) as PlatformKey[]).forEach(k => {
      if (!selected[k]) { map[k] = { ok: false, message: 'Not selected.' }; return; }
      map[k] = scheduleMode === 'same' ? scheduleCommonInfo : toUtcFromEt(scheduleByPlatform[k]?.date || '', scheduleByPlatform[k]?.time || '');
    });
    return map;
  }, [selected, scheduleMode, scheduleCommonInfo, scheduleByPlatform]);

  const scheduleReady = hasAnyPlatform && (scheduleMode === 'same' ? scheduleCommonInfo.ok : enabledPlatforms.every(k => scheduleInfoByPlatform[k].ok));
  const canProceed = step === 1 ? hasAnyPlatform : step === 2 ? videoReady : step === 3 ? captionsReady : step === 4 ? twitterPostsReady : step === 5 ? scheduleReady : true;
  const reviewReady = hasAnyPlatform && videoReady && captionsReady && twitterPostsReady && scheduleReady && Boolean(token) && integrations.length > 0;

  const stepLabels = useMemo(() => {
    const base = ['Platforms', 'Media', 'Captions', 'Schedule'];
    if (showTwitterStep) base.splice(3, 0, 'Posts');
    return [...base, 'Review'];
  }, [showTwitterStep]);

  const activeIdx = step === 1 ? 0 : step === 2 ? 1 : step === 3 ? 2 : step === 4 ? (showTwitterStep ? 3 : 2) : step === 5 ? (showTwitterStep ? 4 : 3) : stepLabels.length - 1;

  // Upload
  const getPublicOrSignedUrl = async (path: string) => {
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (pub?.data?.publicUrl) return pub.data.publicUrl;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed URL');
    return data.signedUrl;
  };

  const uploadFile = async (file: File, kind: MediaKind, setState: (s: UploadState) => void) => {
    if (file.size > MAX_BYTES) { setState({ status: 'error', message: `Too large (${prettyBytes(file.size)}). Max ${prettyBytes(MAX_BYTES)}.` }); return; }
    setState({ status: 'uploading' });
    try {
      const safeName = file.name.replace(/\s+/g, '-');
      const ext = safeName.includes('.') ? safeName.split('.').pop() : '';
      const path = `transferrable-everything/${kind}/${Date.now()}-${Math.random().toString(16).slice(2)}${ext ? `.${ext}` : ''}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
      if (error) throw new Error(error.message);
      const url = await getPublicOrSignedUrl(path);
      setState({ status: 'done', path, url, fileName: file.name, mime: file.type || 'unknown', size: file.size });
    } catch (e: any) { setState({ status: 'error', message: e?.message || 'Upload failed' }); }
  };

  // AI
  type AiGenResponse = { tweets: string[]; captions: { instagram: string[]; facebook: string[]; tiktok: string[] }; youtubeTitles: string[]; best: { instagram: string; facebook: string; tiktok: string; youtubeTitle: string } };
  const runAi = async (mode: 'captions' | 'tweets') => {
    setAiError(null);
    if (audioUpload.status !== 'done') { setAiError('Upload audio first.'); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-ai', { body: { audioUrl: audioUpload.url, tone } });
      if (error) throw new Error(error.message || 'AI failed.');
      const res = data as AiGenResponse;
      if (mode === 'captions') {
        if (selected.instagram && res?.best?.instagram) setCaptionInstagram(res.best.instagram);
        if (selected.facebook && res?.best?.facebook) setCaptionFacebook(res.best.facebook);
        if (selected.tiktok && res?.best?.tiktok) setCaptionTikTok(res.best.tiktok);
        if (selected.youtube && res?.best?.youtubeTitle) setYoutubeTitle(res.best.youtubeTitle);
        const fb = res?.best?.instagram || res?.best?.tiktok || '';
        if (selected.twitterVideo && !twitterVideoText.trim() && fb) setTwitterVideoText(fb);
        if (selected.linkedin && !linkedinText.trim() && fb) setLinkedinText(fb);
      } else {
        const cleaned = (Array.isArray(res?.tweets) ? res.tweets : []).map(t => String(t).trim()).filter(Boolean).slice(0, 8);
        setTwitterPosts(cleaned.length ? cleaned : ['']);
      }
    } catch (e: any) { setAiError(e?.message || 'AI failed'); }
    finally { setAiLoading(false); }
  };

  // Submit
  const doSubmit = async () => {
    setSubmitError(null); setSubmitResults([]);
    setSubmitting(true);
    const results: { platform: string; ok: boolean; message: string }[] = [];
    try {
      await Promise.all(enabledPlatforms.map(async k => {
        const sched = scheduleInfoByPlatform[k];
        if (!sched.ok) return;
        const type = POSTIZ_PLATFORM_TYPE[k];
        if (k === 'twitterPosts') {
          await Promise.all(twitterPosts.filter(t => t.trim()).map(async tweet => {
            try {
              const r = await scheduleMedia({ platforms: [type], mediaUrls: { video: videoUpload.status === 'done' ? videoUpload.url : undefined }, captions: { content: tweet }, scheduledTime: sched.rfc3339WithOffset, timezone: TZ_ET });
              results.push({ platform: `X tweet`, ok: r.success, message: r.success ? 'Scheduled' : r.error || 'Failed' });
            } catch (e: any) { results.push({ platform: 'X tweet', ok: false, message: e?.message || 'Failed' }); }
          }));
        } else {
          const content = getCopy(k as Exclude<PlatformKey, 'twitterPosts'>);
          try {
            const r = await scheduleMedia({ platforms: [type], mediaUrls: { video: videoUpload.status === 'done' ? videoUpload.url : undefined, thumbnail: thumbnailUpload.status === 'done' && k === 'youtube' ? thumbnailUpload.url : undefined }, captions: { content }, scheduledTime: sched.rfc3339WithOffset, timezone: TZ_ET });
            results.push({ platform: PLATFORM_META[k].label, ok: r.success, message: r.success ? 'Scheduled' : r.error || 'Failed' });
          } catch (e: any) { results.push({ platform: PLATFORM_META[k].label, ok: false, message: e?.message || 'Failed' }); }
        }
      }));
      setSubmitResults(results);
      if (results.every(r => !r.ok)) setSubmitError('All posts failed. Check your connected accounts.');
      else setSubmitOk(true);
    } catch (e: any) { setSubmitError(e?.message || 'Submit failed'); }
    finally { setSubmitting(false); }
  };

  const navTo = (n: number) => { if (n >= 1 && n <= 6) setStep(n as Step); window.scrollTo({ top: 0 }); };

  // ── Shared input styles
  const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' };
  const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' as const };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      {/* Step progress */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {stepLabels.map((label, i) => (
            <React.Fragment key={label}>
              <button type="button" onClick={() => navTo(i + 1)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
                  color: i === activeIdx ? GOLD : i < activeIdx ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
                  minWidth: 70,
                }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                  background: i === activeIdx ? GOLD : i < activeIdx ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                  color: i === activeIdx ? '#000' : i < activeIdx ? '#fff' : 'rgba(255,255,255,0.3)',
                  border: i === activeIdx ? 'none' : `1px solid ${i < activeIdx ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                }}>{i < activeIdx ? '✓' : i + 1}</div>
                <span style={{ fontSize: 11, fontWeight: i === activeIdx ? 700 : 400 }}>{label}</span>
              </button>
              {i < stepLabels.length - 1 && (
                <div style={{ flex: 1, height: 1, background: i < activeIdx ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)', marginBottom: 22, minWidth: 8 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STEP 1: Platforms */}
      {step === 1 && (
        <div>
          <SectionHeader title="Select Platforms" sub="Choose where you want to publish your content" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {(Object.keys(PLATFORM_META) as PlatformKey[]).map(k => {
              const meta = PLATFORM_META[k];
              const on = selected[k];
              const connected = integrations.some(i => i.type.toLowerCase() === POSTIZ_PLATFORM_TYPE[k].toLowerCase());
              return (
                <button key={k} type="button" onClick={() => setSelected(s => ({ ...s, [k]: !s[k] }))}
                  style={{
                    padding: '14px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    border: `1px solid ${on ? GOLD_BORDER : 'rgba(255,255,255,0.08)'}`,
                    background: on ? GOLD_DIM : 'rgba(255,255,255,0.02)',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <PlatformAvatar platform={k} size={28} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {token && <span style={{ fontSize: 9, fontWeight: 700, color: connected ? '#4ade80' : 'rgba(255,255,255,0.25)' }}>{connected ? '● Connected' : '○ No account'}</span>}
                      {on && <CheckCircle2 style={{ width: 16, height: 16, color: GOLD }} />}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: on ? GOLD_LIGHT : 'rgba(255,255,255,0.8)' }}>{meta.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{meta.sub}</div>
                </button>
              );
            })}
          </div>
          <StepNav onBack={null} onNext={() => navTo(2)} canNext={hasAnyPlatform} />
        </div>
      )}

      {/* STEP 2: Media */}
      {step === 2 && (
        <div>
          <SectionHeader title="Upload Media" sub="Video is required. Thumbnail and audio are optional." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <UploadCard title="Video" subtitle="MP4, MOV, or WebM · Max 49 MB" kind="video" accept="video/*" file={videoFile} setFile={setVideoFile} upload={videoUpload} setUpload={setVideoUpload} required uploadFn={uploadFile} />
            <UploadCard title="Thumbnail" subtitle="PNG or JPG · Used for YouTube" kind="thumbnail" accept="image/*" file={thumbnailFile} setFile={setThumbnailFile} upload={thumbnailUpload} setUpload={setThumbnailUpload} uploadFn={uploadFile} />
            <UploadCard title="Audio for AI" subtitle="MP3 or WAV · Powers AI caption generation" kind="audio" accept="audio/*" file={audioFile} setFile={setAudioFile} upload={audioUpload} setUpload={setAudioUpload} uploadFn={uploadFile} />
          </div>
          <StepNav onBack={() => navTo(1)} onNext={() => navTo(3)} canNext={videoReady} />
        </div>
      )}

      {/* STEP 3: Captions */}
      {step === 3 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <SectionHeader title="Captions & Copy" sub="Write or AI-generate copy for each platform" noMargin />
            <GoldButton onClick={() => setAiMode(v => !v)} small outline>
              <Sparkles style={{ width: 13, height: 13 }} /> {aiMode ? 'Hide AI' : 'AI Generate'}
            </GoldButton>
          </div>
          {aiMode && (
            <div style={{ marginBottom: 16, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>TONE</label>
              <input style={{ ...inputStyle, marginBottom: 10 }} value={tone} onChange={e => setTone(e.target.value)} placeholder="confident, punchy, value-first" />
              {aiError && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10, display: 'flex', gap: 6 }}><AlertCircle style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />{aiError}</div>}
              <GoldButton onClick={() => runAi('captions')} loading={aiLoading} disabled={audioUpload.status !== 'done'} small>
                <Sparkles style={{ width: 13, height: 13 }} /> Generate Captions
              </GoldButton>
              {audioUpload.status !== 'done' && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>Upload audio in the previous step to use AI</div>}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {(enabledPlatforms.filter(k => k !== 'twitterPosts') as Exclude<PlatformKey, 'twitterPosts'>[]).map(k => {
              const meta = PLATFORM_META[k];
              const val = getCopy(k);
              const ok = val.trim().length > 0;
              return (
                <div key={k} style={{ padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: `1px solid ${ok ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <PlatformAvatar platform={k} size={24} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{meta.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{meta.sub}</div>
                    </div>
                    {ok && <CheckCircle2 style={{ width: 15, height: 15, color: '#4ade80' }} />}
                  </div>
                  <textarea rows={meta.kind === 'title' ? 2 : 4} style={textareaStyle} value={val} onChange={e => setCopy(k, e.target.value)} placeholder={`${meta.kind === 'title' ? 'Title' : 'Caption'} for ${meta.label}…`} />
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{val.length} characters</div>
                </div>
              );
            })}
          </div>
          <StepNav onBack={() => navTo(2)} onNext={() => navTo(showTwitterStep ? 4 : 5)} canNext={captionsReady} />
        </div>
      )}

      {/* STEP 4: Twitter Posts */}
      {step === 4 && showTwitterStep && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <SectionHeader title="X Posts" sub="Add standalone tweets — minimum 1 required" noMargin />
            {audioUpload.status === 'done' && (
              <GoldButton onClick={() => runAi('tweets')} loading={aiLoading} small>
                <Sparkles style={{ width: 13, height: 13 }} /> AI Generate
              </GoldButton>
            )}
          </div>
          {aiError && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 12, display: 'flex', gap: 6 }}><AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />{aiError}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            {twitterPosts.map((post, idx) => (
              <div key={idx} style={{ padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Tweet {idx + 1}</span>
                  {twitterPosts.length > 1 && (
                    <button type="button" onClick={() => setTwitterPosts(p => p.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.6)', padding: 4 }}>
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
                <textarea rows={3} style={textareaStyle} value={post} onChange={e => setTwitterPosts(p => p.map((v, i) => i === idx ? e.target.value : v))} placeholder="Write your tweet…" />
                <div style={{ fontSize: 10, color: post.length > 280 ? '#f87171' : 'rgba(255,255,255,0.3)', marginTop: 4 }}>{post.length}/280</div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setTwitterPosts(p => [...p, ''])}
            style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
            <Plus style={{ width: 14, height: 14 }} /> Add Tweet
          </button>
          <StepNav onBack={() => navTo(3)} onNext={() => navTo(5)} canNext={twitterPostsReady} />
        </div>
      )}

      {/* STEP 5: Schedule */}
      {step === 5 && (
        <div>
          <SectionHeader title="Schedule" sub="All times are Eastern (ET)" />
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['same', 'different'] as const).map(m => (
              <button key={m} type="button" onClick={() => setScheduleMode(m)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${scheduleMode === m ? GOLD_BORDER : 'rgba(255,255,255,0.08)'}`, background: scheduleMode === m ? GOLD_DIM : 'rgba(255,255,255,0.02)', color: scheduleMode === m ? GOLD_LIGHT : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {m === 'same' ? 'Same time for all' : 'Different per platform'}
              </button>
            ))}
          </div>
          {scheduleMode === 'same' && (
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>Publish Date & Time (ET)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 5 }}>Date</label>
                  <input type="date" style={inputStyle} value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 5 }}>Time (ET)</label>
                  <input type="time" style={inputStyle} value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                </div>
              </div>
              {scheduleCommonInfo.ok && <div style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, marginTop: 10, display: 'flex', gap: 5 }}><CheckCircle2 style={{ width: 14, height: 14 }} />{scheduleCommonInfo.etDisplay}</div>}
            </div>
          )}
          {scheduleMode === 'different' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {enabledPlatforms.map(k => {
                const info = scheduleInfoByPlatform[k];
                return (
                  <div key={k} style={{ padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <PlatformAvatar platform={k} size={22} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{PLATFORM_META[k].label}</span>
                      {info?.ok && <span style={{ fontSize: 11, color: '#4ade80' }}>✓ {info.etDisplay}</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <input type="date" style={inputStyle} value={scheduleByPlatform[k]?.date || ''} onChange={e => setScheduleByPlatform(prev => ({ ...prev, [k]: { ...prev[k], date: e.target.value } }))} />
                      <input type="time" style={inputStyle} value={scheduleByPlatform[k]?.time || ''} onChange={e => setScheduleByPlatform(prev => ({ ...prev, [k]: { ...prev[k], time: e.target.value } }))} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <StepNav onBack={() => navTo(showTwitterStep ? 4 : 3)} onNext={() => navTo(6)} canNext={scheduleReady} />
        </div>
      )}

      {/* STEP 6: Review */}
      {step === 6 && (
        <div>
          <SectionHeader title="Review & Schedule" sub="Everything looks good? Slide to submit." />

          {!token && (
            <div style={{ padding: 14, borderRadius: 10, border: '1px solid rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.06)', marginBottom: 16, display: 'flex', gap: 10 }}>
              <AlertCircle style={{ width: 16, height: 16, color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>Social accounts not connected</div>
                <div style={{ fontSize: 12, color: 'rgba(251,191,36,0.7)', marginTop: 3 }}>Connect your Postiz account to schedule posts to social media.</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {[
              { label: 'Platforms', val: enabledPlatforms.length ? enabledPlatforms.map(k => PLATFORM_META[k].label).join(', ') : 'None', ok: hasAnyPlatform, step: 1, icon: <Globe style={{ width: 15, height: 15 }} /> },
              { label: 'Video', val: videoUpload.status === 'done' ? `${videoUpload.fileName} · ${prettyBytes(videoUpload.size)}` : 'Missing', ok: videoReady, step: 2, icon: <Video style={{ width: 15, height: 15 }} /> },
              { label: 'Captions', val: captionsReady ? 'All platforms ready' : 'Some missing', ok: captionsReady, step: 3, icon: <FileText style={{ width: 15, height: 15 }} /> },
              { label: 'Schedule', val: scheduleReady ? (scheduleMode === 'same' ? 'Same time for all' : 'Per-platform') : 'Not set', ok: scheduleReady, step: 5, icon: <Clock style={{ width: 15, height: 15 }} /> },
              { label: 'Social Accounts', val: token ? (integrations.length ? `${integrations.length} connected` : 'No accounts') : 'Not connected', ok: Boolean(token) && integrations.length > 0, step: null, icon: <Users style={{ width: 15, height: 15 }} /> },
            ].map(row => (
              <div key={row.label} onClick={row.step ? () => navTo(row.step as Step) : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', cursor: row.step ? 'pointer' : 'default', transition: 'background 0.1s' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: row.ok ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: row.ok ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>{row.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{row.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.val}</div>
                </div>
                {row.ok ? <CheckCircle2 style={{ width: 16, height: 16, color: '#4ade80', flexShrink: 0 }} /> : <AlertCircle style={{ width: 16, height: 16, color: 'rgba(239,68,68,0.5)', flexShrink: 0 }} />}
                {row.step && <ChevronRight style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />}
              </div>
            ))}
          </div>

          {/* Platform preview */}
          {enabledPlatforms.length > 0 && (
            <div style={{ marginBottom: 20, padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>PLATFORM PREVIEW</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {enabledPlatforms.map(k => {
                  const sched = scheduleInfoByPlatform[k];
                  const connected = integrations.some(i => i.type.toLowerCase() === POSTIZ_PLATFORM_TYPE[k].toLowerCase());
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 7, background: connected ? 'rgba(74,222,128,0.06)' : 'rgba(255,255,255,0.04)', border: `1px solid ${connected ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
                      <PlatformAvatar platform={k} size={20} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{PLATFORM_META[k].label}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{sched?.ok ? sched.etDisplay : 'No schedule'}</div>
                      </div>
                      {connected ? <span style={{ fontSize: 9, color: '#4ade80' }}>●</span> : <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>○</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {submitResults.length > 0 && (
            <div style={{ padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>RESULTS</div>
              {submitResults.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: r.ok ? '#4ade80' : '#f87171', marginBottom: 4 }}>
                  {r.ok ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : <AlertCircle style={{ width: 14, height: 14 }} />}
                  <span style={{ fontWeight: 600 }}>{r.platform}:</span> {r.message}
                </div>
              ))}
            </div>
          )}

          {submitError && (
            <div style={{ padding: 12, borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5', fontSize: 13, display: 'flex', gap: 8, marginBottom: 16 }}>
              <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} /> {submitError}
            </div>
          )}

          {submitOk && (
            <div style={{ padding: 14, borderRadius: 10, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.07)', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
              <CheckCircle2 style={{ width: 20, height: 20, color: '#4ade80', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>Scheduled successfully!</div>
                <div style={{ fontSize: 12, color: 'rgba(74,222,128,0.7)', marginTop: 2 }}>Your posts have been queued in your social media scheduler.</div>
              </div>
            </div>
          )}

          {/* Schedule button */}
          <button type="button" onClick={doSubmit} disabled={!reviewReady || submitting || submitOk}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: !reviewReady || submitting || submitOk ? 'not-allowed' : 'pointer',
              background: !reviewReady || submitOk ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`,
              color: !reviewReady || submitOk ? 'rgba(255,255,255,0.3)' : '#000',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s',
            }}>
            {submitting ? <><Loader style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Scheduling…</> : submitOk ? <><CheckCircle2 style={{ width: 16, height: 16 }} /> Scheduled</> : <><Send style={{ width: 16, height: 16 }} /> Schedule Posts</>}
          </button>

          <div style={{ marginTop: 12 }}>
            <StepNav onBack={() => navTo(5)} onNext={null} canNext={false} />
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── SHARED SUBCOMPONENTS ─────────────────────────────────────────

function SectionHeader({ title, sub, noMargin }: { title: string; sub: string; noMargin?: boolean }) {
  return (
    <div style={{ marginBottom: noMargin ? 0 : 18 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h2>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>{sub}</p>
    </div>
  );
}

function StepNav({ onBack, onNext, canNext }: { onBack: (() => void) | null; onNext: (() => void) | null; canNext: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', paddingTop: 8 }}>
      {onBack ? (
        <GoldButton onClick={onBack} outline small><ChevronLeft style={{ width: 14, height: 14 }} /> Back</GoldButton>
      ) : <div />}
      {onNext && (
        <GoldButton onClick={onNext} disabled={!canNext} small>Continue <ChevronRight style={{ width: 14, height: 14 }} /></GoldButton>
      )}
    </div>
  );
}

function UploadCard({ title, subtitle, kind, accept, file, setFile, upload, setUpload, required, uploadFn }: {
  title: string; subtitle: string; kind: MediaKind; accept: string; file: File | null;
  setFile: (f: File | null) => void; upload: UploadState; setUpload: (s: UploadState) => void; required?: boolean;
  uploadFn: (file: File, kind: MediaKind, setState: (s: UploadState) => void) => Promise<void>;
}) {
  const done = upload.status === 'done';
  return (
    <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: `1px solid ${done ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            {title}
            {required && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: GOLD_DIM, color: GOLD, fontWeight: 700 }}>Required</span>}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{subtitle}</div>
        </div>
        {done && <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#4ade80', fontSize: 12, fontWeight: 600 }}><CheckCircle2 style={{ width: 14, height: 14 }} /> Uploaded</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <UploadCloud style={{ width: 14, height: 14 }} /> {file ? 'Change file' : 'Choose file'}
          <input type="file" accept={accept} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0] ?? null; setFile(f); if (f) uploadFn(f, kind, setUpload); }} />
        </label>
        {upload.status === 'uploading' && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'flex', gap: 5 }}><Loader style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} />Uploading…</span>}
        {upload.status === 'done' && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{upload.fileName} ({prettyBytes(upload.size)})</span>}
        {upload.status === 'error' && <span style={{ fontSize: 12, color: '#f87171', display: 'flex', gap: 5 }}><AlertCircle style={{ width: 13, height: 13, flexShrink: 0 }} />{upload.message}</span>}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
export function MediaDistributionPage() {
  const [view, setView] = useState<View>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [posts] = useState<ScheduledPost[]>(DEMO_POSTS);

  // Postiz auth
  const [postizToken, setPostizToken] = useState<string | null>(() => localStorage.getItem(LS_TOKEN_KEY));
  const [integrations, setIntegrations] = useState<PostizIntegration[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('postiz_callback') !== '1') return;
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    window.history.replaceState({}, '', window.location.pathname);
    if (error === 'access_denied') { setOauthError('Authorization denied.'); return; }
    if (!code) { setOauthError('No authorization code received.'); return; }
    const saved = localStorage.getItem(LS_STATE_KEY);
    if (!saved || saved !== state) { setOauthError('Security check failed.'); return; }
    localStorage.removeItem(LS_STATE_KEY);
    setOauthLoading(true);
    fetch('/.netlify/functions/postiz-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
      .then(async r => { if (!r.ok) throw new Error(`Token exchange failed (${r.status})`); return r.json(); })
      .then(({ access_token }) => { if (!access_token) throw new Error('No access_token'); localStorage.setItem(LS_TOKEN_KEY, access_token); setPostizToken(access_token); setOauthError(null); })
      .catch(e => setOauthError(e?.message || 'Authorization failed'))
      .finally(() => setOauthLoading(false));
  }, []);

  const loadIntegrations = useCallback(async (token: string) => {
    setIntegrationsLoading(true);
    try { setIntegrations(await fetchIntegrations(token)); } catch { setIntegrations([]); } finally { setIntegrationsLoading(false); }
  }, []);

  useEffect(() => { if (postizToken) loadIntegrations(postizToken); else setIntegrations([]); }, [postizToken, loadIntegrations]);

  const handleConnect = () => { const s = generateState(); localStorage.setItem(LS_STATE_KEY, s); window.location.href = buildAuthUrl(s); };
  const handleDisconnect = () => { localStorage.removeItem(LS_TOKEN_KEY); localStorage.removeItem(LS_STATE_KEY); setPostizToken(null); setIntegrations([]); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Back link (mobile) */}
      <div style={{ position: 'fixed', top: 12, left: 12, zIndex: 100 }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: 7, backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <ArrowLeft style={{ width: 13, height: 13 }} /> Back
        </Link>
      </div>

      <Sidebar
        view={view} onView={setView}
        integrations={integrations} onConnect={handleConnect} onDisconnect={handleDisconnect}
        token={postizToken} selectedDate={selectedDate} onSelectDate={setSelectedDate} posts={posts}
      />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}>
        <TopBar view={view} onView={setView} onCompose={() => setView('compose')} />

        {/* OAuth notifications */}
        {(oauthLoading || oauthError) && (
          <div style={{ padding: '10px 24px', background: oauthError ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            {oauthLoading ? <><Loader style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /><span style={{ color: 'rgba(255,255,255,0.6)' }}>Completing authorization…</span></> : <><AlertCircle style={{ width: 14, height: 14, color: '#f87171' }} /><span style={{ color: '#fca5a5' }}>{oauthError}</span></>}
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto' }}>
          {view === 'calendar' && <CalendarView selectedDate={selectedDate} onSelectDate={setSelectedDate} posts={posts} onCompose={() => setView('compose')} />}
          {view === 'list' && <ListView posts={posts} />}
          {view === 'compose' && (
            <ComposePanel
              token={postizToken}
              integrations={integrations}
              onIntegrationsRefresh={() => postizToken && loadIntegrations(postizToken)}
              integrationsLoading={integrationsLoading}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input[type="date"], input[type="time"] { color-scheme: dark; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}