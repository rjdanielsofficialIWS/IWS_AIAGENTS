import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
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
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub?.data?.publicUrl;

    if (publicUrl) return publicUrl;

    // ✅ Signed URL fallback if bucket is private
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

      if (upErr) {
        const raw = upErr.message || 'Upload failed';
        if (
          raw.toLowerCase().includes('maximum allowed size') ||
          raw.toLowerCase().includes('exceeded')
        ) {
          throw new Error(
            `${kind === 'video'
              ? 'Video'
              : kind === 'audio'
                ? 'Audio'
                : 'Thumbnail image'
            } is too large. Max is about ${prettyBytes(MAX_BYTES)}.`
          );
        }
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

  // Convert an intended ET local time (date + time) into an accurate UTC instant,
  // including DST shifts automatically, without external libs.
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

    // Start with a UTC "guess" that uses the same components.
    // We'll iteratively correct it so that formatting in ET matches the intended ET time.
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

    // Build offset for RFC3339 (ET offset at that instant, -05:00 or -04:00)
    const etParts = formatPartsInTz(utcDate, TZ_ET);
    const etAsIfUtc = Date.UTC(
      etParts.year,
      etParts.month - 1,
      etParts.day,
      etParts.hour,
      etParts.minute,
      etParts.second
    );
    const offsetMinutes = Math.round((etAsIfUtc - utcDate.getTime()) / 60000); // e.g. -300 or -240
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
          // The main “universal” moment (use this downstream)
          utcIso: scheduleInfo.utcIso,
          unixSeconds: scheduleInfo.unixSeconds,
          unixMillis: scheduleInfo.unixMillis,
          // Helpful platform-friendly formats
          rfc3339WithOffset: scheduleInfo.rfc3339WithOffset, // YouTube publishAt friendly
          etDisplay: scheduleInfo.etDisplay,
          // For clarity / logging
          requestedLocal: {
            date: scheduleDate,
            time: scheduleTime,
          },
        },

        // ✅ This note helps n8n map accurately to each API:
        platformNotes: {
          youtube: 'Use scheduling.rfc3339WithOffset (publishAt) or scheduling.utcIso (RFC3339).',
          meta: 'Instagram/Facebook often expect scheduled_publish_time as UNIX seconds (UTC) → use scheduling.unixSeconds.',
          tiktok: 'If API expects schedule_time in seconds, use scheduling.unixSeconds; if expects ISO/RFC3339, use scheduling.utcIso.',
        },
      };

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

      <main className="relative z-10 max-w-3xl mx-auto px-6 pb-16">
        <div className="text-center mt-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            Welcome{' '}
            <span className="gold-shimmer font-extrabold">
              Transferrable Everything
            </span>
          </h1>

          <p className="mt-4 text-gray-200 text-lg">
            Upload video + audio + thumbnail, add captions & scheduling, then submit to distribute your content.
          </p>
        </div>

        <div className="mt-10 grid gap-5">
          {/* Video */}
          <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">1) Upload Video</h2>
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
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: 'rgba(214, 178, 94, 0.45)',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  color: GOLD_HOVER,
                }}
                onMouseEnter={(e) => {
                  if (videoUpload.status === 'uploading') return;
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(240, 210, 124, 0.70)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.15)';
                  e.currentTarget.style.borderColor = 'rgba(214, 178, 94, 0.45)';
                }}
                disabled={!videoFile || videoUpload.status === 'uploading' || videoUpload.status === 'error'}
                onClick={() => {
                  if (!videoFile) return;
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
                <h2 className="text-xl font-bold">2) Upload Audio</h2>
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
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: 'rgba(214, 178, 94, 0.45)',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  color: GOLD_HOVER,
                }}
                onMouseEnter={(e) => {
                  if (audioUpload.status === 'uploading') return;
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(240, 210, 124, 0.70)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.15)';
                  e.currentTarget.style.borderColor = 'rgba(214, 178, 94, 0.45)';
                }}
                disabled={!audioFile || audioUpload.status === 'uploading' || audioUpload.status === 'error'}
                onClick={() => {
                  if (!audioFile) return;
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
                <h2 className="text-xl font-bold">3) Upload Thumbnail Image</h2>
                <p className="text-gray-300 text-sm mt-1">
                  JPG/PNG/WebP recommended. Generates a shareable link like the video/audio.
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
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderColor: 'rgba(214, 178, 94, 0.45)',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  color: GOLD_HOVER,
                }}
                onMouseEnter={(e) => {
                  if (thumbnailUpload.status === 'uploading') return;
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(240, 210, 124, 0.70)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.15)';
                  e.currentTarget.style.borderColor = 'rgba(214, 178, 94, 0.45)';
                }}
                disabled={
                  !thumbnailFile ||
                  thumbnailUpload.status === 'uploading' ||
                  thumbnailUpload.status === 'error'
                }
                onClick={() => {
                  if (!thumbnailFile) return;
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

          {/* Captions + Title */}
          <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
            <h2 className="text-xl font-bold">4) Captions + YouTube Title</h2>
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
                  Title — YouTube Shorts <span className="text-gray-400 font-normal">(required)</span>
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

          {/* Scheduling */}
          <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
            <h2 className="text-xl font-bold">5) Content Scheduling</h2>
            <p className="text-gray-300 text-sm mt-1">
              Choose the exact date & time in <span className="font-semibold">Eastern Time (ET)</span>. We convert it into API-ready formats.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-2">
                  Date (ET)
                </label>
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
                <label className="block text-sm font-semibold text-gray-200 mb-2">
                  Time (ET)
                </label>
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

            <div className="mt-5">
              {scheduleInfo.ok ? (
                <div className="text-sm text-gray-200 space-y-2">
                  <div className="text-gray-300">
                    <span className="font-semibold">ET:</span> {scheduleInfo.etDisplay}
                  </div>

                  <div className="break-all">
                    <span className="font-semibold">RFC3339 (with ET offset):</span>{' '}
                    <span className="text-gray-100">{scheduleInfo.rfc3339WithOffset}</span>
                  </div>

                  <div className="break-all">
                    <span className="font-semibold">UTC ISO:</span>{' '}
                    <span className="text-gray-100">{scheduleInfo.utcIso}</span>
                  </div>

                  <div className="break-all">
                    <span className="font-semibold">Unix (seconds):</span>{' '}
                    <span className="text-gray-100">{scheduleInfo.unixSeconds}</span>
                  </div>

                  <div className="break-all">
                    <span className="font-semibold">Unix (ms):</span>{' '}
                    <span className="text-gray-100">{scheduleInfo.unixMillis}</span>
                  </div>

                  <div className="mt-3 text-xs text-gray-400">
                    Tip: Meta scheduling usually wants unix seconds. YouTube scheduling wants RFC3339.
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-200 inline-flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <span>{scheduleInfo.message}</span>
                </div>
              )}
            </div>
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
      </main>
    </div>
  );
}