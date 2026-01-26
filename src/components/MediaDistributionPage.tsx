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
      etDisplay: string;
      rfc3339WithOffset: string;
      utcIso: string;
      unixSeconds: number;
      unixMillis: number;
    }
  | { ok: false; message: string };

export function MediaDistributionPage() {
  const [bgOffset, setBgOffset] = useState(0);

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

  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

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

  const prettyBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const getPublicOrSignedUrl = async (path: string) => {
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    if (pub?.data?.publicUrl) return pub.data.publicUrl;
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_SECONDS);
    return data!.signedUrl;
  };

  const uploadFile = async (
    file: File,
    kind: MediaKind,
    setState: (s: UploadState) => void
  ) => {
    setState({ status: 'uploading' });
    try {
      const path = `uploads/${kind}/${Date.now()}-${file.name}`;
      await supabase.storage.from(BUCKET).upload(path, file);
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
      setState({ status: 'error', message: e.message });
    }
  };

  const scheduleInfo: ScheduleInfo = useMemo(() => {
    if (!scheduleDate || !scheduleTime) {
      return { ok: false, message: 'Select date & time' };
    }
    const d = new Date(`${scheduleDate}T${scheduleTime}:00`);
    return {
      ok: true,
      etDisplay: d.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      rfc3339WithOffset: d.toISOString(),
      utcIso: d.toISOString(),
      unixSeconds: Math.floor(d.getTime() / 1000),
      unixMillis: d.getTime(),
    };
  }, [scheduleDate, scheduleTime]);

  return (
    <div className="min-h-screen text-white">
      <style>{`
        /* GOLD SHIMMER */
        .gold-shimmer {
          background: linear-gradient(110deg,#b9892b,#f7dc8a,#fff,#b9892b);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          color: transparent;
          animation: shimmer 4s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 0% }
          100% { background-position: 200% }
        }

        /* 👇 WHITE DATE/TIME ICON FIX */
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
      `}</style>

      <header className="px-6 py-6">
        <Link to="/" className="flex items-center text-gray-400 hover:text-white">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-16">
        <h1 className="text-4xl font-bold text-center">
          <span className="gold-shimmer">Media Distribution</span>
        </h1>

        {/* Scheduling */}
        <div className="mt-10 bg-white/5 p-6 rounded-2xl border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Schedule Content</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl"
            />
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl"
            />
          </div>

          <div className="mt-4">
            {scheduleInfo.ok ? (
              <div className="flex items-center gap-2 text-green-200">
                <CheckCircle2 className="h-4 w-4" />
                Scheduled for {scheduleInfo.etDisplay}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-200">
                <AlertCircle className="h-4 w-4" />
                {scheduleInfo.message}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}