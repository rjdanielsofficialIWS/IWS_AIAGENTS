import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Type,
  X,
  Sparkles,
  Copy,
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

type AiBundle = {
  transcript?: string;
  transcriptSummary?: string;
  tweets?: string[];
  captions?: {
    instagram?: string[];
    facebook?: string[];
    tiktok?: string[];
  };
  youtubeTitles?: string[];
  best?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtubeTitle?: string;
  };
};

export function MediaDistributionPage() {
  // ✅ Match HomePage / Demo background “glow motion”
  const [bgOffset, setBgOffset] = useState(0);

  // Files
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  // Upload states
  const [videoUpload, setVideoUpload] = useState<UploadState>({ status: 'idle' });
  const [audioUpload, setAudioUpload] = useState<UploadState>({ status: 'idle' });
  const [thumbnailUpload, setThumbnailUpload] = useState<UploadState>({ status: 'idle' });

  // Metadata fields
  const [captionInstagram, setCaptionInstagram] = useState('');
  const [captionFacebook, setCaptionFacebook] = useState('');
  const [captionTikTok, setCaptionTikTok] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');

  // Scheduling (ET / America/New_York)
  const [scheduleDate, setScheduleDate] = useState(''); // YYYY-MM-DD
  const [scheduleTime, setScheduleTime] = useState(''); // HH:mm

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

  // UX: full-screen step modals
  const [openStep, setOpenStep] = useState<'uploads' | 'captions' | 'schedule' | null>(null);

  // AI states (Option B)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiTone, setAiTone] = useState('confident, punchy, value-first');
  const [aiBundle, setAiBundle] = useState<AiBundle>({});

  // ✅ Same scroll offset behavior
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

  const prettyBytes = (bytes: number) => {
    if (!bytes || bytes < 1) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const sizeGuard = (file: File, kind: MediaKind) => {
    if (file.size > MAX_BYTES) {
      const label = kind === 'video' ? 'Video' : kind === 'audio' ? 'Audio' : 'Thumbnail image';
      return `${label} is too large (${prettyBytes(file.size)}). Max allowed is ${prettyBytes(
        MAX_BYTES
      )}. Please compress and try again.`;
    }
    return null;
  };

  const getPublicOrSignedUrl = async (path: string) => {
    // ✅ Public URL if bucket is public
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub?.data?.publicUrl;

    if (publicUrl) return publicUrl;

    // ✅ Signed URL fallback if bucket is private
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed to create signed URL');
    return data.signedUrl;
  };

  const uploadFile = async (file: File, kind: MediaKind, setState: (s: UploadState) => void) => {
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

      if (upErr) {
        const raw = upErr.message || 'Upload failed';
        throw new Error(raw);
      }

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

  // ---- Scheduling helpers (ET / America/New_York) ----
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
    if (!dateStr || !timeStr) return { ok: false, message: 'Please choose a schedule date and time (ET).' };

    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    const t = /^(\d{2}):(\d{2})$/.exec(timeStr);
    if (!m || !t) return { ok: false, message: 'Invalid date/time format.' };

    const y = Number(m[1]);
    const mo = Number(m[2]);
    const da = Number(m[3]);
    const hh = Number(t[1]);
    const mm = Number(t[2]);

    if (
      y < 2000 ||
      mo < 1 ||
      mo > 12 ||
      da < 1 ||
      da > 31 ||
      hh < 0 ||
      hh > 23 ||
      mm < 0 ||
      mm > 59
    ) {
      return { ok: false, message: 'Please enter a valid schedule date/time.' };
    }

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
    const etAsIfUtc = Date.UTC(etParts.year, etParts.month - 1, etParts.day, etParts.hour, etParts.minute, etParts.second);
    const offsetMinutes = Math.round((etAsIfUtc - utcDate.getTime()) / 60000); // -300 or -240
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

  const scheduleInfo: ScheduleInfo = useMemo(() => {
    return toUtcFromEtLocal(scheduleDate, scheduleTime);
  }, [scheduleDate, scheduleTime]);

  const captionsOk = useMemo(() => {
    const anyCaption =
      captionInstagram.trim().length > 0 ||
      captionFacebook.trim().length > 0 ||
      captionTikTok.trim().length > 0;
    return anyCaption;
  }, [captionInstagram, captionFacebook, captionTikTok]);

  const uploadsComplete = useMemo(() => {
    return (
      videoUpload.status === 'done' &&
      audioUpload.status === 'done' &&
      thumbnailUpload.status === 'done'
    );
  }, [videoUpload.status, audioUpload.status, thumbnailUpload.status]);

  const captionsComplete = useMemo(() => {
    return captionsOk && youtubeTitle.trim().length > 0;
  }, [captionsOk, youtubeTitle]);

  const scheduleComplete = useMemo(() => {
    return scheduleInfo.ok;
  }, [scheduleInfo]);

  const canSubmit = useMemo(() => {
    return (
      !submitting &&
      videoUpload.status === 'done' &&
      audioUpload.status === 'done' &&
      thumbnailUpload.status === 'done' &&
      Boolean(WEBHOOK_URL) &&
      captionsOk &&
      youtubeTitle.trim().length > 0 &&
      scheduleInfo.ok
    );
  }, [
    submitting,
    videoUpload.status,
    audioUpload.status,
    thumbnailUpload.status,
    captionsOk,
    youtubeTitle,
    scheduleInfo,
  ]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  // ✅ Option B: Call Supabase Edge Function -> Transcribe + Generate
  const generateFromAudioAI = async () => {
    resetSubmitState();
    setAiError(null);

    if (audioUpload.status !== 'done') {
      setAiError('Upload audio first, then generate.');
      return;
    }

    setAiLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('content-ai', {
        body: {
          audioUrl: audioUpload.url,
          tone: aiTone,
          platforms: ['twitter', 'instagram', 'tiktok', 'facebook', 'youtube'],
        },
      });

      if (error) throw new Error(error.message || 'AI generation failed.');

      const bundle: AiBundle = data || {};
      setAiBundle(bundle);

      // Autofill “best” picks if provided
      if (bundle?.best?.instagram) setCaptionInstagram(bundle.best.instagram);
      if (bundle?.best?.facebook) setCaptionFacebook(bundle.best.facebook);
      if (bundle?.best?.tiktok) setCaptionTikTok(bundle.best.tiktok);
      if (bundle?.best?.youtubeTitle) setYoutubeTitle(bundle.best.youtubeTitle);

      // If no “best”, fall back to first suggestions
      if (!bundle?.best?.instagram && bundle?.captions?.instagram?.[0]) setCaptionInstagram(bundle.captions.instagram[0]);
      if (!bundle?.best?.facebook && bundle?.captions?.facebook?.[0]) setCaptionFacebook(bundle.captions.facebook[0]);
      if (!bundle?.best?.tiktok && bundle?.captions?.tiktok?.[0]) setCaptionTikTok(bundle.captions.tiktok[0]);
      if (!bundle?.best?.youtubeTitle && bundle?.youtubeTitles?.[0]) setYoutubeTitle(bundle.youtubeTitles[0]);
    } catch (e: any) {
      setAiError(e?.message || 'AI generation failed.');
    } finally {
      setAiLoading(false);
    }
  };

  // ✅ Send as text/plain to avoid CORS preflight issues
  const submitWebhook = async () => {
    if (
      videoUpload.status !== 'done' ||
      audioUpload.status !== 'done' ||
      thumbnailUpload.status !== 'done'
    )
      return;

    if (!captionsOk) {
      setSubmitError('Please enter at least one caption (Instagram, Facebook, or TikTok).');
      return;
    }

    if (!youtubeTitle.trim()) {
      setSubmitError('Please enter a YouTube Shorts title.');
      return;
    }

    if (!scheduleInfo.ok) {
      setSubmitError(scheduleInfo.message);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(false);

    try {
      const payload = {
        source: 'media-distribution-landing',
        brand: 'Transferrable Everything',
        submittedAt: new Date().toISOString(),

        assets: {
          video: {
            url: videoUpload.url,
            storagePath: videoUpload.path,
            fileName: videoUpload.fileName,
            mime: videoUpload.mime,
            size: videoUpload.size,
          },
          audio: {
            url: audioUpload.url,
            storagePath: audioUpload.path,
            fileName: audioUpload.fileName,
            mime: audioUpload.mime,
            size: audioUpload.size,
          },
          thumbnail: {
            url: thumbnailUpload.url,
            storagePath: thumbnailUpload.path,
            fileName: thumbnailUpload.fileName,
            mime: thumbnailUpload.mime,
            size: thumbnailUpload.size,
          },
        },

        copy: {
          captions: {
            instagram: captionInstagram,
            facebook: captionFacebook,
            tiktok: captionTikTok,
          },
          youtubeShortsTitle: youtubeTitle,
        },

        scheduling: {
          inputTimezone: TZ_ET,
          utcIso: scheduleInfo.utcIso,
          unixSeconds: scheduleInfo.unixSeconds,
          unixMillis: scheduleInfo.unixMillis,
          rfc3339WithOffset: scheduleInfo.rfc3339WithOffset,
          etDisplay: scheduleInfo.etDisplay,
          requestedLocal: {
            date: scheduleDate,
            time: scheduleTime,
          },
        },

        platformNotes: {
          youtube: 'Use scheduling.rfc3339WithOffset (publishAt) or scheduling.utcIso (RFC3339).',
          meta: 'Instagram/Facebook often expect scheduled_publish_time as UNIX seconds (UTC) → use scheduling.unixSeconds.',
          tiktok:
            'If API expects schedule_time in seconds, use scheduling.unixSeconds; if expects ISO/RFC3339, use scheduling.utcIso.',
        },
      };

      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(
          `Webhook failed (${res.status}). ${text ? `Response: ${text}` : ''}`.trim()
        );
      }

      setSubmitOk(true);
    } catch (e: any) {
      setSubmitError(e?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
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
      {/* ✅ Gold shimmer + white date/time icons */}
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

          /* Make native date/time picker icons white */
          input[type="date"],
          input[type="time"] {
            color-scheme: dark;
          }
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

      <main className="relative z-10 max-w-3xl mx-auto px-6 pb-16">
        <div className="text-center mt-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            Welcome <span className="gold-shimmer font-extrabold">Transferrable Everything</span>
          </h1>
          <p className="mt-4 text-gray-200 text-lg">
            Click each step to complete it. Only the 3 steps are shown.
          </p>
        </div>

        {/* ✅ ONLY 3 boxes */}
        <div className="mt-10 space-y-4">
          <button
            type="button"
            onClick={() => setOpenStep('uploads')}
            className="w-full text-left bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)] hover:bg-white/10 transition"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <UploadCloud className="h-5 w-5" style={{ color: GOLD_PRIMARY }} />
                <div>
                  <div className="text-xl font-bold">Uploads</div>
                  <div className="text-sm text-gray-300">Video • Audio • Thumbnail</div>
                </div>
              </div>
              <div className="text-sm">
                {uploadsComplete ? (
                  <span className="inline-flex items-center gap-2 text-green-200">
                    <CheckCircle2 className="h-4 w-4" />
                    Complete
                  </span>
                ) : (
                  <span className="text-gray-300">Open</span>
                )}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setOpenStep('captions')}
            className="w-full text-left bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)] hover:bg-white/10 transition"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Type className="h-5 w-5" style={{ color: GOLD_PRIMARY }} />
                <div>
                  <div className="text-xl font-bold">Captions</div>
                  <div className="text-sm text-gray-300">IG • FB • TikTok + YouTube Title</div>
                </div>
              </div>
              <div className="text-sm">
                {captionsComplete ? (
                  <span className="inline-flex items-center gap-2 text-green-200">
                    <CheckCircle2 className="h-4 w-4" />
                    Complete
                  </span>
                ) : (
                  <span className="text-gray-300">Open</span>
                )}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setOpenStep('schedule')}
            className="w-full text-left bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)] hover:bg-white/10 transition"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5" style={{ color: GOLD_PRIMARY }} />
                <div>
                  <div className="text-xl font-bold">Schedule</div>
                  <div className="text-sm text-gray-300">Date + Time (ET) • Submit</div>
                </div>
              </div>
              <div className="text-sm">
                {scheduleComplete ? (
                  <span className="inline-flex items-center gap-2 text-green-200">
                    <CheckCircle2 className="h-4 w-4" />
                    Complete
                  </span>
                ) : (
                  <span className="text-gray-300">Open</span>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* ✅ Full-screen modal */}
        {openStep !== null && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpenStep(null)} />

            <div className="absolute inset-0 p-4 sm:p-8">
              <div className="h-full w-full rounded-3xl border border-gray-700/50 bg-[#0b0b0b]/95 shadow-[0_20px_120px_rgba(0,0,0,0.85)] overflow-hidden">
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between px-5 sm:px-8 py-5 border-b border-gray-700/40">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl flex items-center justify-center bg-white/5 border border-gray-700/40">
                        {openStep === 'uploads' && <UploadCloud className="h-5 w-5" style={{ color: GOLD_PRIMARY }} />}
                        {openStep === 'captions' && <Type className="h-5 w-5" style={{ color: GOLD_PRIMARY }} />}
                        {openStep === 'schedule' && <Calendar className="h-5 w-5" style={{ color: GOLD_PRIMARY }} />}
                      </div>

                      <div>
                        <div className="text-xl font-extrabold">
                          {openStep === 'uploads' && 'Uploads'}
                          {openStep === 'captions' && 'Captions (with AI)'}
                          {openStep === 'schedule' && 'Schedule & Submit'}
                        </div>
                        <div className="text-sm text-gray-300">
                          {openStep === 'uploads' && 'Upload your video, audio, and thumbnail.'}
                          {openStep === 'captions' && 'Write captions manually or generate from the audio transcript.'}
                          {openStep === 'schedule' && 'Pick ET date/time and submit to your distribution workflow.'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpenStep(null)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-700/60 bg-white/5 hover:bg-white/10 transition"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                      <span className="text-sm font-semibold">Close</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
                    {/* ---------------- UPLOADS MODAL ---------------- */}
                    {openStep === 'uploads' && (
                      <div className="grid gap-5">
                        {/* Video */}
                        <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h2 className="text-xl font-bold">1) Upload Video</h2>
                              <p className="text-gray-300 text-sm mt-1">Max {prettyBytes(MAX_BYTES)}.</p>
                            </div>
                            {videoUpload.status === 'done' && (
                              <div className="flex items-center gap-2 text-sm text-green-200">
                                <CheckCircle2 className="h-4 w-4" /> Uploaded
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                            <input
                              type="file"
                              accept="video/*"
                              className="block w-full text-sm text-gray-200 file:mr-4 file:rounded-xl file:border-0 file:px-4 file:py-2 file:font-bold file:bg-white file:text-black hover:file:bg-gray-100"
                              onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                setVideoFile(f);
                                setVideoUpload({ status: 'idle' });
                                resetSubmitState();
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => videoFile && uploadFile(videoFile, 'video', setVideoUpload)}
                              disabled={!videoFile || videoUpload.status === 'uploading'}
                              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold transition disabled:opacity-50 disabled:cursor-not-allowed border"
                              style={{
                                borderColor: GOLD_PRIMARY,
                                background:
                                  videoUpload.status === 'uploading'
                                    ? 'rgba(214,178,94,0.12)'
                                    : 'rgba(255,255,255,0.04)',
                              }}
                            >
                              {videoUpload.status === 'uploading' ? (
                                <>
                                  <Loader className="h-4 w-4 animate-spin" /> Uploading...
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="h-4 w-4" /> Upload
                                </>
                              )}
                            </button>
                          </div>

                          {videoUpload.status === 'error' && (
                            <div className="mt-3 text-sm text-red-200 inline-flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 mt-0.5" />
                              <span>{videoUpload.message}</span>
                            </div>
                          )}
                        </div>

                        {/* Audio */}
                        <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h2 className="text-xl font-bold">2) Upload Audio</h2>
                              <p className="text-gray-300 text-sm mt-1">Max {prettyBytes(MAX_BYTES)}.</p>
                            </div>
                            {audioUpload.status === 'done' && (
                              <div className="flex items-center gap-2 text-sm text-green-200">
                                <CheckCircle2 className="h-4 w-4" /> Uploaded
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                            <input
                              type="file"
                              accept="audio/*"
                              className="block w-full text-sm text-gray-200 file:mr-4 file:rounded-xl file:border-0 file:px-4 file:py-2 file:font-bold file:bg-white file:text-black hover:file:bg-gray-100"
                              onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                setAudioFile(f);
                                setAudioUpload({ status: 'idle' });
                                resetSubmitState();
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => audioFile && uploadFile(audioFile, 'audio', setAudioUpload)}
                              disabled={!audioFile || audioUpload.status === 'uploading'}
                              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold transition disabled:opacity-50 disabled:cursor-not-allowed border"
                              style={{
                                borderColor: GOLD_PRIMARY,
                                background:
                                  audioUpload.status === 'uploading'
                                    ? 'rgba(214,178,94,0.12)'
                                    : 'rgba(255,255,255,0.04)',
                              }}
                            >
                              {audioUpload.status === 'uploading' ? (
                                <>
                                  <Loader className="h-4 w-4 animate-spin" /> Uploading...
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="h-4 w-4" /> Upload
                                </>
                              )}
                            </button>
                          </div>

                          {audioUpload.status === 'error' && (
                            <div className="mt-3 text-sm text-red-200 inline-flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 mt-0.5" />
                              <span>{audioUpload.message}</span>
                            </div>
                          )}
                        </div>

                        {/* Thumbnail */}
                        <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h2 className="text-xl font-bold">3) Upload Thumbnail</h2>
                              <p className="text-gray-300 text-sm mt-1">Max {prettyBytes(MAX_BYTES)}.</p>
                            </div>
                            {thumbnailUpload.status === 'done' && (
                              <div className="flex items-center gap-2 text-sm text-green-200">
                                <CheckCircle2 className="h-4 w-4" /> Uploaded
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                            <input
                              type="file"
                              accept="image/*"
                              className="block w-full text-sm text-gray-200 file:mr-4 file:rounded-xl file:border-0 file:px-4 file:py-2 file:font-bold file:bg-white file:text-black hover:file:bg-gray-100"
                              onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                setThumbnailFile(f);
                                setThumbnailUpload({ status: 'idle' });
                                resetSubmitState();
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => thumbnailFile && uploadFile(thumbnailFile, 'thumbnail', setThumbnailUpload)}
                              disabled={!thumbnailFile || thumbnailUpload.status === 'uploading'}
                              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold transition disabled:opacity-50 disabled:cursor-not-allowed border"
                              style={{
                                borderColor: GOLD_PRIMARY,
                                background:
                                  thumbnailUpload.status === 'uploading'
                                    ? 'rgba(214,178,94,0.12)'
                                    : 'rgba(255,255,255,0.04)',
                              }}
                            >
                              {thumbnailUpload.status === 'uploading' ? (
                                <>
                                  <Loader className="h-4 w-4 animate-spin" /> Uploading...
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="h-4 w-4" /> Upload
                                </>
                              )}
                            </button>
                          </div>

                          {thumbnailUpload.status === 'error' && (
                            <div className="mt-3 text-sm text-red-200 inline-flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 mt-0.5" />
                              <span>{thumbnailUpload.message}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => setOpenStep(null)}
                            disabled={!uploadsComplete}
                            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              borderColor: uploadsComplete ? GOLD_PRIMARY : 'rgba(148,163,184,0.35)',
                              background: uploadsComplete ? 'rgba(214,178,94,0.12)' : 'rgba(255,255,255,0.04)',
                              color: uploadsComplete ? '#fff' : 'rgba(226,232,240,0.7)',
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Finish Uploads
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ---------------- CAPTIONS MODAL ---------------- */}
                    {openStep === 'captions' && (
                      <div className="grid gap-5">
                        {/* AI Generator */}
                        <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h2 className="text-xl font-bold">Generate from Audio (AI)</h2>
                              <p className="text-gray-300 text-sm mt-1">
                                Uses your uploaded audio → transcript → tweets + captions + titles.
                              </p>
                            </div>
                            <div className="text-xs text-gray-400">
                              {audioUpload.status === 'done' ? 'Audio ready' : 'Upload audio first'}
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-sm font-semibold text-gray-200 mb-2">Tone</label>
                              <input
                                value={aiTone}
                                onChange={(e) => setAiTone(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#D6B25E]/50 focus:border-[#D6B25E] transition-all"
                                placeholder="confident, punchy, value-first"
                              />
                            </div>

                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={generateFromAudioAI}
                                disabled={aiLoading || audioUpload.status !== 'done'}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                  borderColor: GOLD_PRIMARY,
                                  background: 'rgba(214,178,94,0.12)',
                                }}
                              >
                                {aiLoading ? (
                                  <>
                                    <Loader className="h-4 w-4 animate-spin" /> Generating...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-4 w-4" /> Generate
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {aiError && (
                            <div className="mt-4 text-sm text-red-200 inline-flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 mt-0.5" />
                              <span>{aiError}</span>
                            </div>
                          )}

                          {(aiBundle?.transcriptSummary || aiBundle?.transcript) && (
                            <div className="mt-5 bg-black/30 border border-gray-700/50 rounded-2xl p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-gray-200">Transcript</div>
                                <button
                                  type="button"
                                  onClick={() => aiBundle.transcript && copyToClipboard(aiBundle.transcript)}
                                  className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-gray-700/60 bg-white/5 hover:bg-white/10 transition"
                                >
                                  <Copy className="h-3 w-3" /> Copy
                                </button>
                              </div>
                              {aiBundle.transcriptSummary && (
                                <div className="mt-2 text-sm text-gray-200">
                                  <span className="text-gray-400">Summary:</span> {aiBundle.transcriptSummary}
                                </div>
                              )}
                              {aiBundle.transcript && (
                                <div className="mt-3 text-xs text-gray-300 whitespace-pre-wrap max-h-40 overflow-auto">
                                  {aiBundle.transcript}
                                </div>
                              )}
                            </div>
                          )}

                          {Array.isArray(aiBundle?.tweets) && aiBundle.tweets.length > 0 && (
                            <div className="mt-5 bg-black/30 border border-gray-700/50 rounded-2xl p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-gray-200">Tweet Ideas</div>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(aiBundle.tweets!.join('\n\n'))}
                                  className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-gray-700/60 bg-white/5 hover:bg-white/10 transition"
                                >
                                  <Copy className="h-3 w-3" /> Copy All
                                </button>
                              </div>
                              <div className="mt-3 grid gap-2">
                                {aiBundle.tweets.slice(0, 10).map((t, idx) => (
                                  <div key={idx} className="text-sm text-gray-200 bg-white/5 border border-gray-700/40 rounded-xl p-3">
                                    {t}
                                  </div>
                                ))}
                                {aiBundle.tweets.length > 10 && (
                                  <div className="text-xs text-gray-400">
                                    Showing 10 of {aiBundle.tweets.length}. Copy all to get the full list.
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Manual / Autofilled Captions */}
                        <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                          <h2 className="text-xl font-bold">Captions + YouTube Title</h2>
                          <p className="text-gray-300 text-sm mt-1">
                            Manually edit (or let AI fill these in).
                          </p>

                          <div className="mt-5 grid gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-200 mb-2">Instagram Caption</label>
                              <textarea
                                value={captionInstagram}
                                onChange={(e) => {
                                  setCaptionInstagram(e.target.value);
                                  resetSubmitState();
                                }}
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#D6B25E]/50 focus:border-[#D6B25E] transition-all"
                                placeholder="Write your IG caption..."
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-200 mb-2">Facebook Caption</label>
                              <textarea
                                value={captionFacebook}
                                onChange={(e) => {
                                  setCaptionFacebook(e.target.value);
                                  resetSubmitState();
                                }}
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#D6B25E]/50 focus:border-[#D6B25E] transition-all"
                                placeholder="Write your FB caption..."
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-200 mb-2">TikTok Caption</label>
                              <textarea
                                value={captionTikTok}
                                onChange={(e) => {
                                  setCaptionTikTok(e.target.value);
                                  resetSubmitState();
                                }}
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#D6B25E]/50 focus:border-[#D6B25E] transition-all"
                                placeholder="Write your TikTok caption..."
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-200 mb-2">YouTube Title</label>
                              <input
                                value={youtubeTitle}
                                onChange={(e) => {
                                  setYoutubeTitle(e.target.value);
                                  resetSubmitState();
                                }}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#D6B25E]/50 focus:border-[#D6B25E] transition-all"
                                placeholder="Enter your YouTube title..."
                              />
                            </div>
                          </div>

                          {!captionsOk && (
                            <div className="mt-4 text-sm text-red-200 inline-flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 mt-0.5" />
                              <span>Please enter at least one caption to submit.</span>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => setOpenStep(null)}
                            disabled={!captionsComplete}
                            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              borderColor: captionsComplete ? GOLD_PRIMARY : 'rgba(148,163,184,0.35)',
                              background: captionsComplete ? 'rgba(214,178,94,0.12)' : 'rgba(255,255,255,0.04)',
                              color: captionsComplete ? '#fff' : 'rgba(226,232,240,0.7)',
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Finish Captions
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ---------------- SCHEDULE MODAL ---------------- */}
                    {openStep === 'schedule' && (
                      <div className="grid gap-5">
                        <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                          <h2 className="text-xl font-bold">Content Scheduling</h2>
                          <p className="text-gray-300 text-sm mt-1">
                            Choose date & time in <span className="font-semibold">Eastern Time (ET)</span>.
                          </p>

                          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-200 mb-2">Date (ET)</label>
                              <input
                                type="date"
                                value={scheduleDate}
                                onChange={(e) => {
                                  setScheduleDate(e.target.value);
                                  resetSubmitState();
                                }}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#D6B25E]/50 focus:border-[#D6B25E] transition-all"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-200 mb-2">Time (ET)</label>
                              <input
                                type="time"
                                value={scheduleTime}
                                onChange={(e) => {
                                  setScheduleTime(e.target.value);
                                  resetSubmitState();
                                }}
                                step={60}
                                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#D6B25E]/50 focus:border-[#D6B25E] transition-all"
                              />
                            </div>
                          </div>

                          {scheduleInfo.ok ? (
                            <div className="mt-4 text-sm text-gray-200">
                              <div className="flex flex-wrap gap-2">
                                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-gray-700/50">
                                  ET: <span className="font-semibold">{scheduleInfo.etDisplay}</span>
                                </span>
                                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-gray-700/50">
                                  RFC3339: <span className="font-mono text-xs">{scheduleInfo.rfc3339WithOffset}</span>
                                </span>
                                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-gray-700/50">
                                  UTC: <span className="font-mono text-xs">{scheduleInfo.utcIso}</span>
                                </span>
                                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-gray-700/50">
                                  Unix: <span className="font-mono text-xs">{scheduleInfo.unixSeconds}</span>
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4 text-sm text-red-200 inline-flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 mt-0.5" />
                              <span>{scheduleInfo.message}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex flex-col items-center gap-3">
                          <button
                            type="button"
                            onClick={submitWebhook}
                            disabled={!canSubmit}
                            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              borderColor: canSubmit ? GOLD_PRIMARY : 'rgba(148,163,184,0.35)',
                              background: canSubmit ? 'rgba(214,178,94,0.12)' : 'rgba(255,255,255,0.04)',
                              color: canSubmit ? '#fff' : 'rgba(226,232,240,0.7)',
                            }}
                          >
                            {submitting ? (
                              <>
                                <Loader className="h-4 w-4 animate-spin" /> Submitting...
                              </>
                            ) : submitOk ? (
                              <>
                                <CheckCircle2 className="h-4 w-4" /> Submitted
                              </>
                            ) : (
                              <>
                                <UploadCloud className="h-4 w-4" /> Submit to Distribute
                              </>
                            )}
                          </button>

                          {submitError && (
                            <div className="text-sm text-red-200 inline-flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" /> {submitError}
                            </div>
                          )}

                          <div className="text-xs text-gray-400 text-center max-w-md">
                            Page stays clean — only the 3 step boxes show outside this modal.
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => setOpenStep(null)}
                            disabled={!scheduleComplete}
                            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              borderColor: scheduleComplete ? GOLD_PRIMARY : 'rgba(148,163,184,0.35)',
                              background: scheduleComplete ? 'rgba(214,178,94,0.12)' : 'rgba(255,255,255,0.04)',
                              color: scheduleComplete ? '#fff' : 'rgba(226,232,240,0.7)',
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Finish Schedule
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-5 sm:px-8 py-4 border-t border-gray-700/40 text-sm text-gray-400">
                    Tip: Click outside to close. Finish buttons lock completion.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}