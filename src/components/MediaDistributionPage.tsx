import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Calendar,
  Clock,
} from 'lucide-react';
import { supabase } from '../services/vapiAI';

const GOLD_PRIMARY = '#D6B25E';
const GOLD_HOVER = '#F0D27C';

const WEBHOOK_URL =
  'https://iwsaiagents.app.n8n.cloud/webhook-test/f8390721-73cc-4594-921c-3afff87774c0';

const BUCKET = 'media';
const MAX_BYTES = 49 * 1024 * 1024; // 49MB
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

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // ✅ lock background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // click outside closes
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* ✅ The key: top-anchored, safe padding, scrollable overlay */}
      <div className="h-full w-full overflow-y-auto p-4 sm:p-6">
        {/* ✅ items-start so top never gets cut off */}
        <div className="mx-auto w-full max-w-4xl">
          {/* ✅ max height ensures it fits on screen; internal scroll handles overflow */}
          <div className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-700/50 bg-[#0b0b0b] shadow-[0_10px_80px_rgba(0,0,0,0.75)] sm:max-h-[calc(100vh-3rem)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="text-lg font-extrabold text-white">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ✅ Internal content scrolls */}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>

            {/* ✅ Optional tiny bottom padding so last element isn't flush */}
            <div className="h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

function prettyBytes(bytes: number) {
  if (!bytes || bytes < 1) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function MediaDistributionPage() {
  const [bgOffset, setBgOffset] = useState(0);
  const [openStep, setOpenStep] = useState<null | 'uploads' | 'captions' | 'schedule'>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [videoUpload, setVideoUpload] = useState<UploadState>({ status: 'idle' });
  const [audioUpload, setAudioUpload] = useState<UploadState>({ status: 'idle' });
  const [thumbnailUpload, setThumbnailUpload] = useState<UploadState>({ status: 'idle' });

  const [captionInstagram, setCaptionInstagram] = useState('');
  const [captionFacebook, setCaptionFacebook] = useState('');
  const [captionTikTok, setCaptionTikTok] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');

  const [tone, setTone] = useState('confident, punchy, value-first');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [tweetIdeas, setTweetIdeas] = useState<string[]>([]);
  const [ytTitleIdeas, setYtTitleIdeas] = useState<string[]>([]);

  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

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
      return { ok: false, message: 'Please choose a schedule date and time (ET).' };
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

  const scheduleInfo: ScheduleInfo = useMemo(() => {
    return toUtcFromEtLocal(scheduleDate, scheduleTime);
  }, [scheduleDate, scheduleTime]);

  const captionsOk = useMemo(() => {
    return (
      captionInstagram.trim().length > 0 ||
      captionFacebook.trim().length > 0 ||
      captionTikTok.trim().length > 0
    );
  }, [captionInstagram, captionFacebook, captionTikTok]);

  const uploadsComplete =
    videoUpload.status === 'done' &&
    audioUpload.status === 'done' &&
    thumbnailUpload.status === 'done';

  const captionsComplete = captionsOk && youtubeTitle.trim().length > 0;
  const scheduleComplete = scheduleInfo.ok;

  const canSubmit = useMemo(() => {
    return (
      !submitting &&
      uploadsComplete &&
      Boolean(WEBHOOK_URL) &&
      captionsOk &&
      youtubeTitle.trim().length > 0 &&
      scheduleInfo.ok
    );
  }, [submitting, uploadsComplete, captionsOk, youtubeTitle, scheduleInfo]);

  const runAi = async () => {
    setAiError(null);
    resetSubmitState();

    if (audioUpload.status !== 'done') {
      setAiError('Upload your audio first (Uploads step).');
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-ai', {
        body: { audioUrl: audioUpload.url, tone },
      });

      if (error) {
        throw new Error((error as any)?.context?.body?.details || error.message || 'AI generation failed.');
      }

      const res = data as AiGenResponse;

      if (res?.best?.instagram) setCaptionInstagram(res.best.instagram);
      if (res?.best?.facebook) setCaptionFacebook(res.best.facebook);
      if (res?.best?.tiktok) setCaptionTikTok(res.best.tiktok);
      if (res?.best?.youtubeTitle) setYoutubeTitle(res.best.youtubeTitle);

      setTweetIdeas(Array.isArray(res?.tweets) ? res.tweets : []);
      setYtTitleIdeas(Array.isArray(res?.youtubeTitles) ? res.youtubeTitles : []);
    } catch (e: any) {
      setAiError(e?.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

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
          tone,
        },
        scheduling: {
          inputTimezone: TZ_ET,
          utcIso: scheduleInfo.utcIso,
          unixSeconds: scheduleInfo.unixSeconds,
          unixMillis: scheduleInfo.unixMillis,
          rfc3339WithOffset: scheduleInfo.rfc3339WithOffset,
          etDisplay: scheduleInfo.etDisplay,
          requestedLocal: { date: scheduleDate, time: scheduleTime },
        },
      };

      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => '');
      if (!res.ok) throw new Error(`Webhook failed (${res.status}). ${text ? `Response: ${text}` : ''}`.trim());

      setSubmitOk(true);
      setOpenStep(null);
    } catch (e: any) {
      setSubmitError(e?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const StepBox = ({
    title,
    desc,
    done,
    onClick,
  }: {
    title: string;
    desc: string;
    done: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 text-left shadow-[0_10px_60px_rgba(0,0,0,0.6)] hover:bg-white/10 transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold">{title}</h2>
          <p className="mt-1 text-gray-300 text-sm">{desc}</p>
        </div>

        {done ? (
          <div className="flex items-center gap-2 text-sm text-green-200">
            <CheckCircle2 className="h-5 w-5" />
            Done
          </div>
        ) : (
          <div className="h-6 w-6 rounded-full border border-white/15" />
        )}
      </div>
    </button>
  );

  const UploadBlock = ({
    title,
    subtitle,
    kind,
    accept,
    file,
    setFile,
    upload,
    setUpload,
  }: {
    title: string;
    subtitle: string;
    kind: MediaKind;
    accept: string;
    file: File | null;
    setFile: (f: File | null) => void;
    upload: UploadState;
    setUpload: (s: UploadState) => void;
  }) => (
    <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold">{title}</h3>
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

      <main className="relative z-10 max-w-3xl mx-auto px-6 pb-16">
        <div className="text-center mt-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            Welcome <span className="gold-shimmer font-extrabold">Transferrable Everything</span>
          </h1>

          <p className="mt-4 text-gray-200 text-lg">
            Only 3 steps. Click a box to open a full-screen card, complete it, then move to the next.
          </p>
        </div>

        <div className="mt-10 grid gap-5">
          <StepBox
            title="Uploads"
            desc="Upload video + audio + thumbnail. (Max 49MB each)"
            done={uploadsComplete}
            onClick={() => setOpenStep('uploads')}
          />

          <StepBox
            title="Captions"
            desc="Write platform captions + YouTube title (or generate with AI)."
            done={captionsComplete}
            onClick={() => setOpenStep('captions')}
          />

          <StepBox
            title="Schedule"
            desc="Choose date/time (ET) and submit to your distribution workflow."
            done={scheduleComplete && submitOk}
            onClick={() => setOpenStep('schedule')}
          />
        </div>

        {submitOk && (
          <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-2 text-green-100">
              <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-300" />
              <div>
                <div className="font-extrabold">Scheduled successfully.</div>
                <div className="text-sm text-green-100/80">
                  Your content package was submitted to the automation webhook.
                </div>
              </div>
            </div>
          </div>
        )}

        {submitError && (
          <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-2 text-red-100">
              <AlertCircle className="h-5 w-5 mt-0.5 text-red-300" />
              <div className="text-sm">{submitError}</div>
            </div>
          </div>
        )}
      </main>

      {/* Uploads */}
      {openStep === 'uploads' && (
        <ModalShell title="Uploads" onClose={() => setOpenStep(null)}>
          <div className="space-y-5">
            <UploadBlock
              title="Upload Video"
              subtitle={`Max ${prettyBytes(MAX_BYTES)} • MP4/MOV/WebM recommended.`}
              kind="video"
              accept="video/*"
              file={videoFile}
              setFile={setVideoFile}
              upload={videoUpload}
              setUpload={setVideoUpload}
            />

            <UploadBlock
              title="Upload Audio"
              subtitle={`Max ${prettyBytes(MAX_BYTES)} • MP3/WAV/M4A recommended.`}
              kind="audio"
              accept="audio/*"
              file={audioFile}
              setFile={setAudioFile}
              upload={audioUpload}
              setUpload={setAudioUpload}
            />

            <UploadBlock
              title="Upload Thumbnail"
              subtitle="JPG/PNG/WebP recommended. Generates a shareable link."
              kind="thumbnail"
              accept="image/*"
              file={thumbnailFile}
              setFile={setThumbnailFile}
              upload={thumbnailUpload}
              setUpload={setThumbnailUpload}
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setOpenStep(null)}
                className="rounded-xl px-5 py-2.5 font-bold border border-white/10 bg-white/5 hover:bg-white/10"
              >
                Done
              </button>

              <div className="text-xs text-white/60">Upload all 3 before generating captions.</div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Captions */}
      {openStep === 'captions' && (
        <ModalShell title="Captions & Titles" onClose={() => setOpenStep(null)}>
          <div className="space-y-5">
            <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <div className="text-sm font-extrabold">Tone</div>
                  <div className="text-xs text-white/60 mt-1">
                    Examples: Alex Hormozi • Gary Vee • Luxury • Professional • Casual
                  </div>
                  <input
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                    placeholder="confident, punchy, value-first"
                  />
                </div>

                <button
                  type="button"
                  onClick={runAi}
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
                      Generate (AI)
                    </>
                  )}
                </button>
              </div>

              {aiError && (
                <div className="text-sm text-red-200 mt-4 inline-flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>{aiError}</span>
                </div>
              )}

              <div className="mt-4 text-xs text-white/60">
                Platform-specific writing rules are enforced (IG vs TikTok vs FB vs YouTube).
              </div>
            </div>

            <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
              <h3 className="text-lg font-extrabold">Captions</h3>
              <p className="text-gray-300 text-sm mt-1">
                Enter captions manually or generate them. At least one caption is required.
              </p>

              <div className="mt-5 grid gap-4">
                <div>
                  <div className="text-sm font-bold">Instagram Caption</div>
                  <textarea
                    value={captionInstagram}
                    onChange={(e) => {
                      setCaptionInstagram(e.target.value);
                      resetSubmitState();
                    }}
                    rows={5}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                    placeholder="Paste Instagram caption here…"
                  />
                </div>

                <div>
                  <div className="text-sm font-bold">Facebook Caption</div>
                  <textarea
                    value={captionFacebook}
                    onChange={(e) => {
                      setCaptionFacebook(e.target.value);
                      resetSubmitState();
                    }}
                    rows={5}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                    placeholder="Paste Facebook caption here…"
                  />
                </div>

                <div>
                  <div className="text-sm font-bold">TikTok Caption</div>
                  <textarea
                    value={captionTikTok}
                    onChange={(e) => {
                      setCaptionTikTok(e.target.value);
                      resetSubmitState();
                    }}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/20"
                    placeholder="Paste TikTok caption here…"
                  />
                </div>

                <div>
                  <div className="text-sm font-bold">YouTube Shorts Title</div>
                  <input
                    value={youtubeTitle}
                    onChange={(e) => {
                      setYoutubeTitle(e.target.value);
                      resetSubmitState();
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                    placeholder="Enter YouTube Shorts title…"
                  />
                </div>
              </div>
            </div>

            {(tweetIdeas.length > 0 || ytTitleIdeas.length > 0) && (
              <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                <h3 className="text-lg font-extrabold">Extra Ideas (Optional)</h3>

                {tweetIdeas.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-bold">Tweet Ideas</div>
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-white/80">
                      {tweetIdeas.slice(0, 10).map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {ytTitleIdeas.length > 0 && (
                  <div className="mt-5">
                    <div className="text-sm font-bold">YouTube Title Ideas</div>
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-white/80">
                      {ytTitleIdeas.slice(0, 8).map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setOpenStep(null)}
                className="rounded-xl px-5 py-2.5 font-bold border border-white/10 bg-white/5 hover:bg-white/10"
              >
                Done
              </button>
              <div className="text-xs text-white/60">Tip: Use a persona name like “Alex Hormozi”.</div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Schedule */}
      {openStep === 'schedule' && (
        <ModalShell title="Schedule & Submit" onClose={() => setOpenStep(null)}>
          <div className="space-y-5">
            <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
              <h3 className="text-lg font-extrabold">Schedule (ET)</h3>
              <p className="text-gray-300 text-sm mt-1">Choose a date and time in Eastern Time.</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                {scheduleInfo.ok ? (
                  <>
                    Scheduled for <span className="font-extrabold">{scheduleInfo.etDisplay}</span>
                  </>
                ) : (
                  <span className="text-white/60">{scheduleInfo.message}</span>
                )}
              </div>
            </div>

            <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
              <h3 className="text-lg font-extrabold">Ready Check</h3>

              <div className="mt-4 space-y-2 text-sm text-white/80">
                <div className="flex items-center justify-between">
                  <span>Uploads</span>
                  {uploadsComplete ? <span className="text-green-200">Done</span> : <span className="text-white/50">Missing</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span>Captions + Title</span>
                  {captionsComplete ? <span className="text-green-200">Done</span> : <span className="text-white/50">Missing</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span>Schedule</span>
                  {scheduleInfo.ok ? <span className="text-green-200">Done</span> : <span className="text-white/50">Missing</span>}
                </div>
              </div>

              <button
                type="button"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-xl font-extrabold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: 'rgba(214, 178, 94, 0.45)',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  color: GOLD_HOVER,
                }}
                disabled={!canSubmit}
                onClick={submitWebhook}
              >
                {submitting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit to Distribution'
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setOpenStep(null)}
                className="rounded-xl px-5 py-2.5 font-bold border border-white/10 bg-white/5 hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      <div className="relative mt-10 pb-10 text-center text-xs text-white/40">
        Powered by Infinite Wealth Solutions AI.
      </div>
    </div>
  );
}