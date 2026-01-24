import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/vapiAI';

const GOLD_PRIMARY = '#D6B25E';
const GOLD_HOVER = '#F0D27C';

// ✅ Set this later (or keep as env var)
const WEBHOOK_URL = import.meta.env.VITE_MEDIA_WEBHOOK_URL || '';

// ✅ Storage bucket (create in Supabase Storage). Must exist.
const BUCKET = import.meta.env.VITE_MEDIA_BUCKET || 'media';

// If your bucket is private, we’ll fallback to signed URLs (7 days)
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress?: number }
  | { status: 'done'; path: string; url: string; fileName: string; mime: string; size: number }
  | { status: 'error'; message: string };

export function MediaDistributionPage() {
  // ✅ Match the HomePage desktop background “glow motion”
  const [bgOffset, setBgOffset] = useState(0);

  // File states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [videoUpload, setVideoUpload] = useState<UploadState>({ status: 'idle' });
  const [audioUpload, setAudioUpload] = useState<UploadState>({ status: 'idle' });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      !submitting &&
      videoUpload.status === 'done' &&
      audioUpload.status === 'done' &&
      Boolean(WEBHOOK_URL)
    );
  }, [submitting, videoUpload.status, audioUpload.status]);

  // ✅ Same scroll offset behavior as your other pages
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

  const getPublicOrSignedUrl = async (path: string) => {
    // Try public URL first (works if bucket is public)
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub?.data?.publicUrl;

    if (publicUrl) return publicUrl;

    // Otherwise fallback to signed URL (works if bucket private)
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed to create signed URL');
    return data.signedUrl;
  };

  const uploadFile = async (file: File, kind: 'video' | 'audio', setState: (s: UploadState) => void) => {
    resetSubmitState();
    setState({ status: 'uploading' });

    try {
      const safeName = file.name.replace(/\s+/g, '-');
      const ext = safeName.includes('.') ? safeName.split('.').pop() : '';
      const ts = Date.now();
      const random = Math.random().toString(16).slice(2);
      const path = `transferrable-everything/${kind}/${ts}-${random}${ext ? `.${ext}` : ''}`;

      // Upload
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

      if (upErr) throw new Error(upErr.message || 'Upload failed');

      // URL
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

  const submitWebhook = async () => {
    if (videoUpload.status !== 'done' || audioUpload.status !== 'done') return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(false);

    try {
      if (!WEBHOOK_URL) throw new Error('Missing webhook URL. Set VITE_MEDIA_WEBHOOK_URL.');

      const payload = {
        source: 'media-distribution-landing',
        brand: 'Transferrable Everything',
        submittedAt: new Date().toISOString(),
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
      };

      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        backgroundImage: `radial-gradient(1200px 600px at 50% ${-200 + bgOffset}px, rgba(200, 162, 74, 0.18), transparent 62%), linear-gradient(to bottom, #2a2a2a, #0b0b0b, #000)`,
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}
    >
      {/* ✅ Gold shimmer animation (same vibe as DynamicDemoPage) */}
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

      {/* ✅ Same overlay layer as HomePage desktop */}
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
            Upload a video + audio file, then submit to send both links to your automation webhook.
          </p>

          {!WEBHOOK_URL && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-400/30 bg-red-500/10 text-red-200 text-sm">
              <AlertCircle className="h-4 w-4" />
              Webhook not set. Add <span className="font-mono">VITE_MEDIA_WEBHOOK_URL</span> to your env.
            </div>
          )}
        </div>

        {/* Upload cards */}
        <div className="mt-10 grid gap-5">
          {/* Video */}
          <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">1) Upload Video</h2>
                <p className="text-gray-300 text-sm mt-1">Accepted: MP4, MOV, WebM (any video format).</p>
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
                }}
              />

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition border"
                style={{
                  borderColor: 'rgba(214, 178, 94, 0.45)',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  color: GOLD_HOVER,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(240, 210, 124, 0.70)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.15)';
                  e.currentTarget.style.borderColor = 'rgba(214, 178, 94, 0.45)';
                }}
                disabled={!videoFile || videoUpload.status === 'uploading'}
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
                    <span className="font-semibold">File:</span> {videoUpload.fileName} • {prettyBytes(videoUpload.size)}
                  </div>
                  <div className="mt-1 break-all">
                    <span className="font-semibold">URL:</span> <a className="underline" href={videoUpload.url} target="_blank" rel="noreferrer">{videoUpload.url}</a>
                  </div>
                </div>
              )}
              {videoUpload.status === 'error' && (
                <div className="text-sm text-red-200 mt-2">{videoUpload.message}</div>
              )}
            </div>
          </div>

          {/* Audio */}
          <div className="bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">2) Upload Audio</h2>
                <p className="text-gray-300 text-sm mt-1">Accepted: MP3, WAV, M4A (any audio format).</p>
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
                }}
              />

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition border"
                style={{
                  borderColor: 'rgba(214, 178, 94, 0.45)',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  color: GOLD_HOVER,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(240, 210, 124, 0.70)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.15)';
                  e.currentTarget.style.borderColor = 'rgba(214, 178, 94, 0.45)';
                }}
                disabled={!audioFile || audioUpload.status === 'uploading'}
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
                    <span className="font-semibold">File:</span> {audioUpload.fileName} • {prettyBytes(audioUpload.size)}
                  </div>
                  <div className="mt-1 break-all">
                    <span className="font-semibold">URL:</span> <a className="underline" href={audioUpload.url} target="_blank" rel="noreferrer">{audioUpload.url}</a>
                  </div>
                </div>
              )}
              {audioUpload.status === 'error' && (
                <div className="text-sm text-red-200 mt-2">{audioUpload.message}</div>
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
            className="px-10 py-4 rounded-2xl font-extrabold transition inline-flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: canSubmit ? GOLD_PRIMARY : 'rgba(214, 178, 94, 0.25)',
              color: 'black',
              boxShadow: canSubmit ? '0 18px 60px rgba(0,0,0,0.55)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!canSubmit) return;
              e.currentTarget.style.backgroundColor = GOLD_HOVER;
            }}
            onMouseLeave={(e) => {
              if (!canSubmit) return;
              e.currentTarget.style.backgroundColor = GOLD_PRIMARY;
            }}
          >
            {submitting ? <Loader className="h-5 w-5 animate-spin" /> : null}
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
            Your webhook will receive both URLs + metadata. If your bucket is private, links will be signed (7 days).
          </div>
        </div>
      </main>
    </div>
  );
}