import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar,
  Clock,
  X,
  Plus,
  Trash2,
  FileText,
  Video,
  Mic,
} from 'lucide-react';
import { supabase } from '../services/vapiAI';

const GOLD_PRIMARY = '#D6B25E';
const GOLD_HOVER = '#F0D27C';

// ✅ Your n8n test webhook URL
const WEBHOOK_URL =
  'https://iwsaiagents.app.n8n.cloud/webhook-test/f8390721-73cc-4594-921c-3afff87774c0';

// ✅ Supabase Storage bucket name
const BUCKET = 'media';

// ✅ Supabase free plan safe limit (use 49MB to avoid edge cases)
const MAX_BYTES = 49 * 1024 * 1024; // 49MB

// Signed URL fallback duration (only used if bucket is private)
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

type MediaKind = 'video' | 'audio' | 'thumbnail';

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | {
      status: 'done';
      path: string;
      url: string;
      fileName: string;
      mime: string;
      size: number;
    }
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
  captions: {
    instagram: string[];
    facebook: string[];
    tiktok: string[];
  };
  youtubeTitles: string[];
  best: {
    instagram: string;
    facebook: string;
    tiktok: string;
    youtubeTitle: string;
  };
};

type PlatformKey =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'youtube'
  | 'twitterVideo'
  | 'linkedin'
  | 'twitterPosts';

const PLATFORM_META: Record<
  PlatformKey,
  { label: string; sub: string; kind: 'caption' | 'title' | 'text' | 'posts' }
> = {
  instagram: { label: 'Instagram', sub: 'Reels caption', kind: 'caption' },
  tiktok: { label: 'TikTok', sub: 'Caption', kind: 'caption' },
  facebook: { label: 'Facebook', sub: 'Reels caption', kind: 'caption' },
  youtube: { label: 'YouTube', sub: 'Shorts title', kind: 'title' },
  twitterVideo: { label: 'Twitter/X (Video)', sub: 'Post text for video', kind: 'text' },
  linkedin: { label: 'LinkedIn', sub: 'Post text', kind: 'text' },
  twitterPosts: { label: 'Twitter/X Posts', sub: 'Standalone posts (AI step)', kind: 'posts' },
};

function prettyBytes(bytes: number) {
  if (!bytes || bytes < 1) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

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
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        role="button"
        tabIndex={0}
      />
      <div className="absolute inset-0 p-4 sm:p-8">
        <div className="h-full w-full rounded-3xl border border-white/10 bg-[#0b0b0b] shadow-[0_30px_120px_rgba(0,0,0,0.85)] overflow-hidden">
          <div className="flex items-start justify-between gap-4 p-5 sm:p-7 border-b border-white/10">
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-extrabold text-white truncate">{title}</div>
              {subtitle ? <div className="text-sm text-white/60 mt-1">{subtitle}</div> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 font-extrabold inline-flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
          <div className="h-[calc(100%-76px)] overflow-y-auto p-5 sm:p-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

function SlideToSubmit({
  disabled,
  loading,
  onSubmit,
  success,
}: {
  disabled: boolean;
  loading: boolean;
  onSubmit: () => void;
  success: boolean;
}) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!loading && !success) setVal(0);
  }, [loading, success]);

  useEffect(() => {
    if (val >= 100 && !disabled && !loading && !success) {
      onSubmit();
      // keep at 100 while submitting, will reset by effect above
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val]);

  const label = success
    ? 'Submitted'
    : loading
      ? 'Submitting…'
      : disabled
        ? 'Complete required fields to submit'
        : 'Slide to submit';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="font-extrabold text-white">{label}</div>
        {success ? (
          <span className="inline-flex items-center gap-2 text-green-200 font-extrabold text-sm">
            <CheckCircle2 className="h-4 w-4" /> Done
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="relative">
          <div className="h-12 rounded-2xl border border-white/10 bg-black/25" />
          <div
            className="absolute left-0 top-0 h-12 rounded-2xl"
            style={{
              width: `${Math.max(6, Math.min(100, val))}%`,
              background:
                disabled || success
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(214, 178, 94, 0.16)',
              border: disabled || success ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(214,178,94,0.28)',
              transition: loading ? 'none' : 'width 80ms linear',
            }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={val}
            onChange={(e) => setVal(Number(e.target.value))}
            disabled={disabled || loading || success}
            className="absolute inset-0 w-full h-12 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Slide to submit"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="inline-flex items-center gap-2 text-sm font-extrabold"
              style={{ color: disabled ? 'rgba(255,255,255,0.45)' : GOLD_HOVER }}
            >
              {loading ? <Loader className="h-4 w-4 animate-spin" /> : null}
              {success ? 'Submitted' : '⇢'}
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-white/55">
          Drag the slider all the way to the right to submit.
        </div>
      </div>
    </div>
  );
}

export function MediaDistributionPage() {
  const [bgOffset, setBgOffset] = useState(0);

  // ---- Wizard steps ----
  // 1 Platforms
  // 2 Video
  // 3 Captions
  // 4 Twitter Posts (optional)
  // 5 Schedule
  // 6 Review (not shown in step pills)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Step 1: platforms (✅ default all unselected)
  const [selected, setSelected] = useState<Record<PlatformKey, boolean>>({
    instagram: false,
    tiktok: false,
    facebook: false,
    youtube: false,
    twitterVideo: false,
    linkedin: false,
    twitterPosts: false,
  });

  // Step 2: video upload
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUpload, setVideoUpload] = useState<UploadState>({ status: 'idle' });

  // Optional thumbnail
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailUpload, setThumbnailUpload] = useState<UploadState>({ status: 'idle' });

  // Shared AI settings + audio upload
  const [tone, setTone] = useState('confident, punchy, value-first');
  const [aiMode, setAiMode] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUpload, setAudioUpload] = useState<UploadState>({ status: 'idle' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Step 3: per-platform copy (captions/titles/text)
  const [captionInstagram, setCaptionInstagram] = useState('');
  const [captionTikTok, setCaptionTikTok] = useState('');
  const [captionFacebook, setCaptionFacebook] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [twitterVideoText, setTwitterVideoText] = useState('');
  const [linkedinText, setLinkedinText] = useState('');

  // Step 4: Twitter/X Posts
  const [twitterPosts, setTwitterPosts] = useState<string[]>(['', '', '']);
  const [activeTweetIndex, setActiveTweetIndex] = useState<number | null>(null);

  // Step 5: schedule
  const [scheduleMode, setScheduleMode] = useState<'same' | 'different'>('same');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleByPlatform, setScheduleByPlatform] = useState<
    Record<PlatformKey, { date: string; time: string }>
  >({
    instagram: { date: '', time: '' },
    tiktok: { date: '', time: '' },
    facebook: { date: '', time: '' },
    youtube: { date: '', time: '' },
    twitterVideo: { date: '', time: '' },
    linkedin: { date: '', time: '' },
    twitterPosts: { date: '', time: '' },
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

  // Modal selection (captions + schedule)
  const [activeCaptionPlatform, setActiveCaptionPlatform] = useState<
    Exclude<PlatformKey, 'twitterPosts'> | null
  >(null);
  const [activeSchedulePlatform, setActiveSchedulePlatform] = useState<PlatformKey | null>(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        setBgOffset(window.scrollY * 0.15);
        raf = 0;
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const resetSubmitState = () => {
    setSubmitOk(false);
    setSubmitError(null);
  };

  const sizeGuard = (file: File, kind: MediaKind) => {
    if (file.size > MAX_BYTES) {
      const label =
        kind === 'video' ? 'Video' : kind === 'audio' ? 'Audio' : 'Thumbnail image';
      return (
        `${label} is too large (${prettyBytes(file.size)}). ` +
        `Max allowed is ${prettyBytes(MAX_BYTES)}. Please compress and try again.`
      );
    }
    return null;
  };

  const getPublicOrSignedUrl = async (path: string) => {
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub?.data?.publicUrl;
    if (publicUrl) return publicUrl;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed to create signed URL');
    return data.signedUrl;
  };

  const uploadFile = async (
    file: File,
    kind: MediaKind,
    setState: (s: UploadState) => void
  ) => {
    resetSubmitState();

    const guardMsg = sizeGuard(file, kind);
    if (guardMsg) {
      setState({ status: 'error', message: guardMsg });
      return;
    }

    setState({ status: 'uploading' });

    try {
      const safeName = file.name.replace(/\s+/g, '-');
      const ext = safeName.includes('.') ? safeName.split('.').pop() : '';
      const ts = Date.now();
      const random = Math.random().toString(16).slice(2);
      const path = `transferrable-everything/${kind}/${ts}-${random}${ext ? `.${ext}` : ''}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

      if (upErr) throw new Error(upErr.message || 'Upload failed');

      const url = await getPublicOrSignedUrl(path);

      setState({
        status: 'done',
        path,
        url,
        fileName: file.name,
        mime: file.type || 'unknown',
        size: file.size,
      });
    } catch (e: any) {
      setState({ status: 'error', message: e?.message || 'Upload failed' });
    }
  };

  // ---- Timezone conversion (ET -> UTC) ----
  const TZ_ET = 'America/New_York';
  const pad2 = (n: number) => String(n).padStart(2, '0');

  const formatPartsInTz = (d: Date, timeZone: string) => {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = dtf.formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';

    return {
      year: Number(get('year')),
      month: Number(get('month')),
      day: Number(get('day')),
      hour: Number(get('hour')),
      minute: Number(get('minute')),
      second: Number(get('second')),
    };
  };

  const toUtcFromEtLocal = (dateStr: string, timeStr: string): ScheduleInfo => {
    if (!dateStr || !timeStr) {
      return { ok: false, message: 'Choose a schedule date and time (ET).' };
    }

    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    const t = /^(\d{2}):(\d{2})$/.exec(timeStr);
    if (!m || !t) return { ok: false, message: 'Invalid date/time format.' };

    const y = Number(m[1]);
    const mo = Number(m[2]);
    const da = Number(m[3]);
    const hh = Number(t[1]);
    const mm = Number(t[2]);

    let guess = Date.UTC(y, mo - 1, da, hh, mm, 0);
    for (let i = 0; i < 4; i++) {
      const d = new Date(guess);
      const et = formatPartsInTz(d, TZ_ET);

      const desiredUtcAsIf = Date.UTC(y, mo - 1, da, hh, mm, 0);
      const gotUtcAsIf = Date.UTC(et.year, et.month - 1, et.day, et.hour, et.minute, 0);

      const diffMs = desiredUtcAsIf - gotUtcAsIf;
      if (Math.abs(diffMs) < 1000) break;
      guess += diffMs;
    }

    const utcDate = new Date(guess);

    const etParts = formatPartsInTz(utcDate, TZ_ET);
    const etAsIfUtc = Date.UTC(
      etParts.year,
      etParts.month - 1,
      etParts.day,
      etParts.hour,
      etParts.minute,
      etParts.second
    );
    const offsetMinutes = Math.round((etAsIfUtc - utcDate.getTime()) / 60000);
    const sign = offsetMinutes <= 0 ? '-' : '+';
    const absMin = Math.abs(offsetMinutes);
    const offH = Math.floor(absMin / 60);
    const offM = absMin % 60;
    const offsetStr = `${sign}${pad2(offH)}:${pad2(offM)}`;

    const rfc3339WithOffset = `${etParts.year}-${pad2(etParts.month)}-${pad2(etParts.day)}T${pad2(
      etParts.hour
    )}:${pad2(etParts.minute)}:${pad2(etParts.second)}${offsetStr}`;

    const etDisplay = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ_ET,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(utcDate);

    return {
      ok: true,
      timezone: TZ_ET,
      etDisplay,
      rfc3339WithOffset,
      utcIso: utcDate.toISOString(),
      unixSeconds: Math.floor(utcDate.getTime() / 1000),
      unixMillis: utcDate.getTime(),
    };
  };

  const enabledPlatforms = useMemo(() => {
    return (Object.keys(selected) as PlatformKey[]).filter((k) => Boolean(selected[k]));
  }, [selected]);

  const hasAnyPlatform = enabledPlatforms.length > 0;
  const videoReady = videoUpload.status === 'done';
  const showTwitterPostsStep = selected.twitterPosts;

  const captionsReady = useMemo(() => {
    const needs = (k: PlatformKey) => selected[k];

    const okInstagram = !needs('instagram') || captionInstagram.trim().length > 0;
    const okTikTok = !needs('tiktok') || captionTikTok.trim().length > 0;
    const okFacebook = !needs('facebook') || captionFacebook.trim().length > 0;
    const okYoutube = !needs('youtube') || youtubeTitle.trim().length > 0;
    const okTwitterVideo = !needs('twitterVideo') || twitterVideoText.trim().length > 0;
    const okLinkedin = !needs('linkedin') || linkedinText.trim().length > 0;

    return okInstagram && okTikTok && okFacebook && okYoutube && okTwitterVideo && okLinkedin;
  }, [
    selected,
    captionInstagram,
    captionTikTok,
    captionFacebook,
    youtubeTitle,
    twitterVideoText,
    linkedinText,
  ]);

  const twitterPostsReady = useMemo(() => {
    if (!selected.twitterPosts) return true;
    const cleaned = twitterPosts.map((t) => t.trim()).filter(Boolean);
    return cleaned.length >= 1;
  }, [selected.twitterPosts, twitterPosts]);

  const scheduleCommonInfo: ScheduleInfo = useMemo(() => {
    if (scheduleMode !== 'same') return { ok: false, message: 'Using different times per platform.' };
    return toUtcFromEtLocal(scheduleDate, scheduleTime);
  }, [scheduleMode, scheduleDate, scheduleTime]);

  const scheduleInfoByPlatform = useMemo(() => {
    const map: Record<PlatformKey, ScheduleInfo> = {
      instagram: { ok: false, message: 'Not scheduled.' },
      tiktok: { ok: false, message: 'Not scheduled.' },
      facebook: { ok: false, message: 'Not scheduled.' },
      youtube: { ok: false, message: 'Not scheduled.' },
      twitterVideo: { ok: false, message: 'Not scheduled.' },
      linkedin: { ok: false, message: 'Not scheduled.' },
      twitterPosts: { ok: false, message: 'Not scheduled.' },
    };

    (Object.keys(map) as PlatformKey[]).forEach((k) => {
      if (!selected[k]) {
        map[k] = { ok: false, message: 'Not selected.' };
        return;
      }

      if (scheduleMode === 'same') {
        map[k] = scheduleCommonInfo.ok
          ? scheduleCommonInfo
          : { ok: false, message: scheduleCommonInfo.message };
        return;
      }

      const d = scheduleByPlatform[k]?.date || '';
      const t = scheduleByPlatform[k]?.time || '';
      map[k] = toUtcFromEtLocal(d, t);
    });

    return map;
  }, [selected, scheduleMode, scheduleCommonInfo, scheduleByPlatform]);

  const scheduleReady = useMemo(() => {
    if (!hasAnyPlatform) return false;

    if (scheduleMode === 'same') {
      return scheduleCommonInfo.ok;
    }

    return enabledPlatforms.every((k) => scheduleInfoByPlatform[k].ok);
  }, [hasAnyPlatform, scheduleMode, scheduleCommonInfo, enabledPlatforms, scheduleInfoByPlatform]);

  const canProceedFromStep = useMemo(() => {
    if (step === 1) return hasAnyPlatform;
    if (step === 2) return videoReady;
    if (step === 3) return captionsReady;
    if (step === 4) return twitterPostsReady;
    if (step === 5) return scheduleReady;
    if (step === 6) return true;
    return false;
  }, [step, hasAnyPlatform, videoReady, captionsReady, twitterPostsReady, scheduleReady]);

  const goToNext = () => {
    resetSubmitState();
    if (!canProceedFromStep) return;

    if (step === 1) return setStep(2);
    if (step === 2) return setStep(3);
    if (step === 3) return setStep(showTwitterPostsStep ? 4 : 5);
    if (step === 4) return setStep(5);
    if (step === 5) return setStep(6); // ✅ review step
  };

  const goToPrev = () => {
    resetSubmitState();
    if (step === 1) return;
    if (step === 2) return setStep(1);
    if (step === 3) return setStep(2);
    if (step === 4) return setStep(3);
    if (step === 5) return setStep(showTwitterPostsStep ? 4 : 3);
    if (step === 6) return setStep(5);
  };

  const runAiForCaptions = async () => {
    setAiError(null);
    resetSubmitState();

    if (audioUpload.status !== 'done') {
      setAiError('Upload your audio first.');
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-ai', {
        body: { audioUrl: audioUpload.url, tone },
      });

      if (error) {
        throw new Error(
          (error as any)?.context?.body?.details || error.message || 'AI generation failed.'
        );
      }

      const res = data as AiGenResponse;

      if (selected.instagram && res?.best?.instagram) setCaptionInstagram(res.best.instagram);
      if (selected.facebook && res?.best?.facebook) setCaptionFacebook(res.best.facebook);
      if (selected.tiktok && res?.best?.tiktok) setCaptionTikTok(res.best.tiktok);
      if (selected.youtube && res?.best?.youtubeTitle) setYoutubeTitle(res.best.youtubeTitle);

      const fallbackText =
        res?.best?.instagram || res?.best?.tiktok || res?.best?.facebook || '';
      if (selected.twitterVideo && !twitterVideoText.trim() && fallbackText)
        setTwitterVideoText(fallbackText);
      if (selected.linkedin && !linkedinText.trim() && fallbackText) setLinkedinText(fallbackText);
    } catch (e: any) {
      setAiError(e?.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const runAiForTwitterPosts = async () => {
    setAiError(null);
    resetSubmitState();

    if (audioUpload.status !== 'done') {
      setAiError('Upload your audio first.');
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-ai', {
        body: { audioUrl: audioUpload.url, tone },
      });

      if (error) {
        throw new Error(
          (error as any)?.context?.body?.details || error.message || 'AI generation failed.'
        );
      }

      const res = data as AiGenResponse;
      const tweets = Array.isArray(res?.tweets) ? res.tweets : [];

      const cleaned = tweets.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 8);
      setTwitterPosts(cleaned.length ? cleaned : ['']);
    } catch (e: any) {
      setAiError(e?.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const submitWebhook = async () => {
    resetSubmitState();

    if (!hasAnyPlatform) {
      setSubmitError('Choose at least one platform.');
      return;
    }

    if (videoUpload.status !== 'done') {
      setSubmitError('Upload your video.');
      return;
    }

    if (!captionsReady) {
      setSubmitError('Make sure every selected platform has its required text filled in.');
      return;
    }

    if (!twitterPostsReady) {
      setSubmitError('Add at least 1 Twitter/X post.');
      return;
    }

    if (!scheduleReady) {
      setSubmitError('Complete scheduling for your selected platforms.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(false);

    try {
      const getLocal = (k: PlatformKey) => {
        if (scheduleMode === 'same') return { date: scheduleDate, time: scheduleTime };
        return scheduleByPlatform[k] || { date: '', time: '' };
      };

      const baseScheduleObj = (k: PlatformKey) => {
        const info = scheduleInfoByPlatform[k];
        if (!info.ok) return null;

        const requestedLocal = getLocal(k);

        return {
          inputTimezone: TZ_ET as 'America/New_York',
          utcIso: info.utcIso,
          unixSeconds: info.unixSeconds,
          unixMillis: info.unixMillis,
          rfc3339WithOffset: info.rfc3339WithOffset,
          etDisplay: info.etDisplay,
          requestedLocal,
          mode: scheduleMode as 'same' | 'different',
        };
      };

      const payload = {
        source: 'media-distribution-landing',
        brand: 'Transferrable Everything',
        submittedAt: new Date().toISOString(),
        selection: {
          platforms: enabledPlatforms,
        },
        assets: {
          video: {
            url: videoUpload.url,
            storagePath: videoUpload.path,
            fileName: videoUpload.fileName,
            mime: videoUpload.mime,
            size: videoUpload.size,
          },
          thumbnail:
            thumbnailUpload.status === 'done'
              ? {
                  url: thumbnailUpload.url,
                  storagePath: thumbnailUpload.path,
                  fileName: thumbnailUpload.fileName,
                  mime: thumbnailUpload.mime,
                  size: thumbnailUpload.size,
                }
              : null,
          audio:
            audioUpload.status === 'done'
              ? {
                  url: audioUpload.url,
                  storagePath: audioUpload.path,
                  fileName: audioUpload.fileName,
                  mime: audioUpload.mime,
                  size: audioUpload.size,
                }
              : null,
        },
        copy: {
          tone,
          perPlatform: {
            instagram: selected.instagram ? { caption: captionInstagram } : null,
            tiktok: selected.tiktok ? { caption: captionTikTok } : null,
            facebook: selected.facebook ? { caption: captionFacebook } : null,
            youtube: selected.youtube ? { title: youtubeTitle } : null,
            twitterVideo: selected.twitterVideo ? { text: twitterVideoText } : null,
            linkedin: selected.linkedin ? { text: linkedinText } : null,
            twitterPosts: selected.twitterPosts
              ? {
                  posts: twitterPosts.map((t) => t.trim()).filter(Boolean),
                }
              : null,
          },
        },
        scheduling: {
          inputTimezone: TZ_ET,
          mode: scheduleMode,
          common:
            scheduleMode === 'same' && scheduleCommonInfo.ok
              ? {
                  utcIso: scheduleCommonInfo.utcIso,
                  unixSeconds: scheduleCommonInfo.unixSeconds,
                  unixMillis: scheduleCommonInfo.unixMillis,
                  rfc3339WithOffset: scheduleCommonInfo.rfc3339WithOffset,
                  etDisplay: scheduleCommonInfo.etDisplay,
                  requestedLocal: { date: scheduleDate, time: scheduleTime },
                }
              : null,
        },
        platforms: {
          instagram: selected.instagram
            ? { enabled: true, copy: { caption: captionInstagram }, schedule: baseScheduleObj('instagram') }
            : { enabled: false },
          tiktok: selected.tiktok
            ? { enabled: true, copy: { caption: captionTikTok }, schedule: baseScheduleObj('tiktok') }
            : { enabled: false },
          facebook: selected.facebook
            ? { enabled: true, copy: { caption: captionFacebook }, schedule: baseScheduleObj('facebook') }
            : { enabled: false },
          youtube: selected.youtube
            ? { enabled: true, copy: { title: youtubeTitle }, schedule: baseScheduleObj('youtube') }
            : { enabled: false },
          twitterVideo: selected.twitterVideo
            ? { enabled: true, copy: { text: twitterVideoText }, schedule: baseScheduleObj('twitterVideo') }
            : { enabled: false },
          linkedin: selected.linkedin
            ? { enabled: true, copy: { text: linkedinText }, schedule: baseScheduleObj('linkedin') }
            : { enabled: false },
          twitterPosts: selected.twitterPosts
            ? {
                enabled: true,
                copy: { posts: twitterPosts.map((t) => t.trim()).filter(Boolean) },
                schedule: baseScheduleObj('twitterPosts'),
              }
            : { enabled: false },
        },
      };

      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(`Webhook failed (${res.status}). ${text ? `Response: ${text}` : ''}`.trim());
      }

      setSubmitOk(true);
      setStep(6);
    } catch (e: any) {
      setSubmitError(e?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const WizardPill = ({
    n,
    label,
    active,
    done,
    onClick,
  }: {
    n: number;
    label: string;
    active: boolean;
    done: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? 'bg-white/10 border-white/15'
          : 'bg-white/5 border-gray-700/50 hover:bg-white/10 hover:border-white/15'
      }`}
      type="button"
    >
      <div
        className="h-8 w-8 rounded-xl flex items-center justify-center font-extrabold"
        style={{
          backgroundColor: active ? 'rgba(214, 178, 94, 0.18)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${active ? 'rgba(214,178,94,0.40)' : 'rgba(255,255,255,0.10)'}`,
          color: active ? GOLD_HOVER : 'rgba(255,255,255,0.85)',
        }}
      >
        {done ? <CheckCircle2 className="h-5 w-5" /> : n}
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-white">{label}</div>
      </div>
    </button>
  );

  const FileUploadCard = ({
    title,
    subtitle,
    kind,
    accept,
    file,
    setFile,
    upload,
    setUpload,
    required,
  }: {
    title: string;
    subtitle: string;
    kind: MediaKind;
    accept: string;
    file: File | null;
    setFile: (f: File | null) => void;
    upload: UploadState;
    setUpload: (s: UploadState) => void;
    required?: boolean;
  }) => (
    <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold">
            {title} {required ? <span className="text-xs text-white/60">(Required)</span> : null}
          </h3>
          <p className="text-gray-300 text-sm mt-1">{subtitle}</p>
        </div>

        {upload.status === 'done' && (
          <div className="flex items-center gap-2 text-sm text-green-200">
            <CheckCircle2 className="h-4 w-4" />
            Uploaded
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          type="file"
          accept={accept}
          className="block w-full text-sm text-gray-200 file:mr-4 file:rounded-xl file:border-0 file:px-4 file:py-2 file:font-bold file:bg-white file:text-black hover:file:bg-gray-100"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setFile(f);
            setUpload({ status: 'idle' });
            resetSubmitState();

            if (f) {
              const msg = sizeGuard(f, kind);
              if (msg) setUpload({ status: 'error', message: msg });
            }
          }}
        />

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition border disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderColor: 'rgba(214, 178, 94, 0.45)',
            backgroundColor: 'rgba(0,0,0,0.15)',
            color: GOLD_HOVER,
          }}
          disabled={!file || upload.status === 'uploading' || upload.status === 'error'}
          onClick={() => file && uploadFile(file, kind, setUpload)}
        >
          {upload.status === 'uploading' ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" />
              Upload
            </>
          )}
        </button>
      </div>

      <div className="mt-4">
        {upload.status === 'done' && (
          <div className="text-sm text-gray-200">
            <div className="text-gray-300">
              <span className="font-semibold">File:</span> {upload.fileName} • {prettyBytes(upload.size)}
            </div>
            <div className="mt-1 break-all">
              <span className="font-semibold">URL:</span>{' '}
              <a className="underline" href={upload.url} target="_blank" rel="noreferrer">
                {upload.url}
              </a>
            </div>
          </div>
        )}

        {upload.status === 'error' && (
          <div className="text-sm text-red-200 mt-2 inline-flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{upload.message}</span>
          </div>
        )}
      </div>
    </div>
  );

  const BottomNav = ({
    nextLabel = 'Next',
    hideNext = false,
  }: {
    nextLabel?: string;
    hideNext?: boolean;
  }) => (
    <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={goToPrev}
        className="rounded-xl px-5 py-3 font-bold border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={step === 1 || submitting}
      >
        Back
      </button>

      {!hideNext ? (
        <button
          type="button"
          onClick={goToNext}
          className="rounded-xl px-5 py-3 font-extrabold border transition disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderColor: 'rgba(214, 178, 94, 0.45)',
            backgroundColor: 'rgba(0,0,0,0.15)',
            color: GOLD_HOVER,
          }}
          disabled={!canProceedFromStep || submitting}
        >
          {nextLabel}
        </button>
      ) : null}
    </div>
  );

  const copyOkForPlatform = (k: Exclude<PlatformKey, 'twitterPosts'>) => {
    if (!selected[k]) return true;
    if (k === 'instagram') return captionInstagram.trim().length > 0;
    if (k === 'tiktok') return captionTikTok.trim().length > 0;
    if (k === 'facebook') return captionFacebook.trim().length > 0;
    if (k === 'youtube') return youtubeTitle.trim().length > 0;
    if (k === 'twitterVideo') return twitterVideoText.trim().length > 0;
    if (k === 'linkedin') return linkedinText.trim().length > 0;
    return false;
  };

  const getCopyLabel = (k: Exclude<PlatformKey, 'twitterPosts'>) => {
    const meta = PLATFORM_META[k];
    if (meta.kind === 'title') return 'Title';
    return 'Text / Caption';
  };

  const reviewReadyToSubmit =
    hasAnyPlatform && videoReady && captionsReady && twitterPostsReady && scheduleReady;

  const scheduleSummaryForPlatform = (k: PlatformKey) => {
    const info = scheduleInfoByPlatform[k];
    if (!selected[k]) return 'Not selected';
    if (info.ok) return info.etDisplay;
    return info.message || 'Not scheduled';
  };

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{
        backgroundImage: `radial-gradient(1200px 600px at 50% ${
          -200 + bgOffset
        }px, rgba(200, 162, 74, 0.18), transparent 62%), linear-gradient(to bottom, #2a2a2a, #0b0b0b, #000)`,
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}
    >
      <style>
        {`
          .gold-shimmer {
            background-image: linear-gradient(
              110deg,
              #b9892b 0%,
              #f7dc8a 20%,
              #ffffff 30%,
              #f1d27b 40%,
              #b9892b 60%,
              #f7dc8a 80%,
              #ffffff 90%,
              #b9892b 100%
            );
            background-size: 240% 100%;
            background-position: 0% 50%;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: goldShimmerSweep 4.8s ease-in-out infinite;
            filter: drop-shadow(0 0 10px rgba(240, 210, 124, 0.12));
          }

          @keyframes goldShimmerSweep {
            0% { background-position: 0% 50%; }
            55% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }

          @media (prefers-reduced-motion: reduce) {
            .gold-shimmer { animation: none; }
          }

          input[type="date"],
          input[type="time"] { color-scheme: dark; }

          input[type="date"]::-webkit-calendar-picker-indicator,
          input[type="time"]::-webkit-calendar-picker-indicator {
            filter: invert(1);
            opacity: 0.9;
            cursor: pointer;
          }
        `}
      </style>

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(800px_520px_at_20%_20%,rgba(200,162,74,0.10),transparent_58%),radial-gradient(900px_560px_at_80%_70%,rgba(255,255,255,0.04),transparent_60%)]" />
      </div>

      <header className="relative z-10 px-6 py-6">
        <Link to="/" className="flex items-center text-gray-400 hover:text-white">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back
        </Link>
      </header>

      <main
        className={`relative z-10 max-w-5xl mx-auto px-6 pb-16 ${
          step === 1 ? '' : 'pt-0'
        }`}
      >
        {/* ✅ Title only on Step 1 */}
        {step === 1 ? (
          <div className="text-center mt-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
              Welcome <span className="gold-shimmer font-extrabold">Transferrable Everything</span>
            </h1>
            <p className="mt-4 text-gray-200 text-lg">Step-by-step media distribution.</p>
          </div>
        ) : (
          <div className="mt-2" />
        )}

        {/* ✅ Step pills: mobile 2 columns (always). Review step NOT shown. */}
        <div
          className={`mt-6 grid gap-3 grid-cols-2 ${
            showTwitterPostsStep ? 'sm:grid-cols-5' : 'sm:grid-cols-4'
          }`}
        >
          <WizardPill
            n={1}
            label="Platforms"
            active={step === 1}
            done={hasAnyPlatform}
            onClick={() => {
              resetSubmitState();
              setStep(1);
            }}
          />
          <WizardPill
            n={2}
            label="Video"
            active={step === 2}
            done={videoReady}
            onClick={() => {
              resetSubmitState();
              if (step > 1) setStep(2);
            }}
          />
          <WizardPill
            n={3}
            label="Captions"
            active={step === 3}
            done={captionsReady}
            onClick={() => {
              resetSubmitState();
              if (step > 2) setStep(3);
            }}
          />
          {showTwitterPostsStep ? (
            <WizardPill
              n={4}
              label="X Posts"
              active={step === 4}
              done={twitterPostsReady}
              onClick={() => {
                resetSubmitState();
                if (step > 3) setStep(4);
              }}
            />
          ) : null}
          <WizardPill
            n={showTwitterPostsStep ? 5 : 4}
            label="Schedule"
            active={step === 5 || step === 6}
            done={scheduleReady}
            onClick={() => {
              resetSubmitState();
              if (step > (showTwitterPostsStep ? 4 : 3)) setStep(5);
            }}
          />
        </div>

        <div className="mt-6 space-y-5">
          {/* STEP 1: Platforms */}
          {step === 1 && (
            <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold">Choose platforms</h3>
                  <p className="text-gray-300 text-sm mt-1">Select the platforms you want to post to.</p>
                </div>
                <div className="text-xs text-white/60">
                  Selected: <span className="font-extrabold text-white">{enabledPlatforms.length}</span>
                </div>
              </div>

              {/* ✅ Always 2-up on mobile */}
              <div className="mt-5 grid gap-3 grid-cols-2">
                {(Object.keys(PLATFORM_META) as PlatformKey[]).map((k) => {
                  const on = selected[k];
                  const meta = PLATFORM_META[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        resetSubmitState();
                        setSelected((prev) => ({ ...prev, [k]: !prev[k] }));
                        if (k === 'twitterPosts' && !selected.twitterPosts) {
                          setTwitterPosts((prev) => (prev.length ? prev : ['', '', '']));
                        }
                      }}
                      className={`rounded-2xl border p-4 sm:p-5 text-left transition ${
                        on
                          ? 'bg-white/10 border-white/15'
                          : 'bg-white/5 border-gray-700/50 hover:bg-white/10 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm sm:text-base font-extrabold truncate">{meta.label}</div>
                          <div className="text-xs sm:text-sm text-white/60 mt-1 truncate">{meta.sub}</div>
                        </div>
                        <div
                          className={`h-6 w-6 rounded-full border flex items-center justify-center ${
                            on ? 'border-green-300/60 bg-green-300/10' : 'border-white/15 bg-transparent'
                          }`}
                        >
                          {on ? <CheckCircle2 className="h-4 w-4 text-green-200" /> : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {!hasAnyPlatform && (
                <div className="text-sm text-red-200 mt-4 inline-flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>Please choose at least one platform to continue.</span>
                </div>
              )}

              <BottomNav />
            </div>
          )}

          {/* STEP 2: Video */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <FileUploadCard
                  title="Upload Video"
                  subtitle={`Max ${prettyBytes(MAX_BYTES)} • MP4/MOV/WebM recommended.`}
                  kind="video"
                  accept="video/*"
                  file={videoFile}
                  setFile={setVideoFile}
                  upload={videoUpload}
                  setUpload={setVideoUpload}
                  required
                />

                <FileUploadCard
                  title="Upload Thumbnail (Optional)"
                  subtitle="Optional. JPG/PNG/WebP recommended."
                  kind="thumbnail"
                  accept="image/*"
                  file={thumbnailFile}
                  setFile={setThumbnailFile}
                  upload={thumbnailUpload}
                  setUpload={setThumbnailUpload}
                />
              </div>

              <BottomNav />
            </div>
          )}

          {/* STEP 3: Captions */}
          {step === 3 && (
            <div className="space-y-5">
              {/* AI panel + audio upload */}
              <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold">Captions</h3>
                    <p className="text-gray-300 text-sm mt-1">
                      Tap a platform to edit it (fullscreen).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetSubmitState();
                      setAiMode((v) => !v);
                      setAiError(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10"
                  >
                    <Sparkles className="h-4 w-4" />
                    {aiMode ? 'Hide AI Options' : 'Generate Using AI'}
                  </button>
                </div>

                {aiMode && (
                  <div className="mt-5 space-y-4">
                    <div className="bg-black/20 border border-white/10 rounded-2xl p-5">
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 sm:items-end">
                        <div className="flex-1">
                          <div className="text-sm font-extrabold">Tone</div>
                          <input
                            value={tone}
                            onChange={(e) => {
                              setTone(e.target.value);
                              resetSubmitState();
                            }}
                            className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                            placeholder="confident, punchy, value-first"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={runAiForCaptions}
                          disabled={aiLoading || audioUpload.status !== 'done'}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            borderColor: 'rgba(214, 178, 94, 0.45)',
                            backgroundColor: 'rgba(0,0,0,0.15)',
                            color: GOLD_HOVER,
                          }}
                        >
                          {aiLoading ? (
                            <>
                              <Loader className="h-4 w-4 animate-spin" />
                              Generating…
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Generate Now
                            </>
                          )}
                        </button>
                      </div>

                      <div className="mt-5">
                        <div className="text-sm font-extrabold">Audio Upload (required for AI)</div>
                        <div className="mt-3">
                          <FileUploadCard
                            title="Upload Audio"
                            subtitle={`Max ${prettyBytes(MAX_BYTES)} • MP3/WAV/M4A recommended.`}
                            kind="audio"
                            accept="audio/*"
                            file={audioFile}
                            setFile={setAudioFile}
                            upload={audioUpload}
                            setUpload={setAudioUpload}
                            required
                          />
                        </div>

                        {aiError && (
                          <div className="text-sm text-red-200 mt-4 inline-flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5" />
                            <span>{aiError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Platform list (no scrolling fields) — exclude Twitter Posts here */}
              <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-extrabold">Selected platforms</div>
                </div>

                {!hasAnyPlatform ? (
                  <div className="text-sm text-red-200 mt-4 inline-flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>No platforms selected. Go back to Step 1.</span>
                  </div>
                ) : (
                  // ✅ Always 2-up on mobile
                  <div className="mt-4 grid gap-3 grid-cols-2">
                    {(enabledPlatforms.filter((k) => k !== 'twitterPosts') as Exclude<
                      PlatformKey,
                      'twitterPosts'
                    >[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setActiveCaptionPlatform(k)}
                        className="rounded-2xl border border-gray-700/50 bg-white/5 hover:bg-white/10 hover:border-white/15 transition p-4 sm:p-5 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-extrabold text-white truncate">{PLATFORM_META[k].label}</div>
                            <div className="text-xs sm:text-sm text-white/60 mt-1 truncate">
                              {getCopyLabel(k)} required
                            </div>
                          </div>
                          <PlatformBadge ok={copyOkForPlatform(k)} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!captionsReady && hasAnyPlatform && (
                  <div className="text-sm text-red-200 mt-4 inline-flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>Fill in required text for each selected platform to continue.</span>
                  </div>
                )}

                <BottomNav nextLabel={showTwitterPostsStep ? 'Next (X Posts)' : 'Next (Schedule)'} />
              </div>

              {/* Fullscreen Caption Modal */}
              <FullscreenModal
                open={Boolean(activeCaptionPlatform)}
                title={
                  activeCaptionPlatform
                    ? `${PLATFORM_META[activeCaptionPlatform].label} — ${getCopyLabel(activeCaptionPlatform)}`
                    : 'Platform'
                }
                subtitle={activeCaptionPlatform ? PLATFORM_META[activeCaptionPlatform].sub : undefined}
                onClose={() => setActiveCaptionPlatform(null)}
              >
                {activeCaptionPlatform && (
                  <div className="space-y-4">
                    {activeCaptionPlatform === 'youtube' ? (
                      <>
                        <div className="text-sm font-extrabold">YouTube Shorts Title</div>
                        <input
                          value={youtubeTitle}
                          onChange={(e) => {
                            setYoutubeTitle(e.target.value);
                            resetSubmitState();
                          }}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                          placeholder="Enter a title…"
                        />
                      </>
                    ) : activeCaptionPlatform === 'linkedin' ? (
                      <>
                        <div className="text-sm font-extrabold">LinkedIn Text</div>
                        <textarea
                          value={linkedinText}
                          onChange={(e) => {
                            setLinkedinText(e.target.value);
                            resetSubmitState();
                          }}
                          rows={12}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                          placeholder="Write your post…"
                        />
                      </>
                    ) : activeCaptionPlatform === 'twitterVideo' ? (
                      <>
                        <div className="text-sm font-extrabold">Twitter/X (Video) Text</div>
                        <textarea
                          value={twitterVideoText}
                          onChange={(e) => {
                            setTwitterVideoText(e.target.value);
                            resetSubmitState();
                          }}
                          rows={10}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                          placeholder="Write your post…"
                        />
                      </>
                    ) : activeCaptionPlatform === 'instagram' ? (
                      <>
                        <div className="text-sm font-extrabold">Instagram Caption</div>
                        <textarea
                          value={captionInstagram}
                          onChange={(e) => {
                            setCaptionInstagram(e.target.value);
                            resetSubmitState();
                          }}
                          rows={12}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                          placeholder="Write your caption…"
                        />
                      </>
                    ) : activeCaptionPlatform === 'tiktok' ? (
                      <>
                        <div className="text-sm font-extrabold">TikTok Caption</div>
                        <textarea
                          value={captionTikTok}
                          onChange={(e) => {
                            setCaptionTikTok(e.target.value);
                            resetSubmitState();
                          }}
                          rows={10}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                          placeholder="Write your caption…"
                        />
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-extrabold">Facebook Caption</div>
                        <textarea
                          value={captionFacebook}
                          onChange={(e) => {
                            setCaptionFacebook(e.target.value);
                            resetSubmitState();
                          }}
                          rows={12}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                          placeholder="Write your caption…"
                        />
                      </>
                    )}
                    <div className="pt-2 text-xs text-white/50">
                      Close this when you’re done, then tap the next platform.
                    </div>
                  </div>
                )}
              </FullscreenModal>
            </div>
          )}

          {/* STEP 4: Twitter/X Posts (only when selected) */}
          {step === 4 && showTwitterPostsStep && (
            <div className="space-y-5">
              <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold">Twitter/X Posts</h3>
                    <p className="text-gray-300 text-sm mt-1">
                      Generate or write standalone posts. Tap a post to edit fullscreen.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetSubmitState();
                        setAiMode((v) => !v);
                        setAiError(null);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10"
                    >
                      <Sparkles className="h-4 w-4" />
                      {aiMode ? 'Hide AI Options' : 'Generate Using AI'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        resetSubmitState();
                        setTwitterPosts((prev) => [...prev, '']);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </button>
                  </div>
                </div>

                {aiMode && (
                  <div className="mt-5 space-y-4">
                    <div className="bg-black/20 border border-white/10 rounded-2xl p-5">
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 sm:items-end">
                        <div className="flex-1">
                          <div className="text-sm font-extrabold">Tone</div>
                          <input
                            value={tone}
                            onChange={(e) => {
                              setTone(e.target.value);
                              resetSubmitState();
                            }}
                            className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                            placeholder="confident, punchy, value-first"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={runAiForTwitterPosts}
                          disabled={aiLoading || audioUpload.status !== 'done'}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            borderColor: 'rgba(214, 178, 94, 0.45)',
                            backgroundColor: 'rgba(0,0,0,0.15)',
                            color: GOLD_HOVER,
                          }}
                        >
                          {aiLoading ? (
                            <>
                              <Loader className="h-4 w-4 animate-spin" />
                              Generating…
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Generate Now
                            </>
                          )}
                        </button>
                      </div>

                      <div className="mt-5">
                        <div className="text-sm font-extrabold">Audio Upload (required for AI)</div>
                        <div className="mt-3">
                          <FileUploadCard
                            title="Upload Audio"
                            subtitle={`Max ${prettyBytes(MAX_BYTES)} • MP3/WAV/M4A recommended.`}
                            kind="audio"
                            accept="audio/*"
                            file={audioFile}
                            setFile={setAudioFile}
                            upload={audioUpload}
                            setUpload={setAudioUpload}
                            required
                          />
                        </div>

                        {aiError && (
                          <div className="text-sm text-red-200 mt-4 inline-flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5" />
                            <span>{aiError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ✅ Post list 2-up on mobile */}
              <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-extrabold">Your posts</div>
                  <div className="text-xs text-white/60">
                    Ready:{' '}
                    <span className="font-extrabold text-white">
                      {twitterPosts.map((t) => t.trim()).filter(Boolean).length}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 grid-cols-2">
                  {twitterPosts.map((t, i) => {
                    const ok = t.trim().length > 0;
                    const preview = t.trim() ? t.trim() : 'Tap to write this post…';
                    return (
                      <div
                        key={i}
                        className="rounded-2xl border border-gray-700/50 bg-white/5 hover:bg-white/10 hover:border-white/15 transition p-4 sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setActiveTweetIndex(i)}
                            className="text-left flex-1 min-w-0"
                          >
                            <div className="font-extrabold text-white">Post {i + 1}</div>
                            <div className="text-sm text-white/70 mt-1 line-clamp-3">{preview}</div>
                          </button>

                          <div className="flex flex-col items-end gap-2">
                            <PlatformBadge ok={ok} />
                            <button
                              type="button"
                              onClick={() => {
                                resetSubmitState();
                                setTwitterPosts((prev) => prev.filter((_, idx) => idx !== i));
                              }}
                              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10"
                              title="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!twitterPostsReady && (
                  <div className="text-sm text-red-200 mt-4 inline-flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>Add at least 1 post to continue.</span>
                  </div>
                )}

                <BottomNav nextLabel="Next (Schedule)" />
              </div>

              {/* Fullscreen Tweet Editor */}
              <FullscreenModal
                open={activeTweetIndex !== null}
                title={
                  activeTweetIndex !== null ? `Twitter/X Post ${activeTweetIndex + 1}` : 'Twitter/X Post'
                }
                subtitle="Write the full post. Keep it punchy."
                onClose={() => setActiveTweetIndex(null)}
              >
                {activeTweetIndex !== null && (
                  <div className="space-y-4">
                    <textarea
                      value={twitterPosts[activeTweetIndex] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        resetSubmitState();
                        setTwitterPosts((prev) => {
                          const next = [...prev];
                          next[activeTweetIndex] = v;
                          return next;
                        });
                      }}
                      rows={14}
                      className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                      placeholder="Write your post…"
                    />
                    <div className="text-xs text-white/50">
                      Close when done, then tap the next post.
                    </div>
                  </div>
                )}
              </FullscreenModal>
            </div>
          )}

          {/* STEP 5: Schedule (Next goes to Review) */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                <h3 className="text-lg font-extrabold">Scheduling mode</h3>

                {/* ✅ 2-up on mobile */}
                <div className="mt-4 grid gap-3 grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetSubmitState();
                      setScheduleMode('same');
                    }}
                    className={`rounded-2xl border p-4 sm:p-5 text-left transition ${
                      scheduleMode === 'same'
                        ? 'bg-white/10 border-white/15'
                        : 'bg-white/5 border-gray-700/50 hover:bg-white/10 hover:border-white/15'
                    }`}
                  >
                    <div className="font-extrabold">Same time</div>
                    <div className="text-xs text-white/60 mt-1">Schedule all platforms together</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetSubmitState();
                      setScheduleMode('different');
                    }}
                    className={`rounded-2xl border p-4 sm:p-5 text-left transition ${
                      scheduleMode === 'different'
                        ? 'bg-white/10 border-white/15'
                        : 'bg-white/5 border-gray-700/50 hover:bg-white/10 hover:border-white/15'
                    }`}
                  >
                    <div className="font-extrabold">Different times</div>
                    <div className="text-xs text-white/60 mt-1">Set date/time per platform</div>
                  </button>
                </div>
              </div>

              {scheduleMode === 'same' ? (
                <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                  <h3 className="text-lg font-extrabold">Schedule (ET)</h3>

                  {/* ✅ 2-up on mobile */}
                  <div className="mt-5 grid gap-4 grid-cols-2">
                    <div>
                      <div className="text-sm font-bold">Date</div>
                      <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5">
                        <Calendar className="h-4 w-4 text-white" />
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => {
                            setScheduleDate(e.target.value);
                            resetSubmitState();
                          }}
                          className="w-full bg-transparent text-sm text-white outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-bold">Time</div>
                      <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5">
                        <Clock className="h-4 w-4 text-white" />
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => {
                            setScheduleTime(e.target.value);
                            resetSubmitState();
                          }}
                          className="w-full bg-transparent text-sm text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-white/80">
                    {scheduleCommonInfo.ok ? (
                      <>
                        Scheduled for <span className="font-extrabold">{scheduleCommonInfo.etDisplay}</span>
                      </>
                    ) : (
                      <span className="text-white/60">{scheduleCommonInfo.message}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Platform list for schedule (tap -> fullscreen modal) */}
                  <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-extrabold">Schedule per platform (ET)</div>
                      <div className="text-xs text-white/60">
                        Selected:{' '}
                        <span className="font-extrabold text-white">{enabledPlatforms.length}</span>
                      </div>
                    </div>

                    {!hasAnyPlatform ? (
                      <div className="text-sm text-red-200 mt-4 inline-flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <span>No platforms selected. Go back to Step 1.</span>
                      </div>
                    ) : (
                      // ✅ 2-up on mobile
                      <div className="mt-4 grid gap-3 grid-cols-2">
                        {enabledPlatforms.map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setActiveSchedulePlatform(k)}
                            className="rounded-2xl border border-gray-700/50 bg-white/5 hover:bg-white/10 hover:border-white/15 transition p-4 sm:p-5 text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-extrabold text-white truncate">{PLATFORM_META[k].label}</div>
                                <div className="text-xs sm:text-sm text-white/60 mt-1 truncate">
                                  Tap to set date/time
                                </div>
                              </div>
                              <PlatformBadge ok={scheduleInfoByPlatform[k].ok} />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!scheduleReady && hasAnyPlatform && (
                      <div className="text-sm text-red-200 mt-4 inline-flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <span>Set a date/time for each selected platform to continue.</span>
                      </div>
                    )}
                  </div>

                  {/* Fullscreen Schedule Modal */}
                  <FullscreenModal
                    open={Boolean(activeSchedulePlatform)}
                    title={
                      activeSchedulePlatform
                        ? `${PLATFORM_META[activeSchedulePlatform].label} — Schedule (ET)`
                        : 'Schedule'
                    }
                    onClose={() => setActiveSchedulePlatform(null)}
                  >
                    {activeSchedulePlatform && (
                      <div className="space-y-5">
                        {/* ✅ 2-up on mobile */}
                        <div className="grid gap-4 grid-cols-2">
                          <div>
                            <div className="text-sm font-bold">Date</div>
                            <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5">
                              <Calendar className="h-4 w-4 text-white" />
                              <input
                                type="date"
                                value={scheduleByPlatform[activeSchedulePlatform].date}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  resetSubmitState();
                                  setScheduleByPlatform((prev) => ({
                                    ...prev,
                                    [activeSchedulePlatform]: {
                                      ...prev[activeSchedulePlatform],
                                      date: v,
                                    },
                                  }));
                                }}
                                className="w-full bg-transparent text-sm text-white outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-bold">Time</div>
                            <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5">
                              <Clock className="h-4 w-4 text-white" />
                              <input
                                type="time"
                                value={scheduleByPlatform[activeSchedulePlatform].time}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  resetSubmitState();
                                  setScheduleByPlatform((prev) => ({
                                    ...prev,
                                    [activeSchedulePlatform]: {
                                      ...prev[activeSchedulePlatform],
                                      time: v,
                                    },
                                  }));
                                }}
                                className="w-full bg-transparent text-sm text-white outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="text-sm text-white/80">
                          {scheduleInfoByPlatform[activeSchedulePlatform].ok ? (
                            <>
                              Scheduled for{' '}
                              <span className="font-extrabold">
                                {scheduleInfoByPlatform[activeSchedulePlatform].etDisplay}
                              </span>
                            </>
                          ) : (
                            <span className="text-white/60">
                              {scheduleInfoByPlatform[activeSchedulePlatform].message}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-white/50">
                          Close when done, then tap the next platform.
                        </div>
                      </div>
                    )}
                  </FullscreenModal>
                </div>
              )}

              <BottomNav nextLabel="Next (Review)" />
            </div>
          )}

          {/* STEP 6: REVIEW (not in step pills) */}
          {step === 6 && (
            <div className="space-y-5">
              <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                <h3 className="text-lg font-extrabold">Review</h3>
                <p className="text-gray-300 text-sm mt-1">
                  Double-check everything before submitting.
                </p>
              </div>

              {/* ✅ Review cards 2-up on mobile */}
              <div className="grid gap-4 grid-cols-2">
                <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 font-extrabold">
                    <FileText className="h-4 w-4" />
                    Platforms
                  </div>
                  <div className="mt-3 text-sm text-white/80">
                    {enabledPlatforms.length ? (
                      <div className="flex flex-wrap gap-2">
                        {enabledPlatforms.map((k) => (
                          <span
                            key={k}
                            className="px-3 py-1 rounded-xl border border-white/10 bg-white/5 text-xs font-extrabold"
                          >
                            {PLATFORM_META[k].label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-white/50">None selected</div>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 font-extrabold">
                    <Video className="h-4 w-4" />
                    Video
                  </div>
                  <div className="mt-3 text-sm text-white/80">
                    {videoUpload.status === 'done' ? (
                      <>
                        <div className="text-white/90 font-bold truncate">{videoUpload.fileName}</div>
                        <div className="text-white/60 text-xs mt-1">{prettyBytes(videoUpload.size)}</div>
                      </>
                    ) : (
                      <div className="text-white/50">Missing</div>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 font-extrabold">
                    <Mic className="h-4 w-4" />
                    Audio (AI)
                  </div>
                  <div className="mt-3 text-sm text-white/80">
                    {audioUpload.status === 'done' ? (
                      <>
                        <div className="text-white/90 font-bold truncate">{audioUpload.fileName}</div>
                        <div className="text-white/60 text-xs mt-1">{prettyBytes(audioUpload.size)}</div>
                      </>
                    ) : (
                      <div className="text-white/50">Not uploaded</div>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 font-extrabold">
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </div>
                  <div className="mt-3 text-sm text-white/80">
                    {scheduleReady ? (
                      <div className="text-white/90 font-bold">
                        {scheduleMode === 'same' && scheduleCommonInfo.ok
                          ? scheduleCommonInfo.etDisplay
                          : 'Per platform'}
                      </div>
                    ) : (
                      <div className="text-white/50">Missing</div>
                    )}
                    <div className="text-xs text-white/60 mt-1">Timezone: ET</div>
                  </div>
                </div>
              </div>

              {/* Per-platform details */}
              <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                <div className="text-lg font-extrabold">Per-platform details</div>

                {/* ✅ 2-up on mobile */}
                <div className="mt-4 grid gap-3 grid-cols-2">
                  {(Object.keys(PLATFORM_META) as PlatformKey[])
                    .filter((k) => selected[k])
                    .map((k) => {
                      const meta = PLATFORM_META[k];
                      const scheduleTxt = scheduleSummaryForPlatform(k);

                      const copy =
                        k === 'instagram'
                          ? captionInstagram
                          : k === 'tiktok'
                            ? captionTikTok
                            : k === 'facebook'
                              ? captionFacebook
                              : k === 'youtube'
                                ? youtubeTitle
                                : k === 'twitterVideo'
                                  ? twitterVideoText
                                  : k === 'linkedin'
                                    ? linkedinText
                                    : '';

                      const posts =
                        k === 'twitterPosts'
                          ? twitterPosts.map((t) => t.trim()).filter(Boolean)
                          : [];

                      const okCopy =
                        k === 'twitterPosts'
                          ? posts.length >= 1
                          : meta.kind === 'title' || meta.kind === 'caption' || meta.kind === 'text'
                            ? String(copy || '').trim().length > 0
                            : true;

                      return (
                        <div
                          key={k}
                          className="rounded-2xl border border-gray-700/50 bg-white/5 p-4 sm:p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-extrabold text-white truncate">{meta.label}</div>
                              <div className="text-xs text-white/60 mt-1 truncate">{scheduleTxt}</div>
                            </div>
                            <PlatformBadge ok={okCopy && scheduleInfoByPlatform[k]?.ok === true} />
                          </div>

                          <div className="mt-3 text-xs text-white/60">Copy</div>
                          {k === 'twitterPosts' ? (
                            <div className="mt-2 space-y-2">
                              {posts.length ? (
                                posts.slice(0, 3).map((p, idx) => (
                                  <div
                                    key={idx}
                                    className="rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white/80"
                                  >
                                    {p}
                                  </div>
                                ))
                              ) : (
                                <div className="text-white/50 text-sm">No posts added</div>
                              )}
                              {posts.length > 3 ? (
                                <div className="text-xs text-white/50">+ {posts.length - 3} more…</div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="mt-2 rounded-xl border border-white/10 bg-black/25 p-3 text-sm text-white/80 line-clamp-5">
                              {String(copy || '').trim() ? copy : 'Missing'}
                            </div>
                          )}

                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                resetSubmitState();
                                if (k === 'twitterPosts') setStep(4);
                                else setActiveCaptionPlatform(k as Exclude<PlatformKey, 'twitterPosts'>);
                              }}
                              className="rounded-xl px-4 py-2 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                resetSubmitState();
                                setStep(5);
                                setActiveSchedulePlatform(k);
                              }}
                              className="rounded-xl px-4 py-2 font-extrabold border border-white/10 bg-white/5 hover:bg-white/10"
                            >
                              Schedule
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Submit status */}
              {submitOk && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
                  <div className="flex items-start gap-2 text-green-100">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-300" />
                    <div>
                      <div className="font-extrabold">Submitted successfully.</div>
                      <div className="text-sm text-green-100/80">
                        Your package was sent to the automation webhook.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {submitError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                  <div className="flex items-start gap-2 text-red-100">
                    <AlertCircle className="h-5 w-5 mt-0.5 text-red-300" />
                    <div className="text-sm">{submitError}</div>
                  </div>
                </div>
              )}

              <SlideToSubmit
                disabled={!reviewReadyToSubmit}
                loading={submitting}
                success={submitOk}
                onSubmit={submitWebhook}
              />

              <BottomNav hideNext />
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