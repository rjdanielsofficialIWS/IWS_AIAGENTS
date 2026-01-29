import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
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
      // Human-readable
      etDisplay: string; // e.g. Jan 25, 2026, 2:30 PM ET
      // API-ready formats
      rfc3339WithOffset: string; // e.g. 2026-01-25T14:30:00-05:00 (YouTube-friendly)
      utcIso: string; // e.g. 2026-01-25T19:30:00.000Z
      unixSeconds: number; // e.g. 1769369400 (Meta-friendly)
      unixMillis: number; // useful for tooling
    }
  | { ok: false; message: string };

export function MediaDistributionPage() {
  // ✅ Match HomePage / Demo background “glow motion”
  const [bgOffset, setBgOffset] = useState(0);

  // Stepper (horizontal slide)
  const [step, setStep] = useState(0);

  // Files
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  // Upload states
  const [videoUpload, setVideoUpload] = useState<UploadState>({ status: 'idle' });
  const [audioUpload, setAudioUpload] = useState<UploadState>({ status: 'idle' });
  const [thumbnailUpload, setThumbnailUpload] = useState<UploadState>({
    status: 'idle',
  });

  // Metadata fields
  const [captionInstagram, setCaptionInstagram] = useState('');
  const [captionFacebook, setCaptionFacebook] = useState('');
  const [captionTikTok, setCaptionTikTok] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');

  // Scheduling (ET / America/New_York)
  const [scheduleDate, setScheduleDate] = useState(''); // YYYY-MM-DD
  const [scheduleTime, setScheduleTime] = useState(''); // HH:mm (24h)

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let raf: number | null = null;

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        setBgOffset(Math.min(520, y * 0.65));
        raf = null;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

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
    // ✅ Public URL if bucket is public
    const publicRes = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = publicRes?.data?.publicUrl;

    // If publicUrl exists, return it (even if bucket is private, this may still be set,
    // but it won't work. We'll fallback to signed URL if it fails.)
    if (publicUrl) {
      // try a light HEAD check
      try {
        const head = await fetch(publicUrl, { method: 'HEAD' });
        if (head.ok) return publicUrl;
      } catch {
        // ignore
      }
    }

    // ✅ Signed URL fallback (private bucket)
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    if (signed.error || !signed.data?.signedUrl) {
      throw new Error(signed.error?.message || 'Could not create signed URL');
    }
    return signed.data.signedUrl;
  };

  const uploadFile = async (file: File, kind: MediaKind, setState: (s: UploadState) => void) => {
    try {
      const guard = sizeGuard(file, kind);
      if (guard) {
        setState({ status: 'error', message: guard });
        return;
      }

      setState({ status: 'uploading' });

      const safeName = file.name.replace(/\s+/g, '-');
      const path = `${kind}/${Date.now()}-${safeName}`;

      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

      if (error) throw error;

      const url = await getPublicOrSignedUrl(path);

      setState({
        status: 'done',
        path,
        url,
        fileName: file.name,
        mime: file.type || 'application/octet-stream',
        size: file.size,
      });
    } catch (e: any) {
      setState({
        status: 'error',
        message: e?.message || 'Upload failed',
      });
    }
  };

  const TZ_ET = 'America/New_York' as const;

  const toUtcFromEtLocal = (dateStr: string, timeStr: string): ScheduleInfo => {
    if (!dateStr || !timeStr) {
      return { ok: false, message: 'Please choose both a date and time.' };
    }

    // Validate formats lightly
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return { ok: false, message: 'Date must be in YYYY-MM-DD format.' };
    }
    if (!/^\d{2}:\d{2}$/.test(timeStr)) {
      return { ok: false, message: 'Time must be in HH:mm format.' };
    }

    const [y, m, d] = dateStr.split('-').map((x) => Number(x));
    const [hh, mm] = timeStr.split(':').map((x) => Number(x));

    if (
      !Number.isFinite(y) ||
      !Number.isFinite(m) ||
      !Number.isFinite(d) ||
      !Number.isFinite(hh) ||
      !Number.isFinite(mm)
    ) {
      return { ok: false, message: 'Invalid date or time.' };
    }

    // Create a Date representing the same wall-clock time in ET by using Intl to compute offset.
    // Approach:
    // 1) Start with a UTC date guess for the supplied wall-clock.
    // 2) Compute what that UTC date renders as in ET; difference = offset.
    // 3) Adjust UTC date by that difference to align wall-clock with ET.
    const guessUtc = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));

    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ_ET,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = fmt.formatToParts(guessUtc);
    const get = (type: string) => parts.find((p) => p.type === type)?.value;

    const etYear = Number(get('year'));
    const etMonth = Number(get('month'));
    const etDay = Number(get('day'));
    const etHour = Number(get('hour'));
    const etMinute = Number(get('minute'));

    // If the rendered ET components differ from desired, compute delta in minutes and adjust.
    const desiredUtcForEtWallClock = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
    const renderedEtAsUtc = new Date(Date.UTC(etYear, etMonth - 1, etDay, etHour, etMinute, 0));

    const deltaMs = desiredUtcForEtWallClock.getTime() - renderedEtAsUtc.getTime();
    const utcDate = new Date(guessUtc.getTime() + deltaMs);

    // Build ET display string (human-friendly)
    const etDisplay = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ_ET,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(utcDate);

    // RFC3339 with offset (YouTube scheduled publish expects local time offset)
    const etFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ_ET,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const etParts = etFmt.formatToParts(utcDate);
    const et = (t: string) => etParts.find((p) => p.type === t)?.value || '00';

    const etY = et('year');
    const etMo = et('month');
    const etDa = et('day');
    const etH = et('hour');
    const etMi = et('minute');
    const etS = et('second');

    // compute ET offset at that moment
    const utcMillis = utcDate.getTime();
    const utcAsEt = new Date(
      Date.UTC(Number(etY), Number(etMo) - 1, Number(etDa), Number(etH), Number(etMi), Number(etS))
    );
    const offsetMs = utcAsEt.getTime() - utcMillis;

    const offsetTotalMinutes = Math.round(offsetMs / 60000);
    const sign = offsetTotalMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetTotalMinutes);
    const offH = String(Math.floor(abs / 60)).padStart(2, '0');
    const offM = String(abs % 60).padStart(2, '0');

    const rfc3339WithOffset = `${etY}-${etMo}-${etDa}T${etH}:${etMi}:${etS}${sign}${offH}:${offM}`;

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

  const progressPct = useMemo(() => {
    const done = [uploadsComplete, captionsComplete, scheduleComplete].filter(Boolean).length;
    return Math.round((done / 3) * 100);
  }, [uploadsComplete, captionsComplete, scheduleComplete]);

  const steps = useMemo(
    () => [
      { key: 'uploads', label: 'Uploads', done: uploadsComplete },
      { key: 'captions', label: 'Captions', done: captionsComplete },
      { key: 'schedule', label: 'Schedule', done: scheduleComplete },
      { key: 'review', label: 'Review', done: false },
    ],
    [uploadsComplete, captionsComplete, scheduleComplete]
  );

  const goToStep = (idx: number) => {
    // Only allow jumping forward if prerequisites are satisfied
    if (idx <= step) return setStep(idx);

    if (idx === 1 && uploadsComplete) return setStep(1);
    if (idx === 2 && uploadsComplete && captionsComplete) return setStep(2);
    if (idx === 3 && uploadsComplete && captionsComplete && scheduleComplete) return setStep(3);
  };

  const submitWebhook = async () => {
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setSubmitOk(false);
      setSubmitError(null);

      const payload = {
        video: videoUpload.status === 'done' ? videoUpload.url : null,
        audio: audioUpload.status === 'done' ? audioUpload.url : null,
        thumbnail: thumbnailUpload.status === 'done' ? thumbnailUpload.url : null,
        captions: {
          instagram: captionInstagram.trim(),
          facebook: captionFacebook.trim(),
          tiktok: captionTikTok.trim(),
        },
        youtube: {
          title: youtubeTitle.trim(),
        },
        schedule: scheduleInfo.ok
          ? {
              timezone: scheduleInfo.timezone,
              etDisplay: scheduleInfo.etDisplay,
              rfc3339WithOffset: scheduleInfo.rfc3339WithOffset,
              utcIso: scheduleInfo.utcIso,
              unixSeconds: scheduleInfo.unixSeconds,
              unixMillis: scheduleInfo.unixMillis,
            }
          : null,
      };

      // ✅ Send as text/plain to avoid extra preflight noise
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          // ✅ avoids OPTIONS preflight in many cases
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(`Webhook failed (${res.status}). ${text ? `Response: ${text}` : ''}`.trim());
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
      {/* ✅ Gold shimmer animation */}
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

          /* Make native date/time picker icons white (Chrome/Safari/Edge) */
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

      {/* ✅ Same overlay glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(800px_520px_at_20%_20%,rgba(200,162,74,0.10),transparent_58%),radial-gradient(900px_560px_at_80%_70%,rgba(255,255,255,0.04),transparent_60%)]" />
      </div>

      <header className="relative z-10 px-6 py-6">
        <Link to="/" className="flex items-center text-gray-400 hover:text-white">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back
        </Link>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 pb-16">
        <div className="text-center mt-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            Media <span className="gold-shimmer font-extrabold">Distribution</span>
          </h1>

          <p className="mt-4 text-gray-200 text-lg">
            Complete each step to upload, caption, schedule, and distribute your content.
          </p>
        </div>

        {/* Progress */}
        <div className="mt-10 bg-white/5 border border-gray-700/50 rounded-2xl p-5 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-gray-200">
              Progress:{' '}
              <span className="font-bold" style={{ color: GOLD_HOVER }}>
                {progressPct}%
              </span>
            </div>

            <div className="text-xs text-gray-400">
              Step {step + 1} of {steps.length}
            </div>
          </div>

          <div className="mt-3 h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${GOLD_PRIMARY}, ${GOLD_HOVER})`,
              }}
            />
          </div>

          {/* Step pills */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {steps.map((s, idx) => {
              const isActive = idx === step;
              const isDone = idx < 3 ? s.done : uploadsComplete && captionsComplete && scheduleComplete;
              const isLocked =
                (idx === 1 && !uploadsComplete) ||
                (idx === 2 && (!uploadsComplete || !captionsComplete)) ||
                (idx === 3 && (!uploadsComplete || !captionsComplete || !scheduleComplete));

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => goToStep(idx)}
                  disabled={isLocked}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    isActive
                      ? 'bg-white/10 border-[#D6B25E]/60'
                      : 'bg-black/10 border-gray-700/50 hover:bg-white/5'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-gray-100">
                      {idx + 1}. {s.label}
                    </div>
                    {isDone ? <CheckCircle2 className="h-4 w-4 text-green-200" /> : null}
                  </div>

                  <div className="mt-1 text-[11px] text-gray-400">
                    {idx === 0 && (uploadsComplete ? 'Ready' : 'Upload 3 files')}
                    {idx === 1 && (captionsComplete ? 'Ready' : 'Add captions + title')}
                    {idx === 2 && (scheduleComplete ? 'Ready' : 'Pick date & time')}
                    {idx === 3 && (canSubmit ? 'Ready to submit' : 'Review + submit')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Slider */}
        <div className="mt-6 overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${step * 100}%)` }}
          >
            {/* Step 1: Uploads */}
            <div className="w-full flex-shrink-0">
              <div className="mt-6 grid gap-5">
                {/* Video */}
                <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">Upload Video</h2>
                      <p className="text-gray-300 text-sm mt-1">
                        Max {prettyBytes(MAX_BYTES)} • MP4/MOV/WebM recommended.
                      </p>
                    </div>

                    {videoUpload.status === 'done' && (
                      <div className="flex items-center gap-2 text-sm text-green-200">
                        <CheckCircle2 className="h-4 w-4" />
                        Uploaded
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

                        if (f) {
                          const msg = sizeGuard(f, 'video');
                          if (msg) setVideoUpload({ status: 'error', message: msg });
                        }
                      }}
                    />

                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition border"
                      style={{
                        borderColor: 'rgba(214, 178, 94, 0.55)',
                        color: GOLD_HOVER,
                        backgroundColor: 'rgba(0,0,0,0.10)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(240, 210, 124, 0.75)';
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(214, 178, 94, 0.55)';
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.10)';
                      }}
                      disabled={!videoFile || videoUpload.status === 'uploading'}
                      onClick={() => {
                        if (!videoFile) return;
                        resetSubmitState();
                        uploadFile(videoFile, 'video', setVideoUpload);
                      }}
                    >
                      {videoUpload.status === 'uploading' ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4 w-4" />
                          Upload Video
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4">
                    {videoUpload.status === 'done' && (
                      <div className="text-sm text-gray-200">
                        <div className="text-gray-300">
                          <span className="font-semibold">File:</span> {videoUpload.fileName} •{' '}
                          {prettyBytes(videoUpload.size)}
                        </div>
                        <div className="mt-1 break-all">
                          <span className="font-semibold">URL:</span>{' '}
                          <a className="underline" href={videoUpload.url} target="_blank" rel="noreferrer">
                            {videoUpload.url}
                          </a>
                        </div>
                      </div>
                    )}
                    {videoUpload.status === 'error' && (
                      <div className="text-sm text-red-200 mt-2 inline-flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <span>{videoUpload.message}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audio */}
                <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">Upload Audio</h2>
                      <p className="text-gray-300 text-sm mt-1">
                        Max {prettyBytes(MAX_BYTES)} • MP3/WAV/M4A recommended.
                      </p>
                    </div>

                    {audioUpload.status === 'done' && (
                      <div className="flex items-center gap-2 text-sm text-green-200">
                        <CheckCircle2 className="h-4 w-4" />
                        Uploaded
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

                        if (f) {
                          const msg = sizeGuard(f, 'audio');
                          if (msg) setAudioUpload({ status: 'error', message: msg });
                        }
                      }}
                    />

                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition border"
                      style={{
                        borderColor: 'rgba(214, 178, 94, 0.55)',
                        color: GOLD_HOVER,
                        backgroundColor: 'rgba(0,0,0,0.10)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(240, 210, 124, 0.75)';
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(214, 178, 94, 0.55)';
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.10)';
                      }}
                      disabled={!audioFile || audioUpload.status === 'uploading'}
                      onClick={() => {
                        if (!audioFile) return;
                        resetSubmitState();
                        uploadFile(audioFile, 'audio', setAudioUpload);
                      }}
                    >
                      {audioUpload.status === 'uploading' ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4 w-4" />
                          Upload Audio
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4">
                    {audioUpload.status === 'done' && (
                      <div className="text-sm text-gray-200">
                        <div className="text-gray-300">
                          <span className="font-semibold">File:</span> {audioUpload.fileName} •{' '}
                          {prettyBytes(audioUpload.size)}
                        </div>
                        <div className="mt-1 break-all">
                          <span className="font-semibold">URL:</span>{' '}
                          <a className="underline" href={audioUpload.url} target="_blank" rel="noreferrer">
                            {audioUpload.url}
                          </a>
                        </div>
                      </div>
                    )}
                    {audioUpload.status === 'error' && (
                      <div className="text-sm text-red-200 mt-2 inline-flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <span>{audioUpload.message}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">Upload Thumbnail</h2>
                      <p className="text-gray-300 text-sm mt-1">
                        Max {prettyBytes(MAX_BYTES)} • JPG/PNG recommended.
                      </p>
                    </div>

                    {thumbnailUpload.status === 'done' && (
                      <div className="flex items-center gap-2 text-sm text-green-200">
                        <CheckCircle2 className="h-4 w-4" />
                        Uploaded
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

                        if (f) {
                          const msg = sizeGuard(f, 'thumbnail');
                          if (msg) setThumbnailUpload({ status: 'error', message: msg });
                        }
                      }}
                    />

                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition border"
                      style={{
                        borderColor: 'rgba(214, 178, 94, 0.55)',
                        color: GOLD_HOVER,
                        backgroundColor: 'rgba(0,0,0,0.10)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(240, 210, 124, 0.75)';
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(214, 178, 94, 0.55)';
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.10)';
                      }}
                      disabled={!thumbnailFile || thumbnailUpload.status === 'uploading'}
                      onClick={() => {
                        if (!thumbnailFile) return;
                        resetSubmitState();
                        uploadFile(thumbnailFile, 'thumbnail', setThumbnailUpload);
                      }}
                    >
                      {thumbnailUpload.status === 'uploading' ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4 w-4" />
                          Upload Thumbnail
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4">
                    {thumbnailUpload.status === 'done' && (
                      <div className="text-sm text-gray-200">
                        <div className="text-gray-300">
                          <span className="font-semibold">File:</span> {thumbnailUpload.fileName} •{' '}
                          {prettyBytes(thumbnailUpload.size)}
                        </div>
                        <div className="mt-1 break-all">
                          <span className="font-semibold">URL:</span>{' '}
                          <a className="underline" href={thumbnailUpload.url} target="_blank" rel="noreferrer">
                            {thumbnailUpload.url}
                          </a>
                        </div>
                      </div>
                    )}
                    {thumbnailUpload.status === 'error' && (
                      <div className="text-sm text-red-200 mt-2 inline-flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <span>{thumbnailUpload.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <div className="text-xs text-gray-400">Upload all 3 files to continue.</div>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={!uploadsComplete}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: 'rgba(214, 178, 94, 0.55)',
                    color: GOLD_HOVER,
                    backgroundColor: 'rgba(0,0,0,0.10)',
                  }}
                  onMouseEnter={(e) => {
                    if (!uploadsComplete) return;
                    e.currentTarget.style.borderColor = 'rgba(240, 210, 124, 0.75)';
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(214, 178, 94, 0.55)';
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.10)';
                  }}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Step 2: Captions */}
            <div className="w-full flex-shrink-0">
              <div className="mt-6 grid gap-5">
                {/* Captions + Title */}
                <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                  <h2 className="text-xl font-bold">Captions + YouTube Title</h2>
                  <p className="text-gray-300 text-sm mt-1">
                    Enter platform-specific copy. (At least one caption is required to submit.)
                  </p>

                  <div className="mt-5 grid gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-2">
                        Caption — Instagram
                      </label>
                      <textarea
                        value={captionInstagram}
                        onChange={(e) => {
                          setCaptionInstagram(e.target.value);
                          resetSubmitState();
                        }}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D6B25E]/50 focus:border-[#D6B25E] transition-all"
                        placeholder="Write your Instagram caption…"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-2">
                        Caption — Facebook
                      </label>
                      <textarea
                        value={captionFacebook}
                        onChange={(e) => {
                          setCaptionFacebook(e.target.value);
                          resetSubmitState();
                        }}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D6B25E]/50 focus:border-[#D6B25E] transition-all"
                        placeholder="Write your Facebook caption…"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-2">
                        Caption — TikTok
                      </label>
                      <textarea
                        value={captionTikTok}
                        onChange={(e) => {
                          setCaptionTikTok(e.target.value);
                          resetSubmitState();
                        }}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D6B25E]/50 focus:border-[#D6B25E] transition-all"
                        placeholder="Write your TikTok caption…"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-2">
                        Title — YouTube Shorts{' '}
                        <span className="text-gray-400 font-normal">(required)</span>
                      </label>
                      <input
                        value={youtubeTitle}
                        onChange={(e) => {
                          setYoutubeTitle(e.target.value);
                          resetSubmitState();
                        }}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D6B25E]/50 focus:border-[#D6B25E] transition-all"
                        placeholder="Your YouTube Shorts title…"
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
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition border"
                  style={{
                    borderColor: 'rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.85)',
                    backgroundColor: 'rgba(0,0,0,0.10)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.10)';
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!captionsComplete}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: 'rgba(214, 178, 94, 0.55)',
                    color: GOLD_HOVER,
                    backgroundColor: 'rgba(0,0,0,0.10)',
                  }}
                  onMouseEnter={(e) => {
                    if (!captionsComplete) return;
                    e.currentTarget.style.borderColor = 'rgba(240, 210, 124, 0.75)';
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(214, 178, 94, 0.55)';
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.10)';
                  }}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Step 3: Schedule */}
            <div className="w-full flex-shrink-0">
              <div className="mt-6 grid gap-5">
                {/* Scheduling */}
                <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                  <h2 className="text-xl font-bold">Content Scheduling</h2>
                  <p className="text-gray-300 text-sm mt-1">
                    Choose the exact date & time in{' '}
                    <span className="font-semibold">Eastern Time (ET)</span>. We convert it into
                    API-ready formats.
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
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#D6B25E]/50 focus:border-[#D6B25E] transition-all"
                      />
                    </div>
                  </div>

                  <div className="mt-5 text-sm text-gray-200">
                    {scheduleInfo.ok ? (
                      <div className="grid gap-2">
                        <div className="text-gray-300">
                          <span className="font-semibold">ET Display:</span> {scheduleInfo.etDisplay}
                        </div>
                        <div className="text-gray-300 break-all">
                          <span className="font-semibold">YouTube (RFC3339 w/ offset):</span>{' '}
                          {scheduleInfo.rfc3339WithOffset}
                        </div>
                        <div className="text-gray-300 break-all">
                          <span className="font-semibold">UTC ISO:</span> {scheduleInfo.utcIso}
                        </div>
                        <div className="text-gray-300">
                          <span className="font-semibold">Unix Seconds:</span> {scheduleInfo.unixSeconds}
                        </div>
                        <div className="text-gray-300">
                          <span className="font-semibold">Unix Millis:</span> {scheduleInfo.unixMillis}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-red-200 mt-2 inline-flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <span>{scheduleInfo.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition border"
                  style={{
                    borderColor: 'rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.85)',
                    backgroundColor: 'rgba(0,0,0,0.10)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.10)';
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!scheduleComplete}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: 'rgba(214, 178, 94, 0.55)',
                    color: GOLD_HOVER,
                    backgroundColor: 'rgba(0,0,0,0.10)',
                  }}
                  onMouseEnter={(e) => {
                    if (!scheduleComplete) return;
                    e.currentTarget.style.borderColor = 'rgba(240, 210, 124, 0.75)';
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(214, 178, 94, 0.55)';
                    e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.10)';
                  }}
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Step 4: Review + Submit */}
            <div className="w-full flex-shrink-0">
              <div className="mt-6 grid gap-5">
                <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
                  <h2 className="text-xl font-bold">Review</h2>
                  <p className="text-gray-300 text-sm mt-1">Quick check before you submit.</p>

                  <div className="mt-5 grid gap-4 text-sm text-gray-200">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-gray-100">Files</div>
                        <div className="text-gray-300">
                          Video: {videoUpload.status === 'done' ? videoUpload.fileName : 'Missing'}
                          <br />
                          Audio: {audioUpload.status === 'done' ? audioUpload.fileName : 'Missing'}
                          <br />
                          Thumbnail:{' '}
                          {thumbnailUpload.status === 'done' ? thumbnailUpload.fileName : 'Missing'}
                        </div>
                      </div>
                      {uploadsComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-green-200 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-200 mt-0.5" />
                      )}
                    </div>

                    <div className="h-px bg-white/10" />

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-gray-100">Copy</div>
                        <div className="text-gray-300">
                          YouTube Title: {youtubeTitle.trim().length ? youtubeTitle : 'Missing'}
                          <br />
                          Captions: {captionsOk ? 'Added' : 'Missing'}
                        </div>
                      </div>
                      {captionsComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-green-200 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-200 mt-0.5" />
                      )}
                    </div>

                    <div className="h-px bg-white/10" />

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-gray-100">Schedule</div>
                        <div className="text-gray-300">
                          {scheduleInfo.ok ? scheduleInfo.etDisplay : 'Missing / invalid'}
                        </div>
                      </div>
                      {scheduleComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-green-200 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-200 mt-0.5" />
                      )}
                    </div>

                    {!canSubmit && (
                      <div className="mt-2 text-xs text-gray-400">
                        Finish missing items above to enable submit.
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <div className="mt-8 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={submitWebhook}
                    disabled={!canSubmit}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      borderColor: 'rgba(214, 178, 94, 0.55)',
                      color: GOLD_HOVER,
                      backgroundColor: 'rgba(0,0,0,0.10)',
                    }}
                    onMouseEnter={(e) => {
                      if (!canSubmit) return;
                      e.currentTarget.style.borderColor = 'rgba(240, 210, 124, 0.75)';
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(214, 178, 94, 0.55)';
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.10)';
                    }}
                  >
                    {submitting ? <Loader className="h-3.5 w-3.5 animate-spin" /> : null}
                    <span className="gold-shimmer">Submit</span>
                  </button>

                  {submitOk && (
                    <div className="text-sm text-green-200 inline-flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Submitted successfully.
                    </div>
                  )}

                  {submitError && (
                    <div className="text-sm text-red-200 inline-flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {submitError}
                    </div>
                  )}

                  <div className="text-xs text-gray-400 text-center max-w-md">
                    Powered by Infinite Wealth Solutions AI.
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition border"
                    style={{
                      borderColor: 'rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.85)',
                      backgroundColor: 'rgba(0,0,0,0.10)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.10)';
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!uploadsComplete) return setStep(0);
                      if (!captionsComplete) return setStep(1);
                      if (!scheduleComplete) return setStep(2);
                    }}
                    disabled={canSubmit}
                    className="text-xs text-gray-400 hover:text-gray-200 transition disabled:hidden"
                  >
                    Fix missing items
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}