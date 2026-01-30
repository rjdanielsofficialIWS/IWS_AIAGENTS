import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  Clock,
  Sparkles,
  Loader,
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

const ModalShell = ({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) => {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0B0B0F] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export function MediaDistributionPage() {
  // Background motion
  const [bgOffset, setBgOffset] = useState(0);

  // Modal visibility
  const [openModal, setOpenModal] = useState<null | 'uploads' | 'captions' | 'schedule'>(null);

  // Files
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  // Upload states
  const [videoUpload, setVideoUpload] = useState<UploadState>({ status: 'idle' });
  const [audioUpload, setAudioUpload] = useState<UploadState>({ status: 'idle' });
  const [thumbnailUpload, setThumbnailUpload] = useState<UploadState>({ status: 'idle' });

  // Copy fields
  const [captionInstagram, setCaptionInstagram] = useState('');
  const [captionFacebook, setCaptionFacebook] = useState('');
  const [captionTikTok, setCaptionTikTok] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');

  // Tone + AI results
  const [tone, setTone] = useState('confident, punchy, value-first');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [tweetIdeas, setTweetIdeas] = useState<string[]>([]);
  const [ytTitleIdeas, setYtTitleIdeas] = useState<string[]>([]);

  // Schedule
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Scroll glow
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
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub?.data?.publicUrl;
    if (publicUrl) return publicUrl;

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed to create signed URL');
    return data.signedUrl;
  };

  const uploadFile = async (
    file: File,
    kind: MediaKind,
    setState: (s: UploadState) => void
  ) => {
    setSubmitOk(false);
    setSubmitError(null);

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

  const scheduleInfo = useMemo(() => toUtcFromEtLocal(scheduleDate, scheduleTime), [scheduleDate, scheduleTime]);

  const uploadsComplete =
    videoUpload.status === 'done' && audioUpload.status === 'done' && thumbnailUpload.status === 'done';

  const captionsComplete =
    youtubeTitle.trim().length > 0 &&
    (captionInstagram.trim().length > 0 || captionFacebook.trim().length > 0 || captionTikTok.trim().length > 0);

  const scheduleComplete = scheduleInfo.ok;

  const closeModal = () => setOpenModal(null);

  const StepCard = ({
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
      className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-5 text-left shadow-lg transition hover:bg-white/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm text-white/70">{desc}</div>
        </div>
        {done ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
        ) : (
          <div className="h-6 w-6 rounded-full border border-white/15" />
        )}
      </div>
    </button>
  );

  const FileRow = ({
    label,
    kind,
    file,
    setFile,
    upload,
    setUpload,
    accept,
  }: {
    label: string;
    kind: MediaKind;
    file: File | null;
    setFile: (f: File | null) => void;
    upload: UploadState;
    setUpload: (u: UploadState) => void;
    accept: string;
  }) => {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">{label}</div>
            <div className="text-xs text-white/60">Max {prettyBytes(MAX_BYTES)}</div>
          </div>

          {upload.status === 'done' ? (
            <span className="text-xs text-emerald-300">Uploaded</span>
          ) : upload.status === 'uploading' ? (
            <span className="text-xs text-white/70">Uploading…</span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="file"
            accept={accept}
            className="w-full text-sm text-white/80 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/15"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              setUpload({ status: 'idle' });
              setSubmitOk(false);
              setSubmitError(null);
            }}
          />
          <button
            type="button"
            disabled={!file || upload.status === 'uploading'}
            onClick={() => file && uploadFile(file, kind, setUpload)}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            style={{ background: GOLD_PRIMARY }}
          >
            <UploadCloud className="h-4 w-4" />
            Upload
          </button>
        </div>

        {upload.status === 'error' ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 text-red-300" />
            <div>{upload.message}</div>
          </div>
        ) : null}

        {upload.status === 'done' ? (
          <div className="mt-3 text-xs text-white/70">
            {upload.fileName} • {prettyBytes(upload.size)}
          </div>
        ) : null}
      </div>
    );
  };

  const runAi = async () => {
    setAiError(null);

    if (audioUpload.status !== 'done') {
      setAiError('Upload your audio first (Uploads step).');
      return;
    }

    setAiLoading(true);
    try {
      // Calls your Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('content-ai', {
        body: {
          audioUrl: audioUpload.url,
          tone,
        },
      });

      if (error) {
        throw new Error((error as any)?.context?.body?.details || error.message || 'AI generation failed.');
      }

      const res = data as AiGenResponse;

      // Auto-fill best picks
      if (res?.best?.instagram) setCaptionInstagram(res.best.instagram);
      if (res?.best?.facebook) setCaptionFacebook(res.best.facebook);
      if (res?.best?.tiktok) setCaptionTikTok(res.best.tiktok);
      if (res?.best?.youtubeTitle) setYoutubeTitle(res.best.youtubeTitle);

      // Optional idea lists (NO transcript displayed)
      setTweetIdeas(Array.isArray(res?.tweets) ? res.tweets : []);
      setYtTitleIdeas(Array.isArray(res?.youtubeTitles) ? res.youtubeTitles : []);
    } catch (e: any) {
      setAiError(e?.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const submitWebhook = async () => {
    setSubmitting(true);
    setSubmitOk(false);
    setSubmitError(null);

    try {
      if (!uploadsComplete) throw new Error('Please complete Uploads first.');
      if (!captionsComplete) throw new Error('Please complete Captions first.');
      if (!scheduleInfo.ok) throw new Error(scheduleInfo.message);

      const payload = {
        source: 'media-distribution-landing',
        brand: 'Transferrable Everything',
        submittedAt: new Date().toISOString(),
        assets: {
          video: videoUpload,
          audio: audioUpload,
          thumbnail: thumbnailUpload,
        },
        copy: {
          captions: {
            instagram: captionInstagram,
            facebook: captionFacebook,
            tiktok: captionTikTok,
          },
          youtubeTitle,
          tone,
        },
        schedule: {
          timezone: scheduleInfo.timezone,
          etDisplay: scheduleInfo.etDisplay,
          rfc3339WithOffset: scheduleInfo.rfc3339WithOffset,
          utcIso: scheduleInfo.utcIso,
          unixSeconds: scheduleInfo.unixSeconds,
        },
      };

      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Webhook failed (${res.status}). ${t.slice(0, 200)}`);
      }

      setSubmitOk(true);
      setOpenModal(null);
    } catch (e: any) {
      setSubmitError(e?.message || 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07070A] text-white">
      {/* Glow background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(1200px 600px at 20% 10%, rgba(214,178,94,0.18), transparent 60%), radial-gradient(900px 500px at 80% 30%, rgba(99,102,241,0.12), transparent 60%), radial-gradient(800px 500px at 50% 90%, rgba(214,178,94,0.10), transparent 55%)',
          transform: `translateY(${bgOffset}px)`,
        }}
      />

      <div className="relative mx-auto w-full max-w-3xl px-4 pb-20 pt-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="text-right">
            <div className="text-sm text-white/70">Media Distribution</div>
            <div className="text-lg font-semibold">Transferrable Everything</div>
          </div>
        </div>

        {/* ONLY 3 BOXES */}
        <div className="flex flex-col gap-4">
          <StepCard
            title="1) Uploads"
            desc="Upload your video, audio, and thumbnail."
            done={uploadsComplete}
            onClick={() => setOpenModal('uploads')}
          />
          <StepCard
            title="2) Captions"
            desc="Write platform captions + YouTube title (or generate with AI)."
            done={captionsComplete}
            onClick={() => setOpenModal('captions')}
          />
          <StepCard
            title="3) Schedule"
            desc="Pick date & time (ET) and submit."
            done={scheduleComplete && submitOk}
            onClick={() => setOpenModal('schedule')}
          />
        </div>

        {submitOk ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
              <div>
                <div className="font-semibold">Scheduled successfully.</div>
                <div className="text-sm text-emerald-100/80">
                  Your media package was submitted to the distribution workflow.
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {submitError ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
              <div className="text-sm">{submitError}</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Uploads Modal */}
      {openModal === 'uploads' ? (
        <ModalShell title="Uploads" onClose={closeModal}>
          <div className="space-y-4">
            <FileRow
              label="Video"
              kind="video"
              file={videoFile}
              setFile={setVideoFile}
              upload={videoUpload}
              setUpload={setVideoUpload}
              accept="video/*"
            />
            <FileRow
              label="Audio"
              kind="audio"
              file={audioFile}
              setFile={setAudioFile}
              upload={audioUpload}
              setUpload={setAudioUpload}
              accept="audio/*"
            />
            <FileRow
              label="Thumbnail"
              kind="thumbnail"
              file={thumbnailFile}
              setFile={setThumbnailFile}
              upload={thumbnailUpload}
              setUpload={setThumbnailUpload}
              accept="image/*"
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={closeModal}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                Done
              </button>
              <div className="text-xs text-white/60">
                Uploads must be complete before AI generation.
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {/* Captions Modal */}
      {openModal === 'captions' ? (
        <ModalShell title="Captions & Titles" onClose={closeModal}>
          <div className="space-y-4">
            {/* Tone + AI */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-white/70">Tone</label>
                  <input
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="e.g. Alex Hormozi, luxury, casual, professional…"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                  />
                  <div className="mt-2 text-xs text-white/60">
                    Try: <span className="text-white/80">Alex Hormozi</span>, <span className="text-white/80">Gary Vee</span>,{' '}
                    <span className="text-white/80">Luxury</span>, <span className="text-white/80">Professional</span>.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={runAi}
                  disabled={aiLoading || audioUpload.status !== 'done'}
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
                  style={{ background: GOLD_PRIMARY }}
                >
                  {aiLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate (AI)
                </button>
              </div>

              {aiError ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-red-300" />
                  <div>{aiError}</div>
                </div>
              ) : null}

              {/* NO transcript shown */}
            </div>

            {/* Platform fields */}
            <div className="grid gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <label className="text-xs font-semibold text-white/70">Instagram Caption</label>
                <textarea
                  value={captionInstagram}
                  onChange={(e) => setCaptionInstagram(e.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <label className="text-xs font-semibold text-white/70">Facebook Caption</label>
                <textarea
                  value={captionFacebook}
                  onChange={(e) => setCaptionFacebook(e.target.value)}
                  rows={5}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <label className="text-xs font-semibold text-white/70">TikTok Caption</label>
                <textarea
                  value={captionTikTok}
                  onChange={(e) => setCaptionTikTok(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <label className="text-xs font-semibold text-white/70">YouTube Shorts Title</label>
                <input
                  value={youtubeTitle}
                  onChange={(e) => setYoutubeTitle(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                />
              </div>
            </div>

            {/* Optional ideas */}
            {(tweetIdeas.length > 0 || ytTitleIdeas.length > 0) ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-white">Ideas (optional)</div>

                {tweetIdeas.length > 0 ? (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-white/70">Tweet ideas</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                      {tweetIdeas.slice(0, 10).map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {ytTitleIdeas.length > 0 ? (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-white/70">YouTube title ideas</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                      {ytTitleIdeas.slice(0, 8).map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={closeModal}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                Done
              </button>
              <div className="text-xs text-white/60">
                Tip: AI uses platform-specific rules behind the scenes.
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {/* Schedule Modal */}
      {openModal === 'schedule' ? (
        <ModalShell title="Schedule & Submit" onClose={closeModal}>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white">Schedule (ET)</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-white/70">Date</label>
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                    <Calendar className="h-4 w-4 text-white" />
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full bg-transparent text-sm text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-white/70">Time</label>
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                    <Clock className="h-4 w-4 text-white" />
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full bg-transparent text-sm text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-white/60">
                {scheduleInfo.ok ? (
                  <span>
                    Scheduled for <span className="text-white/80">{scheduleInfo.etDisplay}</span>
                  </span>
                ) : (
                  <span>{scheduleInfo.message}</span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white">Ready check</div>
              <div className="mt-2 space-y-1 text-sm text-white/75">
                <div className="flex items-center justify-between">
                  <span>Uploads</span>
                  {uploadsComplete ? <span className="text-emerald-300">Done</span> : <span className="text-white/50">Missing</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span>Captions</span>
                  {captionsComplete ? <span className="text-emerald-300">Done</span> : <span className="text-white/50">Missing</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span>Schedule</span>
                  {scheduleInfo.ok ? <span className="text-emerald-300">Done</span> : <span className="text-white/50">Missing</span>}
                </div>
              </div>

              <button
                type="button"
                onClick={submitWebhook}
                disabled={submitting || !uploadsComplete || !captionsComplete || !scheduleInfo.ok}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-extrabold text-black disabled:opacity-40"
                style={{ background: submitting ? GOLD_HOVER : GOLD_PRIMARY }}
              >
                {submitting ? <Loader className="h-4 w-4 animate-spin" /> : null}
                Submit to Distribution
              </button>

              <div className="mt-2 text-xs text-white/60">
                This sends your assets + copy + schedule to your automation webhook.
              </div>
            </div>

            <button
              onClick={closeModal}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </ModalShell>
      ) : null}

      <div className="relative mt-10 pb-10 text-center text-xs text-white/40">
        Powered by Infinite Wealth Solutions AI.
      </div>
    </div>
  );
}