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

const WEBHOOK_URL =
  'https://iwsaiagents.app.n8n.cloud/webhook-test/f8390721-73cc-4594-921c-3afff87774c0';

const BUCKET = 'media';
const MAX_BYTES = 49 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

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

export function MediaDistributionPage() {
  const [bgOffset, setBgOffset] = useState(0);

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
      audioUpload.status === 'done'
    );
  }, [submitting, videoUpload.status, audioUpload.status]);

  /* ---------------- background motion ---------------- */
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setBgOffset(window.scrollY * 0.15);
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ---------------- helpers ---------------- */
  const prettyBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const sizeGuard = (file: File, kind: 'video' | 'audio') => {
    if (file.size > MAX_BYTES) {
      return `${kind === 'video' ? 'Video' : 'Audio'} file too large (${prettyBytes(
        file.size
      )}).`;
    }
    return null;
  };

  const getPublicOrSignedUrl = async (path: string) => {
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (pub?.data?.publicUrl) return pub.data.publicUrl;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);

    if (error || !data?.signedUrl) throw new Error('Signed URL failed');
    return data.signedUrl;
  };

  /* ---------------- upload ---------------- */
  const uploadFile = async (
    file: File,
    kind: 'video' | 'audio',
    setState: (s: UploadState) => void
  ) => {
    const guard = sizeGuard(file, kind);
    if (guard) {
      setState({ status: 'error', message: guard });
      return;
    }

    setState({ status: 'uploading' });

    try {
      const ext = file.name.split('.').pop();
      const path = `transferrable-everything/${kind}/${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.${ext}`;

      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type,
      });

      if (error) throw error;

      const url = await getPublicOrSignedUrl(path);

      setState({
        status: 'done',
        path,
        url,
        fileName: file.name,
        mime: file.type,
        size: file.size,
      });
    } catch (e: any) {
      setState({ status: 'error', message: e.message || 'Upload failed' });
    }
  };

  /* ---------------- submit ---------------- */
  const submitWebhook = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(false);

    try {
      const payload = {
        brand: 'Transferrable Everything',
        submittedAt: new Date().toISOString(),
        video: videoUpload,
        audio: audioUpload,
      };

      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `Webhook failed (${res.status})`);

      setSubmitOk(true);
    } catch (e: any) {
      setSubmitError(e.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundImage: `radial-gradient(1200px 600px at 50% ${-200 + bgOffset}px, rgba(214,178,94,0.18), transparent 60%), linear-gradient(to bottom, #2a2a2a, #0b0b0b, #000)`,
        backgroundAttachment: 'fixed',
      }}
    >
      {/* shimmer */}
      <style>{`
        .gold-shimmer {
          background: linear-gradient(
            110deg,
            #b9892b,
            #f7dc8a,
            #ffffff,
            #f1d27b,
            #b9892b
          );
          background-size: 240% 100%;
          animation: shimmer 4.8s ease-in-out infinite;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        @keyframes shimmer {
          0% { background-position: 0% }
          50% { background-position: 100% }
          100% { background-position: 0% }
        }
      `}</style>

      <header className="px-6 py-6">
        <Link to="/" className="flex items-center text-gray-400 hover:text-white">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-16">
        <h1 className="text-5xl font-extrabold text-center mt-10">
          Welcome <span className="gold-shimmer">Transferrable Everything</span>
        </h1>

        {/* VIDEO */}
        <section className="mt-10 bg-white/5 border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">1) Upload Video</h2>
          <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} />
          <button
            className="mt-3 px-4 py-2 bg-white text-black rounded-xl font-bold"
            onClick={() => videoFile && uploadFile(videoFile, 'video', setVideoUpload)}
          >
            Upload Video
          </button>
          {videoUpload.status === 'done' && <p className="text-green-300 mt-2">Video uploaded</p>}
          {videoUpload.status === 'error' && <p className="text-red-300 mt-2">{videoUpload.message}</p>}
        </section>

        {/* AUDIO */}
        <section className="mt-6 bg-white/5 border border-gray-700/50 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">2) Upload Audio</h2>
          <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)} />
          <button
            className="mt-3 px-4 py-2 bg-white text-black rounded-xl font-bold"
            onClick={() => audioFile && uploadFile(audioFile, 'audio', setAudioUpload)}
          >
            Upload Audio
          </button>
          {audioUpload.status === 'done' && <p className="text-green-300 mt-2">Audio uploaded</p>}
          {audioUpload.status === 'error' && <p className="text-red-300 mt-2">{audioUpload.message}</p>}
        </section>

        {/* SUBMIT */}
        <div className="mt-10 flex flex-col items-center">
          <button
            onClick={submitWebhook}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition border disabled:opacity-50"
            style={{
              borderColor: 'rgba(214,178,94,0.55)',
              color: GOLD_HOVER,
              backgroundColor: 'rgba(0,0,0,0.10)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(240,210,124,0.75)';
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(214,178,94,0.55)';
              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.10)';
            }}
          >
            {submitting && <Loader className="h-4 w-4 animate-spin" />}
            <span className="gold-shimmer">Submit</span>
          </button>

          {submitOk && <p className="mt-3 text-green-300">Submitted successfully.</p>}
          {submitError && <p className="mt-3 text-red-300">{submitError}</p>}
        </div>
      </main>
    </div>
  );
}