import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Loader, CheckCircle2, AlertCircle, Sparkles, X,
  Plus, ChevronLeft, ChevronRight, Calendar, Clock,
  Video, Link2, Link2Off, RefreshCw, Send, Edit3, Image,
  ChevronDown, ChevronUp, Play, Pause, Volume2, VolumeX, Maximize2, LogOut,
  ClipboardList, FileText, Trash2, BookOpen,
} from 'lucide-react';
import { supabase } from '../services/vapiAI';
import { useAuth } from '../contexts/AuthContext';
import { MediaMachineAuthModal } from './auth/MediaMachineAuthModal';

const GOLD    = '#D6B25E';
const GOLD_L  = '#F0D27C';
const GOLD_D  = '#8F6B1E';
const BG      = 'linear-gradient(135deg, #0d0d0d 0%, #242424 50%, #131313 100%)';
const SURFACE = 'rgba(255,255,255,0.04)';
const BORDER  = 'rgba(255,255,255,0.08)';

// Resolve a raw API status against current time — if scheduled but past-due, treat as published
const resolveStatus = (raw: string, scheduledAt: Date): 'scheduled' | 'published' | 'failed' => {
  if (raw === 'scheduled' && scheduledAt < new Date()) return 'published';
  return (raw as any) || 'scheduled';
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ORG_ID = '56bd14a6-07ab-4c57-bbfd-28d6d7d9eaa6';

const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

const LS_SOCIAL_RETURN_KEY = 'postiz_social_return';

type PlatformId =
  | 'instagram' | 'facebook' | 'tiktok' | 'youtube'
  | 'x' | 'linkedin' | 'threads' | 'bluesky';

const PLATFORMS: Record<PlatformId, {
  label: string; color: string; bg: string;
  icon: React.ReactNode; postizType: string;
}> = {
  instagram: {
    label: 'Instagram', postizType: 'instagram',
    color: '#E1306C', bg: 'rgba(225,48,108,0.12)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
  },
  facebook: {
    label: 'Facebook', postizType: 'facebook',
    color: '#1877F2', bg: 'rgba(24,119,242,0.12)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  },
  tiktok: {
    label: 'TikTok', postizType: 'tiktok',
    color: '#ffffff', bg: 'rgba(255,255,255,0.08)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.86 1.56V6.79a4.85 4.85 0 01-1.09-.1z"/></svg>,
  },
  youtube: {
    label: 'YouTube', postizType: 'youtube',
    color: '#FF0000', bg: 'rgba(255,0,0,0.12)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  },
  x: {
    label: 'X (Twitter)', postizType: 'x',
    color: '#ffffff', bg: 'rgba(255,255,255,0.08)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  },
  linkedin: {
    label: 'LinkedIn', postizType: 'linkedin',
    color: '#0A66C2', bg: 'rgba(10,102,194,0.12)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  },
  threads: {
    label: 'Threads', postizType: 'threads',
    color: '#ffffff', bg: 'rgba(255,255,255,0.08)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 011.435.027c-.092-.866-.345-1.449-.764-1.727-.474-.315-1.208-.454-2.116-.408-.717.038-1.395.234-1.97.57l-.898-1.754c.86-.47 1.868-.739 2.949-.789 1.505-.073 2.748.247 3.614.928.867.683 1.35 1.737 1.434 3.131.02.274.023.55.009.825l.001.013c.011.16.02.32.027.482.048 1.265.08 2.107-.024 2.948-.133 1.09-.478 2.032-1.048 2.806-1.237 1.673-3.147 2.616-5.49 2.73zm.041-8.99c-1.052.077-1.863.4-2.307.872-.39.417-.555.947-.496 1.596.086.95.783 1.532 2.016 1.46.927-.052 1.637-.435 2.11-1.137.54-.8.738-1.923.574-3.343a11.548 11.548 0 00-1.897-.448z"/></svg>,
  },
  bluesky: {
    label: 'Bluesky', postizType: 'bluesky',
    color: '#0085ff', bg: 'rgba(0,133,255,0.12)',
    icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.299-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/></svg>,
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadState =
  | { status: 'idle' }
  | { status: 'preparing' }
  | { status: 'uploading'; progress?: number }
  | { status: 'done'; path: string; url: string; fileName: string; mime: string; size: number }
  | { status: 'error'; message: string };

type PostizIntegration = {
  id: string; name: string; identifier: string;
  picture?: string; profile?: string; disabled?: boolean;
};

type ViewMode = 'composer' | 'calendar' | 'planner';

type ScheduledPost = {
  id: string; content: string; platforms: string[];
  scheduledAt: Date; status: 'scheduled' | 'published' | 'failed';
};

type PlannerItem = {
  id: string;
  title: string;
  notes?: string;
  plannedDate: string;
  plannedTime?: string;
  category: string;
  sourceLabel?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateState() {
  const a = new Uint8Array(16);
  window.crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

async function ayrsharePost(payload: {
  platforms: string[]; post: string; mediaUrls?: string[]; scheduleDate?: string;
  youTubeTitle?: string; youTubeShorts?: boolean; youTubeVisibility?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ayrshare-post`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || `Post failed (${res.status})`;
    const hint = data.hint ? `\n\n💡 ${data.hint}` : '';
    throw new Error(msg + hint);
  }
  return data;
}

const MEDIA_REQUIRED_PLATFORMS = new Set(['youtube', 'tiktok', 'instagram']);

async function fetchChannels(userId: string, force = false): Promise<PostizIntegration[]> {
  if (!userId) return [];
  const url = `${SUPABASE_URL}/functions/v1/ayrshare-channels?userId=${encodeURIComponent(userId)}${force ? '&force=true' : ''}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const channels: PostizIntegration[] = Array.isArray(data?.channels) ? data.channels : [];
  return channels.map(ch => ({ ...ch, identifier: ch.identifier || ch.id || '' }));
}

async function uploadViaNativeXHR(
  file: File | Blob,
  kind: 'video' | 'image',
  onProgress?: (pct: number) => void
): Promise<string> {
  const EDGE = `${SUPABASE_URL}/functions/v1/upload-media`;
  const ext = file instanceof File
    ? (file.name.split('.').pop() || (kind === 'video' ? 'mp4' : 'jpg'))
    : (kind === 'video' ? 'mp4' : 'wav');
  const filePath    = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const contentType = file instanceof File ? file.type : (kind === 'video' ? 'video/mp4' : 'audio/wav');
  const fileSize    = file instanceof File ? file.size : (file as Blob).size;
  const DIRECT_MAX  = 4  * 1024 * 1024;
  const SUPABASE_MAX = 50 * 1024 * 1024;
  const CHUNK_SIZE  = 5  * 1024 * 1024;

  if (fileSize <= DIRECT_MAX) {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', EDGE);
      xhr.setRequestHeader('x-file-path', filePath);
      xhr.setRequestHeader('content-type', contentType);
      if (onProgress) xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (!data.url) throw new Error('No URL in response: ' + xhr.responseText.slice(0, 200));
            resolve(data.url);
          } catch (e: any) { reject(new Error('Invalid upload response: ' + e.message)); }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} — ${xhr.responseText.slice(0, 200)}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });
  }

  const initRes = await fetch(EDGE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'init', filePath, contentType, fileSize }),
  });
  if (!initRes.ok) {
    const e = await initRes.json().catch(() => ({}));
    throw new Error(e.error || `Upload init failed (${initRes.status})`);
  }
  const { uploadId, provider } = await initRes.json();

  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  const parts: { partNumber: number; etag: string }[] = [];
  let uploadedBytes = 0;

  for (let i = 0; i < totalChunks; i++) {
    const start  = i * CHUNK_SIZE;
    const end    = Math.min(start + CHUNK_SIZE, fileSize);
    const chunk  = file.slice(start, end);
    const partNo = i + 1;

    const chunkRes = await new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', EDGE);
      xhr.setRequestHeader('x-action', 'chunk');
      xhr.setRequestHeader('x-file-path', filePath);
      xhr.setRequestHeader('x-provider', provider || 'supabase');
      xhr.setRequestHeader('content-type', contentType);
      if (uploadId) {
        xhr.setRequestHeader('x-upload-id', uploadId);
        xhr.setRequestHeader('x-part-number', String(partNo));
      }
      xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status }));
      xhr.onerror = () => reject(new Error('Network error on chunk upload'));
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((uploadedBytes + e.loaded) / fileSize * 100));
        }
      };
      xhr.send(chunk);
    });

    if (!chunkRes.ok) {
      const e = await chunkRes.json().catch(() => ({}));
      if (uploadId) {
        fetch(EDGE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'abort', filePath, uploadId }) }).catch(() => {});
      }
      throw new Error(e.error || `Chunk ${partNo} failed (${chunkRes.status})`);
    }

    const chunkData = await chunkRes.json();
    uploadedBytes += (end - start);
    if (onProgress) onProgress(Math.round(uploadedBytes / fileSize * 100));

    if (provider === 'supabase') return chunkData.url;

    if (chunkData.etag) parts.push({ partNumber: partNo, etag: chunkData.etag });
  }

  const completeRes = await fetch(EDGE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'complete', filePath, uploadId, parts }),
  });
  if (!completeRes.ok) {
    const e = await completeRes.json().catch(() => ({}));
    throw new Error(e.error || `Upload complete failed (${completeRes.status})`);
  }
  const { url } = await completeRes.json();
  return url;
}

function pcmToWav(samples: Float32Array, sampleRate = 16000): Blob {
  const buf  = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const str  = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  str(0,  'RIFF'); view.setUint32(4,  36 + samples.length * 2, true);
  str(8,  'WAVE'); str(12, 'fmt ');
  view.setUint32(16, 16,           true);
  view.setUint16(20, 1,            true);
  view.setUint16(22, 1,            true);
  view.setUint32(24, sampleRate,   true);
  view.setUint32(28, sampleRate*2, true);
  view.setUint16(32, 2,            true);
  view.setUint16(34, 16,           true);
  str(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++)
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Blob([buf], { type: 'audio/wav' });
}

async function extractAudioFromVideo(videoFile: File): Promise<Blob> {
  const SAMPLE_RATE = 16000;
  const objectUrl = URL.createObjectURL(videoFile);

  try {
    const arrayBuffer = await videoFile.arrayBuffer();
    const tmpCtx = new AudioContext();
    let decoded: AudioBuffer;
    try {
      decoded = await tmpCtx.decodeAudioData(arrayBuffer);
    } finally {
      await tmpCtx.close();
    }

    let audioBuffer: AudioBuffer;
    if (decoded.sampleRate === SAMPLE_RATE) {
      audioBuffer = decoded;
    } else {
      const frames  = Math.ceil(decoded.duration * SAMPLE_RATE);
      const offline = new OfflineAudioContext(1, frames, SAMPLE_RATE);
      const src     = offline.createBufferSource();
      src.buffer    = decoded;
      src.connect(offline.destination);
      src.start(0);
      audioBuffer = await offline.startRendering();
    }

    const samples = new Float32Array(audioBuffer.length);
    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) samples[i] += data[i] / audioBuffer.numberOfChannels;
    }

    URL.revokeObjectURL(objectUrl);
    return pcmToWav(samples, SAMPLE_RATE);

  } catch (decodeErr) {
    console.warn('decodeAudioData failed, falling back to live capture:', decodeErr);
  }

  return new Promise<Blob>((resolve, reject) => {
    const vid = document.createElement('video');
    vid.src         = objectUrl;
    vid.muted       = false;
    vid.playsInline = true;
    vid.preload     = 'auto';

    vid.addEventListener('error', () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Video could not be loaded for audio extraction'));
    });

    vid.addEventListener('canplaythrough', async () => {
      try {
        const audioCtx   = new AudioContext({ sampleRate: SAMPLE_RATE });
        const source     = audioCtx.createMediaElementSource(vid);
        const bufferSize = 4096;
        const processor  = audioCtx.createScriptProcessor(bufferSize, 1, 1);
        const chunks: Float32Array[] = [];

        source.connect(processor);
        processor.connect(audioCtx.destination);

        processor.onaudioprocess = (e) => {
          chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        };

        vid.currentTime = 0;
        await vid.play();

        vid.addEventListener('ended', async () => {
          processor.disconnect();
          source.disconnect();
          await audioCtx.close();
          URL.revokeObjectURL(objectUrl);

          const total   = chunks.reduce((n, c) => n + c.length, 0);
          const samples = new Float32Array(total);
          let offset    = 0;
          for (const c of chunks) { samples.set(c, offset); offset += c.length; }

          resolve(pcmToWav(samples, SAMPLE_RATE));
        }, { once: true });

      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    }, { once: true });

    vid.load();
  });
}

async function transcribeVideo(videoFile: File): Promise<string> {
  let transcribeRes: Response;

  if (videoFile.size <= 5 * 1024 * 1024) {
    const form = new FormData();
    form.append('file', videoFile, videoFile.name);
    transcribeRes = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-video`, { method: 'POST', body: form });
  } else {
    const audioBlob = await extractAudioFromVideo(videoFile);
    if (audioBlob.size <= 5 * 1024 * 1024) {
      const form = new FormData();
      form.append('file', audioBlob, 'audio.wav');
      transcribeRes = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-video`, { method: 'POST', body: form });
    } else {
      const videoUrl = await uploadViaNativeXHR(audioBlob, 'video');
      transcribeRes = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl }),
      });
    }
  }

  if (!transcribeRes.ok) {
    const err = await transcribeRes.json().catch(() => ({}));
    throw new Error(err.error || 'Transcription failed');
  }
  const { transcript } = await transcribeRes.json();
  return transcript;
}

// ─── Small shared components ──────────────────────────────────────────────────

function PlatformIcon({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'sm' ? 24 : size === 'lg' ? 40 : 32;
  const iconPx = size === 'sm' ? 14 : size === 'lg' ? 24 : 20;
  const r = size === 'sm' ? 7 : size === 'lg' ? 12 : 10;
  const key = (id || '').toLowerCase().replace('twitter', 'x');

  const logos: Record<string, { bg: string; node: React.ReactNode }> = {
    instagram: {
      bg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
      node: <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
    },
    facebook: {
      bg: '#1877F2',
      node: <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    },
    tiktok: {
      bg: '#010101',
      node: <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.86 1.56V6.79a4.85 4.85 0 01-1.09-.1z"/></svg>,
    },
    youtube: {
      bg: '#FF0000',
      node: <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    },
    x: {
      bg: '#000000',
      node: <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    },
    linkedin: {
      bg: '#0A66C2',
      node: <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    },
    threads: {
      bg: '#000000',
      node: <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="white"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 011.435.027c-.092-.866-.345-1.449-.764-1.727-.474-.315-1.208-.454-2.116-.408-.717.038-1.395.234-1.97.57l-.898-1.754c.86-.47 1.868-.739 2.949-.789 1.505-.073 2.748.247 3.614.928.867.683 1.35 1.737 1.434 3.131.02.274.023.55.009.825l.001.013c.011.16.02.32.027.482.048 1.265.08 2.107-.024 2.948-.133 1.09-.478 2.032-1.048 2.806-1.237 1.673-3.147 2.616-5.49 2.73zm.041-8.99c-1.052.077-1.863.4-2.307.872-.39.417-.555.947-.496 1.596.086.95.783 1.532 2.016 1.46.927-.052 1.637-.435 2.11-1.137.54-.8.738-1.923.574-3.343a11.548 11.548 0 00-1.897-.448z"/></svg>,
    },
    bluesky: {
      bg: '#0085ff',
      node: <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="white"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.299-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/></svg>,
    },
    pinterest: {
      bg: '#E60023',
      node: <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="white"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>,
    },
    gmb: {
      bg: '#4285F4',
      node: <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>,
    },
  };

  const logo = logos[key];
  if (!logo) {
    return (
      <div style={{ width: px, height: px, borderRadius: r, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: iconPx * 0.6, color: 'rgba(255,255,255,0.5)', fontWeight: 900 }}>{(id?.[0] || '?').toUpperCase()}</span>
      </div>
    );
  }

  return (
    <div style={{ width: px, height: px, borderRadius: r, background: logo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
      {logo.node}
    </div>
  );
}

function TranscriptViewer({ transcript }: { transcript: string }) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_LENGTH = 160;
  const isLong = transcript.length > PREVIEW_LENGTH;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${GOLD}20`, background: 'rgba(0,0,0,0.25)' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: BORDER }}>
        <span className="text-xs font-bold text-white/30 uppercase tracking-wider">Transcript</span>
        <span className="text-xs text-white/20">{transcript.length} chars</span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap break-words">
          {expanded || !isLong ? transcript : transcript.slice(0, PREVIEW_LENGTH) + '…'}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-2 flex items-center gap-1 text-xs font-bold transition hover:brightness-125"
            style={{ color: GOLD }}
          >
            {expanded
              ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
              : <><ChevronDown className="w-3.5 h-3.5" /> Read full transcript</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ConnectAccountsModal ─────────────────────────────────────────────────────

function ConnectAccountsModal({
  open, onClose, integrations, onConnectPostiz, integrationsLoading, onRefresh, currentUser,
}: {
  open: boolean; onClose: () => void; integrations: PostizIntegration[];
  onConnectPostiz: () => void; integrationsLoading: boolean;
  onRefresh: (force?: boolean) => void;
  currentUser: { id: string; email: string } | null;
}) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveEmail, setLiveEmail] = useState<string>('');

  useEffect(() => {
    if (open) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setLiveEmail(user?.email ?? '');
      });
    } else {
      setConnecting(false);
      setError(null);
    }
  }, [open]);

  const handleConnect = async () => {
    setConnecting(true); setError(null);
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();

      if (sessionErr || !session) {
        setConnecting(false);
        onConnectPostiz();
        return;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/ayrshare-connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${res.status}`);
      }

      const { connectUrl } = await res.json();
      if (!connectUrl) throw new Error('No connect URL returned');

      localStorage.setItem('postiz_social_return', '1');
      window.open(connectUrl, '_blank');
      setConnecting(false);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to open connection manager. Please try again.');
      setConnecting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full md:max-w-lg rounded-t-2xl md:rounded-2xl border overflow-hidden shadow-2xl flex flex-col"
        style={{ background: SURFACE, borderColor: BORDER, maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
          <div>
            <h2 className="text-base font-bold text-white">Connect Channels</h2>
            <p className="text-sm text-white/40 mt-0.5">
              {liveEmail ? `Account: ${liveEmail}` : 'Link your social accounts to start scheduling'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {integrations.length > 0 && (
            <div>
              <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">
                Connected ({integrations.length})
              </div>
              <div className="space-y-2">
                {integrations.map(int => (
                  <div key={int.id} className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.05)' }}>
                    <PlatformIcon id={int.profile || int.identifier} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{int.name}</div>
                      <div className="text-xs text-white/30">{int.profile || int.identifier}</div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl text-xs text-red-400 border border-red-400/20 bg-red-400/5">
              {error}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition hover:brightness-110 disabled:opacity-50"
            style={{ background: GOLD, color: '#000' }}
          >
            {connecting
              ? <><Loader className="w-4 h-4 animate-spin" /> Opening…</>
              : <><Link2 className="w-4 h-4" />{integrations.length > 0 ? 'Add Another Channel' : 'Connect a Social Account'}</>}
          </button>

          <p className="text-xs text-white/30 text-center">
            Instagram, TikTok, YouTube, LinkedIn, X, Facebook & more
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── PostLogModal ─────────────────────────────────────────────────────────────

function PostLogModal({ open, onClose, userId, initialFilter = 'all' }: {
  open: boolean; onClose: () => void; userId: string | null; initialFilter?: string;
}) {
  const [posts, setPosts]     = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter]   = useState<'all' | 'scheduled' | 'published' | 'failed'>(initialFilter as any);

  useEffect(() => { if (open) setFilter(initialFilter as any); }, [open, initialFilter]);

  const loadPosts = useCallback(async () => {
    if (!userId || !open) return;
    setLoading(true);
    try {
      const end   = new Date(); end.setMonth(end.getMonth() + 3);
      const start = new Date(); start.setMonth(start.getMonth() - 1);
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/ayrshare-scheduled?userId=${encodeURIComponent(userId)}&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`);
      const data = res.ok ? await res.json() : { posts: [] };
      const now = new Date();
      const list = Array.isArray(data?.posts) ? data.posts : [];
      setPosts(list.map((p: any) => {
        const scheduledAt = new Date(p.scheduledAt);
        return { id: p.id, content: p.content || '', platforms: Array.isArray(p.platforms) ? p.platforms : [], scheduledAt, status: resolveStatus(p.status || 'scheduled', scheduledAt) };
      }).sort((a: ScheduledPost, b: ScheduledPost) => b.scheduledAt.getTime() - a.scheduledAt.getTime()));
    } catch (e) {}
    finally { setLoading(false); }
  }, [userId, open]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  if (!open) return null;

  const filtered = posts.filter(p => filter === 'all' || p.status === filter);
  const counts = {
    all: posts.length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
    failed:    posts.filter(p => p.status === 'failed').length,
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-2xl rounded-t-2xl md:rounded-2xl border overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: SURFACE, borderColor: BORDER }}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
          <div>
            <h2 className="text-base font-bold text-white">📋 Post Log</h2>
            <p className="text-xs text-white/35 mt-0.5">Your recent and upcoming posts</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-1 px-5 py-2.5 border-b shrink-0 overflow-x-auto" style={{ borderColor: BORDER }}>
          {(['all', 'scheduled', 'published', 'failed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize whitespace-nowrap shrink-0"
              style={{ background: filter === f ? `${GOLD}18` : 'transparent', color: filter === f ? GOLD_L : 'rgba(255,255,255,0.35)' }}>
              {f} {f !== 'all' && <span className="opacity-60">({counts[f]})</span>}
            </button>
          ))}
          {loading && <Loader className="ml-auto w-4 h-4 animate-spin text-white/20 shrink-0" />}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loading && posts.length === 0 ? (
            <div className="flex items-center justify-center h-40 gap-3 text-white/25"><Loader className="w-5 h-5 animate-spin" /> Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="text-sm font-bold text-white/25">No {filter === 'all' ? '' : filter} posts found</div>
            </div>
          ) : (
            filtered.map(post => (
              <div key={post.id} className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: BORDER }}>
                <div className="flex -space-x-1.5 shrink-0 pt-0.5">
                  {post.platforms.slice(0, 3).map((pid, i) => (
                    <div key={i} className="rounded-full border-2" style={{ borderColor: SURFACE }}><PlatformIcon id={pid} size="sm" /></div>
                  ))}
                  {post.platforms.length > 3 && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white/40 border-2" style={{ borderColor: SURFACE, background: SURFACE }}>
                      +{post.platforms.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 line-clamp-2">{post.content || '(No caption)'}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-white/25 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.scheduledAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-lg text-xs font-bold shrink-0"
                  style={{
                    background: post.status === 'published' ? 'rgba(34,197,94,0.12)' : post.status === 'failed' ? 'rgba(239,68,68,0.12)' : `${GOLD}12`,
                    color:      post.status === 'published' ? '#86efac'              : post.status === 'failed' ? '#fca5a5'              : GOLD_L,
                  }}>
                  {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── VideoPreviewCard ─────────────────────────────────────────────────────────

function VideoPreviewCard({
  file, objectUrl, uploadState, onRemove,
}: { file: File; objectUrl: string; uploadState: UploadState; onRemove: () => void }) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying]         = useState(true);
  const [muted, setMuted]             = useState(true);
  const [volume, setVolume]           = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]       = useState(0);
  const [showVolume, setShowVolume]   = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => setPlaying(false));
  }, []);

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  };

  const handleTimeUpdate     = () => setCurrentTime(videoRef.current?.currentTime ?? 0);
  const handleLoadedMetadata = () => setDuration(videoRef.current?.duration ?? 0);
  const handleEnded          = () => { setPlaying(false); };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const toggleMute = () => {
    const v = videoRef.current; if (!v) return;
    const newMuted = !v.muted;
    v.muted = newMuted;
    setMuted(newMuted);
    if (!newMuted && v.volume === 0) { v.volume = 1; setVolume(1); }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setVolume(val);
    setMuted(val === 0);
  };

  const handleFullscreen = () => {
    const v = videoRef.current; if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen();
    else if ((v as any).webkitEnterFullscreen) (v as any).webkitEnterFullscreen();
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER, background: '#000' }}>
      <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          src={objectUrl}
          className="w-full h-full object-contain"
          playsInline
          muted
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onClick={togglePlay}
          style={{ cursor: 'pointer' }}
        />
        {!playing && (
          <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center group"
            style={{ background: 'rgba(0,0,0,0.4)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center transition group-hover:scale-105"
              style={{ background: 'rgba(0,0,0,0.75)', border: `2px solid ${GOLD}` }}>
              <Play className="w-6 h-6 ml-0.5" style={{ color: GOLD }} />
            </div>
          </button>
        )}
        {muted && playing && (
          <button onClick={toggleMute}
            className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition hover:scale-105"
            style={{ background: 'rgba(0,0,0,0.75)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <VolumeX className="w-3.5 h-3.5" />
            <span>Tap to unmute</span>
          </button>
        )}
        <button onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition hover:scale-110"
          style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <X className="w-3.5 h-3.5 text-white/70" />
        </button>
      </div>
      <div className="px-3 py-2 space-y-1.5" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <input type="range" min={0} max={duration || 1} step={0.1} value={currentTime}
          onChange={handleScrub}
          className="w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: GOLD }} />
        <div className="flex items-center gap-2">
          <button onClick={togglePlay}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition shrink-0"
            style={{ color: GOLD }}>
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <span className="text-[10px] font-mono text-white/40 shrink-0 tabular-nums">
            {fmt(currentTime)} / {fmt(duration)}
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-1"
            onMouseEnter={() => setShowVolume(true)}
            onMouseLeave={() => setShowVolume(false)}>
            <button onClick={toggleMute}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition text-white/50 hover:text-white">
              {muted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${showVolume ? 'w-16 opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
              <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                onChange={handleVolume}
                className="w-16 h-1 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: GOLD }} />
            </div>
          </div>
          <button onClick={handleFullscreen}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition text-white/40 hover:text-white shrink-0">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {(uploadState.status === 'preparing' || uploadState.status === 'uploading') && (
        <div className="px-3 py-2 border-t" style={{ borderColor: BORDER }}>
          {uploadState.status === 'preparing' && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Loader className="w-3 h-3 animate-spin shrink-0" /> Preparing upload…
            </div>
          )}
          {uploadState.status === 'uploading' && (
            <div className="space-y-1">
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all" style={{ background: GOLD, width: `${(uploadState as any).progress ?? 0}%` }} />
              </div>
              <div className="text-[10px] text-white/30">Uploading… {(uploadState as any).progress ?? 0}%</div>
            </div>
          )}
        </div>
      )}
      {uploadState.status === 'error' && (
        <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-400 border-t" style={{ borderColor: BORDER }}>
          <AlertCircle className="w-3 h-3 shrink-0" /> {(uploadState as any).message}
        </div>
      )}
      {uploadState.status === 'done' && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-green-400 border-t" style={{ borderColor: BORDER }}>
          <CheckCircle2 className="w-3 h-3" /> Uploaded — ready to post
        </div>
      )}
    </div>
  );
}

// ─── ImagePreviewCard ─────────────────────────────────────────────────────────

function ImagePreviewCard({
  file, uploadState, onRemove,
}: { file: File; uploadState: UploadState; onRemove: () => void }) {
  const [objectUrl] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);

  return (
    <div className="relative rounded-xl border overflow-hidden group" style={{ borderColor: BORDER }}>
      <img src={objectUrl} className="w-full object-cover max-h-64" alt={file.name} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
      <button onClick={onRemove}
        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition hover:scale-110"
        style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)' }}>
        <X className="w-3.5 h-3.5 text-white/70" />
      </button>
      {uploadState.status === 'uploading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <Loader className="w-5 h-5 animate-spin text-white" />
          <div className="w-24 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <div className="h-full rounded-full transition-all" style={{ background: GOLD, width: `${(uploadState as any).progress ?? 0}%` }} />
          </div>
          <span className="text-xs text-white/60">{(uploadState as any).progress ?? 0}%</span>
        </div>
      )}
      {uploadState.status === 'done' && (
        <div className="absolute bottom-2 right-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-green-400"
            style={{ background: 'rgba(0,0,0,0.7)' }}>
            <CheckCircle2 className="w-3 h-3" /> Ready
          </div>
        </div>
      )}
      {uploadState.status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="text-center px-3">
            <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <span className="text-xs text-red-300">{(uploadState as any).message}</span>
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 text-[10px] text-white/40 truncate opacity-0 group-hover:opacity-100 transition"
        style={{ background: 'rgba(0,0,0,0.6)' }}>
        {file.name}
      </div>
    </div>
  );
}

// ─── InlinePostComposer ────────────────────────────────────────────────────────
// Inline version of PostComposerModal (no modal wrapper)

function InlinePostComposer({
  integrations, userId, onSuccess,
}: {
  integrations: PostizIntegration[];
  userId: string | null;
  onSuccess?: () => void;
}) {
  type PostType = 'media' | 'text';
  const [postType, setPostType]         = useState<PostType>('media');
  const [scheduleType, setScheduleType] = useState<'now' | 'schedule'>('now');
  const [scheduleDateStr, setScheduleDate] = useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [submitOk, setSubmitOk]         = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);

  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [content, setContent]           = useState('');
  const [videoFile, setVideoFile]       = useState<File | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [videoUpload, setVideoUpload]   = useState<UploadState>({ status: 'idle' });
  const [imageFiles, setImageFiles]     = useState<File[]>([]);
  const [imageUploads, setImageUploads] = useState<UploadState[]>([]);
  type CaptionType = 'manual' | 'ai';
  const [captionType, setCaptionType]   = useState<CaptionType>('manual');
  type CaptionMode = 'from_video' | 'from_description';
  const [captionMode, setCaptionMode]   = useState<CaptionMode>('from_video');
  const [aiTone, setAiTone]             = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiError, setAiError]           = useState<string | null>(null);
  const [transcript, setTranscript]     = useState<string | null>(null);
  const [generatedCaptions, setGeneratedCaptions] = useState<Record<string, string> | null>(null);
  const [youTubeTitle, setYouTubeTitle] = useState('');

  const [textTab, setTextTab]           = useState<'twitter' | 'linkedin'>('twitter');
  const [xText, setXText]               = useState('');
  const [linkedinText, setLinkedinText] = useState('');
  const [showTextAi, setShowTextAi]     = useState(false);
  const [textAiMode, setTextAiMode]     = useState<'from_video' | 'from_description'>('from_description');
  const [textAiDesc, setTextAiDesc]     = useState('');
  const [textAiTone, setTextAiTone]     = useState('');
  const [textAiVideo, setTextAiVideo]   = useState<File | null>(null);
  const [textAiLoading, setTextAiLoading] = useState(false);
  const [textAiError, setTextAiError]   = useState<string | null>(null);
  const [textAiPosts, setTextAiPosts]   = useState<{ twitter: string[]; linkedin: string[] } | null>(null);
  const [textAiSelected, setTextAiSelected] = useState<{ twitter: number | null; linkedin: number | null }>({ twitter: null, linkedin: null });

  const xInteg       = integrations.find(i => ['x','twitter'].includes((i.profile||i.identifier||'').toLowerCase()));
  const liInteg      = integrations.find(i => (i.profile||i.identifier||'').toLowerCase().startsWith('linkedin'));
  const threadsInteg = integrations.find(i => (i.profile||i.identifier||'').toLowerCase().startsWith('threads'));

  // Multi-select for text post accounts
  const [selectedTextAccounts, setSelectedTextAccounts] = useState<string[]>([]);
  const toggleTextAccount = (id: string) => setSelectedTextAccounts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // AI edit state
  const [aiEditText, setAiEditText] = useState('');
  const [editingIdx, setEditingIdx] = useState<{ tab: 'twitter' | 'linkedin'; idx: number } | null>(null);

  const textPostAccounts = [
    ...(xInteg       ? [{ integ: xInteg,       platform: 'x' as PlatformId       }] : []),
    ...(liInteg      ? [{ integ: liInteg,       platform: 'linkedin' as PlatformId }] : []),
    ...(threadsInteg ? [{ integ: threadsInteg,  platform: 'threads' as PlatformId  }] : []),
  ];

  const getSelectedPlatforms = () =>
    selectedIntegrations.map(id => integrations.find(i => i.id === id)?.identifier).filter(Boolean) as string[];
  const isYouTubeSelected = getSelectedPlatforms().includes('youtube');

  const uploadFileForPost = async (file: File, kind: 'video' | 'image', setU: (s: UploadState) => void) => {
    setU({ status: 'uploading', progress: 0 });
    try {
      const url = await uploadViaNativeXHR(file, kind, pct => setU({ status: 'uploading', progress: pct }));
      setU({ status: 'done', path: '', url, fileName: file.name, mime: file.type, size: file.size });
    } catch (e: any) {
      setU({ status: 'error', message: e.message || 'Upload failed' });
    }
  };

  const handleAiGenerate = async () => {
    setAiLoading(true); setAiError(null); setGeneratedCaptions(null); setTranscript(null);
    try {
      let sourceText = '';
      if (captionMode === 'from_video') {
        if (!videoFile) throw new Error('Add a video using the Video button above first');
        sourceText = await transcribeVideo(videoFile);
        setTranscript(sourceText);
      } else {
        if (!aiDescription.trim()) throw new Error('Enter a description of your video');
        sourceText = aiDescription;
      }
      const mode = captionMode === 'from_video' ? 'captions_from_video' : 'captions_from_description';
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-captions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, transcript: captionMode === 'from_video' ? sourceText : undefined, description: captionMode !== 'from_video' ? sourceText : undefined, platforms: getSelectedPlatforms(), tone: aiTone }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      if (data.captions) setGeneratedCaptions(data.captions);
      if (data.youTubeTitle) setYouTubeTitle(data.youTubeTitle);
    } catch (e: any) { setAiError(e.message || 'Something went wrong'); }
    finally { setAiLoading(false); }
  };

  const handleTextAiGenerate = async () => {
    setTextAiLoading(true); setTextAiError(null); setTextAiPosts(null);
    setTextAiSelected({ twitter: null, linkedin: null });
    try {
      let source = '';
      if (textAiMode === 'from_video') {
        if (!textAiVideo) throw new Error('Select a video first');
        source = await transcribeVideo(textAiVideo);
      } else {
        if (!textAiDesc.trim()) throw new Error('Enter a description');
        source = textAiDesc;
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-captions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'repurpose_posts', transcript: textAiMode === 'from_video' ? source : undefined, description: textAiMode !== 'from_video' ? source : undefined, tone: textAiTone }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      if (!data.posts) throw new Error('No posts returned');
      setTextAiPosts(data.posts);
    } catch (e: any) { setTextAiError(e.message || 'Something went wrong'); }
    finally { setTextAiLoading(false); }
  };

  const useTextAiPost = (platform: 'twitter' | 'linkedin', idx: number) => {
    const text = textAiPosts?.[platform]?.[idx] ?? '';
    if (platform === 'twitter') setXText(text); else setLinkedinText(text);
    setTextAiSelected(prev => ({ ...prev, [platform]: idx }));
    setTextTab(platform);
    setAiEditText(text);
    
    setEditingIdx(null);
  };

  const handleMediaSubmit = async () => {
    if (!userId)                      { setSubmitError('Sign in to post.'); return; }
    if (!selectedIntegrations.length) { setSubmitError('Select at least one channel.'); return; }
    if (captionType === 'manual' && !content.trim()) { setSubmitError('Write a caption first.'); return; }
    if (captionType === 'ai' && !generatedCaptions)  { setSubmitError('Generate AI captions first.'); return; }
    if (isYouTubeSelected && !youTubeTitle.trim() && captionType === 'manual') {
      setSubmitError('YouTube requires a video title. Fill in the Title field above.');
      return;
    }
    if (videoUpload.status === 'uploading' || imageUploads.some(u => u.status === 'uploading')) {
      setSubmitError('Wait for media to finish uploading.'); return;
    }
    const selectedPlatformIds = selectedIntegrations
      .map(id => { const i = integrations.find(x => x.id === id); return i?.identifier || i?.id || ''; })
      .filter(Boolean);
    const platformsNeedingMedia = selectedPlatformIds.filter(p => MEDIA_REQUIRED_PLATFORMS.has(p));
    const hasMedia = videoUpload.status === 'done' || imageUploads.some(u => u.status === 'done');
    if (platformsNeedingMedia.length > 0 && !hasMedia) {
      const names = platformsNeedingMedia.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
      setSubmitError(`${names} require${platformsNeedingMedia.length === 1 ? 's' : ''} a video or image. Add media using the buttons above.`);
      return;
    }
    const VIDEO_ONLY_PLATFORMS = new Set(['youtube', 'tiktok']);
    const videoOnlySelected = selectedPlatformIds.filter(p => VIDEO_ONLY_PLATFORMS.has(p));
    const hasVideo = videoUpload.status === 'done';
    const hasImagesOnly = !hasVideo && imageUploads.some(u => u.status === 'done');
    if (videoOnlySelected.length > 0 && hasImagesOnly) {
      const names = videoOnlySelected.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
      setSubmitError(`${names} only accept video files, not images. Please upload a video instead.`);
      return;
    }
    setSubmitting(true); setSubmitError(null);
    try {
      const mediaUrls: string[] = [];
      imageUploads.forEach(u => { if (u.status === 'done' && (u as any).url) mediaUrls.push((u as any).url); });
      if (videoUpload.status === 'done' && (videoUpload as any).url) mediaUrls.push((videoUpload as any).url);
      const sd = scheduleType === 'schedule' ? new Date(scheduleDateStr).toISOString() : undefined;

      if (captionType === 'manual') {
        const platforms = selectedIntegrations
          .map(id => { const i = integrations.find(x => x.id === id); return i?.identifier || i?.id || ''; })
          .filter(Boolean);
        const isYT = platforms.includes('youtube');
        await ayrsharePost({
          platforms, post: content, mediaUrls, scheduleDate: sd,
          ...(isYT ? { youTubeTitle: youTubeTitle || content.slice(0, 100), youTubeShorts: true } : {}),
        });
      } else {
        const postPromises = selectedIntegrations.map(async (integId) => {
          const integ = integrations.find(i => i.id === integId);
          if (!integ) return;
          const platformId = integ.identifier || integ.id || '';
          const caption = generatedCaptions![platformId]
            ?? generatedCaptions![platformId.toLowerCase()]
            ?? Object.values(generatedCaptions!)[0]
            ?? '';
          if (!caption) return;
          const isYT = platformId === 'youtube';
          await ayrsharePost({
            platforms: [platformId], post: caption, mediaUrls, scheduleDate: sd,
            ...(isYT ? { youTubeTitle: youTubeTitle || caption.slice(0, 100), youTubeShorts: true } : {}),
          });
        });
        await Promise.all(postPromises);
      }

      setSubmitOk(true);
      setTimeout(() => {
        setSubmitOk(false);
        setContent(''); setVideoFile(null); setVideoObjectUrl(null);
        setVideoUpload({ status: 'idle' }); setImageFiles([]); setImageUploads([]);
        setGeneratedCaptions(null); setSelectedIntegrations([]);
        onSuccess?.();
      }, 1600);
    } catch (e: any) { setSubmitError(e.message || 'Failed to post'); }
    finally { setSubmitting(false); }
  };

  const handleTextSubmit = async () => {
    const text = editingIdx ? aiEditText : xText;
    if (!text.trim()) { setSubmitError('Write something first.'); return; }
    if (selectedTextAccounts.length === 0) { setSubmitError('Select at least one account to post to.'); return; }
    setSubmitting(true); setSubmitError(null);
    try {
      const sd = scheduleType === 'schedule' ? new Date(scheduleDateStr).toISOString() : undefined;
      const platformIds = selectedTextAccounts.map(id => {
        const acct = textPostAccounts.find(a => a.integ.id === id);
        return acct?.integ.identifier || acct?.platform || '';
      }).filter(Boolean);
      await ayrsharePost({ platforms: platformIds, post: text, scheduleDate: sd });
      setSubmitOk(true);
      setXText(''); setLinkedinText('');
      setAiEditText(''); setEditingIdx(null); setSelectedTextAccounts([]);
      setTimeout(() => setSubmitOk(false), 3000);
    } catch (e: any) { setSubmitError(e.message || 'Post failed'); }
    finally { setSubmitting(false); }
  };

  const scheduleSectionJsx = (
    <div>
      <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">When to post</div>
      <div className="flex gap-2 mb-3">
        {(['now', 'schedule'] as const).map(t => (
          <button key={t} onClick={() => setScheduleType(t)} className="px-4 py-2 rounded-xl text-sm font-bold border transition"
            style={{ borderColor: scheduleType === t ? GOLD : BORDER, background: scheduleType === t ? `${GOLD}18` : 'transparent', color: scheduleType === t ? GOLD_L : 'rgba(255,255,255,0.35)' }}>
            {t === 'now' ? '⚡ Post Now' : '🗓 Schedule'}
          </button>
        ))}
      </div>
      {scheduleType === 'schedule' && (
        <input type="datetime-local" value={scheduleDateStr} onChange={e => setScheduleDate(e.target.value)}
          className="rounded-xl border bg-black/25 px-4 py-2.5 text-sm text-white outline-none" style={{ borderColor: BORDER }} />
      )}
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Post type toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl" style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${BORDER}` }}>
        {([
          ['media', '📎', 'Media Post', 'Video, image & captions'],
          ['text',  '✍️', 'Text Post',  'X (Twitter) & LinkedIn'],
        ] as const).map(([type, emoji, label, sub]) => (
          <button key={type} onClick={() => { setPostType(type); setSubmitOk(false); setSubmitError(null); }}
            className="flex flex-col items-start px-4 py-3 rounded-xl transition"
            style={{ background: postType === type ? `${GOLD}18` : 'transparent', border: `1px solid ${postType === type ? GOLD : 'transparent'}` }}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-base">{emoji}</span>
              <span className="text-sm font-bold" style={{ color: postType === type ? GOLD_L : 'rgba(255,255,255,0.5)' }}>{label}</span>
            </div>
            <span className="text-xs pl-7" style={{ color: postType === type ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)' }}>{sub}</span>
          </button>
        ))}
      </div>

      {postType === 'media' && (
        <>
          <div>
            <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">Post to</div>
            {integrations.length === 0 ? (
              <div className="text-sm text-white/30 py-2 px-3 rounded-xl border" style={{ borderColor: BORDER }}>No channels connected yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {integrations.map(int => {
                  const selected = selectedIntegrations.includes(int.id);
                  const p = PLATFORMS[int.identifier as PlatformId];
                  return (
                    <button key={int.id}
                      onClick={() => {
                        setSelectedIntegrations(prev => prev.includes(int.id) ? prev.filter(x => x !== int.id) : [...prev, int.id]);
                        setGeneratedCaptions(null);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition"
                      style={{ borderColor: selected ? (p?.color || GOLD) : BORDER, background: selected ? (p?.bg || `${GOLD}15`) : 'transparent', color: selected ? (p?.color || GOLD) : 'rgba(255,255,255,0.4)' }}>
                      <PlatformIcon id={int.profile || int.identifier} size="sm" />
                      <span className="max-w-[90px] truncate text-xs">{int.name}</span>
                      {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-bold text-white/25 uppercase tracking-wider mr-1">Add media</span>
            <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg border hover:bg-white/8 text-white/40 hover:text-white text-xs font-bold transition" style={{ borderColor: BORDER }}>
              <Image className="w-3.5 h-3.5" /> Image
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  setImageFiles(files);
                  setImageUploads(files.map(() => ({ status: 'idle' })));
                  files.forEach((f, i) => uploadFileForPost(f, 'image', s => setImageUploads(prev => prev.map((x, xi) => xi === i ? s : x))));
                }} />
            </label>
            <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg border hover:bg-white/8 text-white/40 hover:text-white text-xs font-bold transition" style={{ borderColor: BORDER }}>
              <Video className="w-3.5 h-3.5" /> Video
              <input type="file" accept="video/*" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) {
                    if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
                    const url = URL.createObjectURL(f);
                    setVideoFile(f); setVideoObjectUrl(url);
                    setVideoUpload({ status: 'preparing' });
                    setTimeout(() => uploadFileForPost(f, 'video', setVideoUpload), 0);
                  }
                }} />
            </label>
          </div>

          {(imageFiles.length > 0 || videoFile) && (
            <div className="space-y-3">
              {videoFile && videoObjectUrl && (
                <VideoPreviewCard file={videoFile} objectUrl={videoObjectUrl} uploadState={videoUpload}
                  onRemove={() => { URL.revokeObjectURL(videoObjectUrl); setVideoFile(null); setVideoObjectUrl(null); setVideoUpload({ status: 'idle' }); }} />
              )}
              {imageFiles.length === 1 && (
                <ImagePreviewCard file={imageFiles[0]} uploadState={imageUploads[0] ?? { status: 'idle' }}
                  onRemove={() => { setImageFiles([]); setImageUploads([]); }} />
              )}
              {imageFiles.length > 1 && (
                <div className="grid grid-cols-2 gap-2">
                  {imageFiles.map((f, i) => (
                    <ImagePreviewCard key={i} file={f} uploadState={imageUploads[i] ?? { status: 'idle' }}
                      onRemove={() => { setImageFiles(prev => prev.filter((_, xi) => xi !== i)); setImageUploads(prev => prev.filter((_, xi) => xi !== i)); }} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">Caption</div>
            <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${BORDER}` }}>
              {([['manual', '✏️ Write Manually'], ['ai', '✨ AI per Platform']] as const).map(([t, label]) => (
                <button key={t} onClick={() => { setCaptionType(t); setGeneratedCaptions(null); }}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition"
                  style={{ background: captionType === t ? `${GOLD}18` : 'transparent', border: `1px solid ${captionType === t ? GOLD : 'transparent'}`, color: captionType === t ? GOLD_L : 'rgba(255,255,255,0.35)' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {captionType === 'manual' && (
            <div className="space-y-3">
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                <textarea value={content} onChange={e => setContent(e.target.value)}
                  placeholder={isYouTubeSelected ? 'Write your YouTube description here…' : 'Write your caption here…'} rows={5}
                  className="w-full bg-transparent px-4 pt-4 pb-2 text-sm text-white placeholder-white/20 outline-none resize-none" />
                <div className="flex items-center justify-end px-4 py-2 border-t" style={{ borderColor: BORDER }}>
                  <span className="text-xs" style={{ color: content.length > 280 ? '#f87171' : 'rgba(255,255,255,0.2)' }}>{content.length} chars</span>
                </div>
              </div>
              {isYouTubeSelected && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider">YouTube Title <span className="text-red-400">*</span></div>
                  <input
                    value={youTubeTitle}
                    onChange={e => setYouTubeTitle(e.target.value.slice(0, 100))}
                    placeholder="Video title (required for YouTube, max 100 chars)…"
                    maxLength={100}
                    className="w-full rounded-xl border bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none"
                    style={{ borderColor: youTubeTitle ? `${GOLD}50` : BORDER }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/25">{youTubeTitle.length}/100</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {captionType === 'ai' && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${GOLD}30`, background: `${GOLD}05` }}>
              <div className="px-4 pt-4 pb-3 space-y-3">
                <div className="flex gap-2">
                  {([['from_video', '🎙 From Video'], ['from_description', '📝 From Description']] as const).map(([m, label]) => (
                    <button key={m} onClick={() => setCaptionMode(m)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition"
                      style={{ borderColor: captionMode === m ? GOLD : BORDER, background: captionMode === m ? `${GOLD}12` : 'transparent', color: captionMode === m ? GOLD_L : 'rgba(255,255,255,0.3)' }}>
                      {label}
                    </button>
                  ))}
                </div>
                {captionMode === 'from_video' && !videoFile && <div className="text-xs text-amber-400/70 px-1">⚠️ Add a video above first — AI will transcribe it to write captions</div>}
                {captionMode === 'from_video' && videoFile && videoUpload.status === 'uploading' && <div className="text-xs px-1" style={{ color: GOLD }}>⏳ Uploading ({(videoUpload as any).progress ?? 0}%)…</div>}
                {captionMode === 'from_video' && videoFile && videoUpload.status === 'done' && <div className="text-xs text-green-400/80 px-1">✓ Video ready — click Generate below</div>}
                {captionMode === 'from_description' && (
                  <textarea value={aiDescription} onChange={e => setAiDescription(e.target.value)}
                    placeholder="Describe your video or content — topic, key points, your offer…" rows={3}
                    className="w-full rounded-lg border bg-black/30 px-3 py-2.5 text-xs text-white placeholder-white/25 outline-none resize-none" style={{ borderColor: BORDER }} />
                )}
                <input value={aiTone} onChange={e => setAiTone(e.target.value)}
                  placeholder="Tone (optional): casual, alex hormozi, luxury, funny…"
                  className="w-full rounded-lg border bg-black/30 px-3 py-2 text-xs text-white placeholder-white/25 outline-none" style={{ borderColor: BORDER }} />
                {selectedIntegrations.length === 0 && <div className="text-xs text-amber-400/70 px-1">⚠️ Select at least one channel above to generate captions for those platforms</div>}
                <button onClick={handleAiGenerate} disabled={aiLoading || selectedIntegrations.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 transition hover:brightness-110"
                  style={{ background: GOLD, color: '#000' }}>
                  {aiLoading ? <><Loader className="w-3.5 h-3.5 animate-spin" /> {captionMode === 'from_video' ? 'Transcribing & Writing…' : 'Writing…'}</> : <><Sparkles className="w-3.5 h-3.5" /> Generate Captions for {selectedIntegrations.length || 'Selected'} Platform{selectedIntegrations.length !== 1 ? 's' : ''}</>}
                </button>
                {aiError && <div className="text-xs text-red-300 px-1">{aiError}</div>}
                {transcript && <TranscriptViewer transcript={transcript} />}
              </div>

              {generatedCaptions && Object.keys(generatedCaptions).length > 0 && (
                <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: BORDER }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Captions generated — edit if needed, then post</span>
                  </div>
                  {isYouTubeSelected && (
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${PLATFORMS.youtube.color}30` }}>
                      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: `${PLATFORMS.youtube.color}20`, background: PLATFORMS.youtube.bg }}>
                        <PlatformIcon id="youtube" size="sm" />
                        <span className="text-xs font-bold" style={{ color: PLATFORMS.youtube.color }}>YouTube — Title</span>
                        <span className="ml-auto text-[10px] text-white/25">{youTubeTitle.length}/100</span>
                      </div>
                      <input
                        value={youTubeTitle}
                        onChange={e => setYouTubeTitle(e.target.value.slice(0, 100))}
                        placeholder="Video title (required)…"
                        maxLength={100}
                        className="w-full bg-transparent px-3 py-2.5 text-xs text-white/80 outline-none"
                        style={{ background: 'rgba(0,0,0,0.15)' }}
                      />
                    </div>
                  )}
                  {Object.entries(generatedCaptions).map(([platform, caption]) => {
                    const integ = integrations.find(i => i.identifier === platform || i.identifier === platform.toLowerCase());
                    const p = PLATFORMS[platform as PlatformId];
                    const label = platform === 'youtube' ? 'YouTube — Description' : (p?.label || integ?.name || platform);
                    return (
                      <div key={platform} className="rounded-xl border overflow-hidden" style={{ borderColor: p?.color ? `${p.color}30` : BORDER }}>
                        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: p?.color ? `${p.color}20` : BORDER, background: p?.bg || 'rgba(0,0,0,0.2)' }}>
                          <PlatformIcon id={platform} size="sm" />
                          <span className="text-xs font-bold" style={{ color: p?.color || GOLD_L }}>{label}</span>
                          <span className="ml-auto text-[10px] text-white/25">{(caption as string).length} chars</span>
                        </div>
                        <textarea
                          value={caption as string}
                          onChange={e => setGeneratedCaptions(prev => prev ? { ...prev, [platform]: e.target.value } : prev)}
                          rows={platform === 'youtube' ? 3 : 4}
                          className="w-full bg-transparent px-3 py-2.5 text-xs text-white/80 outline-none resize-none placeholder-white/20"
                          style={{ background: 'rgba(0,0,0,0.15)' }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {scheduleSectionJsx}
        </>
      )}

      {postType === 'text' && (
        <>
          {/* ── Step 1: Choose which accounts to post to ── */}
          <div>
            <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">Post to</div>
            {textPostAccounts.length === 0 ? (
              <div className="text-sm text-white/30 py-2 px-3 rounded-xl border" style={{ borderColor: BORDER }}>
                No X, LinkedIn, or Threads account connected yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {textPostAccounts.map(({ integ, platform }) => {
                  const selected = selectedTextAccounts.includes(integ.id);
                  const p = PLATFORMS[platform];
                  return (
                    <button key={integ.id}
                      onClick={() => { toggleTextAccount(integ.id); setSubmitError(null); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border font-semibold transition"
                      style={{ borderColor: selected ? (p?.color || GOLD) : BORDER, background: selected ? (p?.bg || `${GOLD}15`) : 'transparent', color: selected ? (p?.color || GOLD) : 'rgba(255,255,255,0.4)' }}>
                      <PlatformIcon id={platform} size="sm" />
                      <span className="max-w-[90px] truncate text-xs">{integ.name}</span>
                      {selected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Step 2: Write manually OR use AI ── */}

          {/* Manual compose — always visible unless AI panel is open */}
          {!showTextAi && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
              <textarea
                value={xText}
                onChange={e => setXText(e.target.value)}
                placeholder="Write your post here — will be sent to all selected accounts above…"
                rows={6}
                className="w-full bg-transparent px-4 pt-4 pb-3 text-sm text-white placeholder-white/20 outline-none resize-none"
              />
              <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: BORDER }}>
                <span className="text-xs text-white/20">{xText.length} chars</span>
                {xText.length > 280 && <span className="text-xs text-amber-400/80 font-bold">⚠ Over X's 280 char limit</span>}
              </div>
            </div>
          )}

          {/* AI Generate section */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${GOLD}30`, background: `${GOLD}05` }}>
            <button onClick={() => { setShowTextAi(v => !v); }} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/4 transition">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>
                  {showTextAi ? 'Write Manually Instead' : '✨ AI Generate Posts'}
                </span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform text-white/30 ${showTextAi ? 'rotate-90' : ''}`} />
            </button>
            {showTextAi && (
              <div className="border-t px-4 pb-4 space-y-3" style={{ borderColor: BORDER }}>
                <p className="text-xs text-white/35 pt-3">
                  Generates <strong className="text-white/50">10 X posts</strong> &amp; <strong className="text-white/50">10 LinkedIn posts</strong>. Pick one, edit it, then post to your selected accounts above.
                </p>

                {/* Source mode */}
                <div className="flex gap-2">
                  {([['from_video', '🎙 From Video'], ['from_description', '📝 From Description']] as const).map(([m, label]) => (
                    <button key={m} onClick={() => setTextAiMode(m as any)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition"
                      style={{ borderColor: textAiMode === m ? GOLD : BORDER, background: textAiMode === m ? `${GOLD}12` : 'transparent', color: textAiMode === m ? GOLD_L : 'rgba(255,255,255,0.3)' }}>
                      {label}
                    </button>
                  ))}
                </div>

                {textAiMode === 'from_video' && (
                  !textAiVideo ? (
                    <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer hover:bg-white/3 transition" style={{ borderColor: BORDER }}>
                      <Video className="w-6 h-6 text-white/25" />
                      <span className="text-xs text-white/40">Click to select your talking video</span>
                      <input type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setTextAiVideo(f); }} />
                    </label>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-xl border text-xs" style={{ borderColor: BORDER }}>
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-white/60 truncate flex-1">{textAiVideo.name}</span>
                      <button onClick={() => setTextAiVideo(null)} className="text-white/30 hover:text-white transition shrink-0"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )
                )}
                {textAiMode === 'from_description' && (
                  <textarea value={textAiDesc} onChange={e => setTextAiDesc(e.target.value)}
                    placeholder="Describe what you want to post about — topic, key points, your offer…" rows={3}
                    className="w-full rounded-lg border bg-black/30 px-3 py-2.5 text-xs text-white placeholder-white/25 outline-none resize-none" style={{ borderColor: BORDER }} />
                )}
                <input value={textAiTone} onChange={e => setTextAiTone(e.target.value)}
                  placeholder="Tone (optional): casual, alex hormozi, luxury, professional…"
                  className="w-full rounded-lg border bg-black/30 px-3 py-2 text-xs text-white placeholder-white/25 outline-none" style={{ borderColor: BORDER }} />
                {textAiError && <div className="text-xs text-red-300 px-1">{textAiError}</div>}
                <button onClick={handleTextAiGenerate} disabled={textAiLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 transition hover:brightness-110"
                  style={{ background: GOLD, color: '#000' }}>
                  {textAiLoading
                    ? <><Loader className="w-3.5 h-3.5 animate-spin" />{textAiMode === 'from_video' ? 'Transcribing…' : 'Generating…'}</>
                    : <><Sparkles className="w-3.5 h-3.5" /> Generate 10 Posts Each</>}
                </button>

                {textAiPosts && (
                  <div className="space-y-3 pt-1">
                    {/* Tab: X posts vs LinkedIn posts */}
                    <div className="flex gap-2">
                      {([['twitter', 'x'] , ['linkedin', 'linkedin']] as [string, PlatformId][]).map(([key, iconId]) => (
                        <button key={key} onClick={() => { setTextTab(key as any); setEditingIdx(null); }}
                          className="flex-1 py-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5"
                          style={{ borderColor: textTab === key ? GOLD : BORDER, background: textTab === key ? `${GOLD}15` : 'transparent', color: textTab === key ? GOLD_L : 'rgba(255,255,255,0.3)' }}>
                          <PlatformIcon id={iconId} size="sm" />
                          {key === 'twitter'
                            ? `X Posts (${textAiPosts.twitter.length})`
                            : `LinkedIn Posts (${textAiPosts.linkedin.length})`}
                        </button>
                      ))}
                    </div>

                    <div className="text-xs text-white/25">Click a post to select it · click ✏️ to edit inline</div>

                    <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                      {(textTab === 'twitter' ? textAiPosts.twitter : textAiPosts.linkedin).map((post, idx) => {
                        const platform = textTab as 'twitter' | 'linkedin';
                        const isSel     = textAiSelected[platform] === idx;
                        const isEditing = editingIdx?.tab === platform && editingIdx?.idx === idx;
                        const liveText  = isEditing ? aiEditText : post;

                        return (
                          <div key={idx} className="relative rounded-xl border overflow-hidden transition"
                            style={{ borderColor: isSel ? GOLD : BORDER, background: isSel ? `${GOLD}08` : 'rgba(0,0,0,0.2)' }}>

                            {/* Edit button — top right */}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (isEditing) {
                                  // save edits back into the post list
                                  if (textAiPosts) {
                                    const updated = { ...textAiPosts };
                                    updated[platform] = [...updated[platform]];
                                    updated[platform][idx] = aiEditText;
                                    setTextAiPosts(updated);
                                  }
                                  setEditingIdx(null);
                                  // re-select with edited text if this was selected
                                  if (isSel) {
                                    if (platform === 'twitter') setXText(aiEditText); else setLinkedinText(aiEditText);
                                    setAiEditText(aiEditText);
                                  }
                                } else {
                                  setAiEditText(post);
                                  setEditingIdx({ tab: platform, idx });
                                }
                              }}
                              className="absolute top-2 right-2 z-10 w-6 h-6 rounded-md flex items-center justify-center transition hover:bg-white/10"
                              style={{ color: isEditing ? GOLD : 'rgba(255,255,255,0.25)' }}
                              title={isEditing ? 'Done editing' : 'Edit this post'}>
                              {isEditing ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Edit3 className="w-3 h-3" />}
                            </button>

                            {/* Card body — click to select */}
                            {isEditing ? (
                              <textarea
                                value={aiEditText}
                                onChange={e => setAiEditText(e.target.value)}
                                autoFocus
                                rows={5}
                                onClick={e => e.stopPropagation()}
                                className="w-full bg-transparent px-3 pt-3 pb-2 pr-8 text-xs text-white outline-none resize-none leading-relaxed"
                              />
                            ) : (
                              <div
                                onClick={() => useTextAiPost(platform, idx)}
                                className="px-3 pt-3 pb-2 pr-8 text-xs leading-relaxed cursor-pointer"
                                style={{ color: isSel ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)' }}>
                                {liveText}
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center gap-2 px-3 py-1.5 border-t" style={{ borderColor: BORDER }}>
                              <span className="text-[10px] text-white/20 font-bold">#{idx + 1}</span>
                              <span className="text-[10px] text-white/15">{liveText.length}c</span>
                              {isSel && !isEditing && (
                                <span className="ml-auto text-[10px] font-bold" style={{ color: GOLD }}>✓ Selected</span>
                              )}
                              {isEditing && (
                                <span className="ml-auto text-[10px] font-bold text-amber-400/70">editing…</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {scheduleSectionJsx}
        </>
      )}

      {submitError && (
        <div className="flex items-start gap-2 p-3 rounded-xl border text-sm text-red-200" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {submitError}
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={postType === 'media' ? handleMediaSubmit : handleTextSubmit}
        disabled={submitting || (postType === 'media' && submitOk)}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
        style={{ background: submitOk ? '#22c55e' : GOLD, color: '#000' }}>
        {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Posting…</>
          : submitOk ? <><CheckCircle2 className="w-4 h-4" /> {scheduleType === 'schedule' ? 'Scheduled!' : 'Posted!'}</>
          : postType === 'media'
            ? <><Send className="w-4 h-4" /> {scheduleType === 'schedule' ? 'Schedule Post' : 'Post Now'}</>
            : <><Send className="w-4 h-4" /> {scheduleType === 'schedule' ? `Schedule to ${selectedTextAccounts.length || 0} Account${selectedTextAccounts.length !== 1 ? 's' : ''}` : `Post to ${selectedTextAccounts.length || 0} Account${selectedTextAccounts.length !== 1 ? 's' : ''}`}</>}
      </button>
    </div>
  );
}

// ─── InlineContentIdeas ───────────────────────────────────────────────────────
// Inline content ideas panel with AI/manual toggle and save-to-planner

function InlineContentIdeas({ userId, onAddToPlanner }: {
  userId: string | null;
  onAddToPlanner?: (item: { title: string; notes?: string; category: string; sourceLabel: string }) => void;
}) {
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');

  // Manual entry state
  const [manualTitle, setManualTitle]   = useState('');
  const [manualNotes, setManualNotes]   = useState('');
  const [manualCategory, setManualCategory] = useState('idea');
  const [manualSaved, setManualSaved]   = useState(false);

  // AI state
  const [captionMode, setCaptionMode]   = useState<'from_video' | 'from_description'>('from_description');
  const [description, setDescription]   = useState('');
  const [tone, setTone]                 = useState('');
  const [videoFile, setVideoFile]       = useState<File | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [ideas, setIdeas]               = useState<any | null>(null);
  const [added, setAdded]               = useState<Set<string>>(new Set());

  const CATEGORY_COLORS: Record<string, string> = {
    idea: GOLD, short_clip: '#a78bfa', hook: '#38bdf8', blog: '#86efac', other: '#fb923c',
  };

  const CATEGORY_OPTIONS = [
    { value: 'idea', label: '💡 General Idea' },
    { value: 'short_clip', label: '🎬 Short Clip' },
    { value: 'hook', label: '🪝 Hook' },
    { value: 'blog', label: '✍️ Blog/Article' },
    { value: 'other', label: '📦 Other' },
  ];

  const handleManualSave = () => {
    if (!manualTitle.trim()) return;
    onAddToPlanner?.({
      title: manualTitle.trim(),
      notes: manualNotes.trim() || undefined,
      category: manualCategory,
      sourceLabel: 'Manual',
    });
    setManualSaved(true);
    setTimeout(() => {
      setManualSaved(false);
      setManualTitle('');
      setManualNotes('');
      setManualCategory('idea');
    }, 1500);
  };

  const handleAiGenerate = async () => {
    setLoading(true); setError(null); setIdeas(null); setAdded(new Set());
    try {
      let source = '';
      if (captionMode === 'from_video') {
        if (!videoFile) throw new Error('Select a video first');
        source = await transcribeVideo(videoFile);
      } else {
        if (!description.trim()) throw new Error('Enter a description of your video');
        source = description;
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-captions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'repurpose_ideas', description: source, tone }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setIdeas(data.ideas);
    } catch (e: any) { setError(e.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  const handleAdd = (key: string, title: string, notes: string | undefined, category: string, sourceLabel: string) => {
    if (added.has(key)) return;
    onAddToPlanner?.({ title, notes, category, sourceLabel });
    setAdded(prev => new Set([...prev, key]));
  };

  const reset = () => {
    setDescription(''); setTone(''); setVideoFile(null); setIdeas(null); setError(null); setAdded(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${BORDER}` }}>
        <button onClick={() => setMode('manual')}
          className="flex-1 py-2 rounded-lg text-xs font-bold transition"
          style={{ background: mode === 'manual' ? `${GOLD}18` : 'transparent', border: `1px solid ${mode === 'manual' ? GOLD : 'transparent'}`, color: mode === 'manual' ? GOLD_L : 'rgba(255,255,255,0.35)' }}>
          ✏️ Manual Entry
        </button>
        <button onClick={() => setMode('ai')}
          className="flex-1 py-2 rounded-lg text-xs font-bold transition"
          style={{ background: mode === 'ai' ? `${GOLD}18` : 'transparent', border: `1px solid ${mode === 'ai' ? GOLD : 'transparent'}`, color: mode === 'ai' ? GOLD_L : 'rgba(255,255,255,0.35)' }}>
          ✨ AI Generate
        </button>
      </div>

      {/* ── Manual Entry ── */}
      {mode === 'manual' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-white/30 uppercase tracking-wider">Idea Title</label>
            <input
              value={manualTitle}
              onChange={e => setManualTitle(e.target.value)}
              placeholder="What's the content idea?"
              className="mt-1.5 w-full rounded-xl border bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
              style={{ borderColor: BORDER }}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-white/30 uppercase tracking-wider">Notes <span className="font-normal opacity-50">(optional)</span></label>
            <textarea
              value={manualNotes}
              onChange={e => setManualNotes(e.target.value)}
              placeholder="Any angles, references, key points…"
              rows={3}
              className="mt-1.5 w-full rounded-xl border bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none resize-none"
              style={{ borderColor: BORDER }}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-white/30 uppercase tracking-wider">Category</label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {CATEGORY_OPTIONS.map(cat => {
                const col = CATEGORY_COLORS[cat.value] || GOLD;
                return (
                  <button key={cat.value} onClick={() => setManualCategory(cat.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border transition"
                    style={{
                      borderColor: manualCategory === cat.value ? col : BORDER,
                      background: manualCategory === cat.value ? `${col}18` : 'transparent',
                      color: manualCategory === cat.value ? col : 'rgba(255,255,255,0.35)',
                    }}>
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={handleManualSave}
            disabled={!manualTitle.trim() || manualSaved || !userId}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110 flex items-center justify-center gap-2"
            style={{ background: manualSaved ? '#22c55e' : GOLD, color: '#000' }}>
            {manualSaved
              ? <><CheckCircle2 className="w-4 h-4" /> Saved to Planner!</>
              : <><Plus className="w-4 h-4" /> Save to Content Planner</>}
          </button>
          {!userId && <p className="text-xs text-amber-400/70 text-center">Sign in to save ideas to the planner</p>}
        </div>
      )}

      {/* ── AI Generate ── */}
      {mode === 'ai' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {([['from_video', '🎙 From Video'], ['from_description', '📝 From Description']] as const).map(([m, label]) => (
              <button key={m} onClick={() => setCaptionMode(m)} className="flex-1 py-2 rounded-lg text-xs font-bold border transition"
                style={{ borderColor: captionMode === m ? GOLD : BORDER, background: captionMode === m ? `${GOLD}15` : 'transparent', color: captionMode === m ? GOLD_L : 'rgba(255,255,255,0.35)' }}>
                {label}
              </button>
            ))}
          </div>
          {captionMode === 'from_video' && (
            !videoFile ? (
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer hover:bg-white/3 transition" style={{ borderColor: BORDER }}>
                <Video className="w-6 h-6 text-white/25" />
                <span className="text-xs text-white/40">Click to select your talking video</span>
                <input type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setVideoFile(f); }} />
              </label>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl border text-xs" style={{ borderColor: BORDER }}>
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-white/60 truncate flex-1">{videoFile.name}</span>
                <button onClick={() => setVideoFile(null)} className="text-white/30 hover:text-white transition shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            )
          )}
          {captionMode === 'from_description' && (
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe your video — what you talked about, main points, key takeaways…" rows={4}
              className="w-full rounded-xl border bg-black/30 px-4 py-3 text-sm text-white placeholder-white/25 outline-none resize-none" style={{ borderColor: BORDER }} />
          )}
          <input value={tone} onChange={e => setTone(e.target.value)}
            placeholder="Tone (optional): casual, alex hormozi, luxury, professional…"
            className="w-full rounded-xl border bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none" style={{ borderColor: BORDER }} />
          {error && <div className="text-xs text-red-300">{error}</div>}
          {!ideas && (
            <button onClick={handleAiGenerate} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
              style={{ background: GOLD, color: '#000' }}>
              {loading
                ? <span className="flex items-center justify-center gap-2"><Loader className="w-4 h-4 animate-spin" />{captionMode === 'from_video' ? 'Processing & Transcribing…' : 'Generating Ideas…'}</span>
                : <span className="flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /> Generate Ideas</span>}
            </button>
          )}

          {ideas && (
            <div className="space-y-5">
              {ideas.short_clips?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">🎬 Short Clip Ideas</div>
                  <div className="space-y-2">
                    {ideas.short_clips.map((clip: any, i: number) => {
                      const key = `clip-${i}`;
                      return (
                        <div key={i} className="p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-white">{clip.title}</div>
                              <div className="text-xs text-white/45 mt-1">{clip.angle}</div>
                              <div className="text-xs font-semibold mt-1.5" style={{ color: GOLD }}>{clip.platform}</div>
                            </div>
                            <button onClick={() => handleAdd(key, clip.title, clip.angle, 'short_clip', 'Short Clip')}
                              className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition"
                              style={{ background: added.has(key) ? 'rgba(34,197,94,0.15)' : `${GOLD}15`, color: added.has(key) ? '#86efac' : GOLD_L }}>
                              {added.has(key) ? '✓ Added' : '+ Planner'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {ideas.social_hooks?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">🪝 Hook Ideas</div>
                  <div className="space-y-1.5">
                    {ideas.social_hooks.map((hook: string, i: number) => {
                      const key = `hook-${i}`;
                      return (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                          <p className="flex-1 text-sm text-white/60 leading-relaxed">{hook}</p>
                          <button onClick={() => handleAdd(key, hook, undefined, 'hook', 'Hook Idea')}
                            className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition"
                            style={{ background: added.has(key) ? 'rgba(34,197,94,0.15)' : `${GOLD}15`, color: added.has(key) ? '#86efac' : GOLD_L }}>
                            {added.has(key) ? '✓ Added' : '+ Planner'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {ideas.blog_angles?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">✍️ Blog / Article Angles</div>
                  <div className="space-y-2">
                    {ideas.blog_angles.map((b: any, i: number) => {
                      const key = `blog-${i}`;
                      return (
                        <div key={i} className="p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-white">{b.headline}</div>
                              <div className="text-xs text-white/45 mt-1">{b.angle}</div>
                            </div>
                            <button onClick={() => handleAdd(key, b.headline, b.angle, 'blog', 'Blog Angle')}
                              className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition"
                              style={{ background: added.has(key) ? 'rgba(34,197,94,0.15)' : `${GOLD}15`, color: added.has(key) ? '#86efac' : GOLD_L }}>
                              {added.has(key) ? '✓ Added' : '+ Planner'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {ideas.other_formats?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">📦 Other Formats</div>
                  <div className="space-y-2">
                    {ideas.other_formats.map((f: any, i: number) => {
                      const key = `other-${i}`;
                      return (
                        <div key={i} className="p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-white">{f.format}</div>
                              <div className="text-xs text-white/45 mt-1">{f.concept}</div>
                            </div>
                            <button onClick={() => handleAdd(key, f.format, f.concept, 'other', 'Other Format')}
                              className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold transition"
                              style={{ background: added.has(key) ? 'rgba(34,197,94,0.15)' : `${GOLD}15`, color: added.has(key) ? '#86efac' : GOLD_L }}>
                              {added.has(key) ? '✓ Added' : '+ Planner'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <button onClick={reset} className="w-full py-2.5 rounded-xl text-xs font-bold border transition hover:bg-white/5"
                style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
                ↺ Generate New Ideas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PlannerPanel ─────────────────────────────────────────────────────────────

function PlannerPanel({ userId }: { userId: string | null }) {
  const [currentDate, setCurrentDate]   = useState(new Date());
  const [items, setItems]               = useState<PlannerItem[]>([]);
  const [loading, setLoading]           = useState(false);
  const [selectedDay, setSelectedDay]   = useState<number | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDate, setAddDate]           = useState('');
  const [repurposeOpen, setRepurposeOpen] = useState(false);
  const [pendingItem, setPendingItem]   = useState<{ title: string; notes?: string; category: string; sourceLabel: string } | null>(null);

  const year        = currentDate.getFullYear();
  const month       = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const monthName   = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const today       = new Date();

  const loadItems = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_planner')
        .select('*')
        .eq('supabase_user_id', userId)
        .gte('planned_date', `${year}-${String(month + 1).padStart(2, '0')}-01`)
        .lte('planned_date', `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`);
      if (!error && data) {
        setItems(data.map((r: any) => ({
          id: r.id, title: r.title, notes: r.notes,
          plannedDate: r.planned_date, plannedTime: r.planned_time,
          category: r.category || 'idea', sourceLabel: r.source_label,
        })));
      }
    } catch (e) {}
    finally { setLoading(false); }
  }, [userId, year, month, daysInMonth]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const itemsOnDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return items.filter(it => it.plannedDate === dateStr)
      .sort((a, b) => (a.plannedTime || '23:59') < (b.plannedTime || '23:59') ? -1 : 1);
  };

  const deleteItem = async (id: string) => {
    await supabase.from('content_planner').delete().eq('id', id);
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleAddToPlanner = (item: { title: string; notes?: string; category: string; sourceLabel: string }) => {
    setPendingItem(item);
    setAddDate(today.toISOString().split('T')[0]);
    setRepurposeOpen(false);
    setAddModalOpen(true);
  };

  const CATEGORY_COLORS: Record<string, string> = {
    idea: GOLD, short_clip: '#a78bfa', hook: '#38bdf8', blog: '#86efac', other: '#fb923c',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm md:text-base font-bold text-white w-32 md:w-44 text-center">{monthName}</span>
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="px-2 py-1 rounded-lg text-xs font-bold border hover:bg-white/8 transition"
            style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
            Today
          </button>
          {loading && <Loader className="w-4 h-4 animate-spin text-white/20" />}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setRepurposeOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition hover:bg-white/5"
            style={{ borderColor: `${GOLD}35`, color: GOLD }}>
            <Sparkles className="w-3.5 h-3.5" /> AI Ideas
          </button>
          <button onClick={() => setRepurposeOpen(true)}
            className="sm:hidden w-9 h-9 rounded-xl flex items-center justify-center border transition hover:bg-white/5"
            style={{ borderColor: `${GOLD}35`, color: GOLD }}>
            <Sparkles className="w-4 h-4" />
          </button>
          <button onClick={() => { setAddDate(today.toISOString().split('T')[0]); setPendingItem(null); setAddModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition hover:brightness-110"
            style={{ background: GOLD, color: '#000' }}>
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Idea</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b shrink-0" style={{ borderColor: BORDER }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2 text-center text-[10px] md:text-xs font-bold text-white/25 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-7" style={{ gridAutoRows: 'minmax(64px, 1fr)' }}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} className="border-r border-b" style={{ borderColor: BORDER, background: 'rgba(255,255,255,0.01)' }} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day      = i + 1;
          const dayItems = itemsOnDay(day);
          const isToday  = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          const isWeekend = [0, 6].includes(new Date(year, month, day).getDay());
          const visibleItems = dayItems.slice(0, 2);
          const overflow     = dayItems.length - visibleItems.length;

          return (
            <div key={day}
              className="border-r border-b p-1 cursor-pointer hover:bg-white/3 transition group relative"
              style={{ borderColor: BORDER, background: isWeekend ? 'rgba(255,255,255,0.01)' : 'transparent' }}
              onClick={() => {
                if (dayItems.length > 0) {
                  setSelectedDay(day); setDayModalOpen(true);
                } else {
                  setAddDate(`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
                  setPendingItem(null); setAddModalOpen(true);
                }
              }}>
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold mb-1 shrink-0"
                style={isToday ? { background: GOLD, color: '#000' } : { color: isWeekend ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)' }}>
                {day}
              </div>
              {dayItems.length > 0 && (
                <div className="md:hidden flex items-center gap-0.5 flex-wrap">
                  {dayItems.slice(0, 3).map(item => {
                    const col = CATEGORY_COLORS[item.category] || GOLD;
                    return <span key={item.id} className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col }} />;
                  })}
                  {dayItems.length > 3 && (
                    <span className="text-[8px] font-bold leading-none" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      +{dayItems.length - 3}
                    </span>
                  )}
                </div>
              )}
              <div className="hidden md:block space-y-0.5">
                {visibleItems.map(item => {
                  const col = CATEGORY_COLORS[item.category] || GOLD;
                  return (
                    <div key={item.id}
                      className="flex items-center gap-1 rounded px-1 py-0.5"
                      style={{ background: `${col}18` }}>
                      <span className="text-[9px] shrink-0" style={{ color: `${col}99` }}>
                        {item.plannedTime ? item.plannedTime.slice(0, 5) : ''}
                      </span>
                      <span className="truncate text-[10px] font-medium leading-tight" style={{ color: col }}>
                        {item.title}
                      </span>
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <div className="text-[10px] font-bold pl-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    +{overflow} more
                  </div>
                )}
              </div>
              {dayItems.length === 0 && (
                <div className="opacity-0 group-hover:opacity-100 transition absolute bottom-1 right-1">
                  <Plus className="w-2.5 h-2.5 text-white/20" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {dayModalOpen && selectedDay !== null && (
        <DayDetailModal
          day={selectedDay} month={month} year={year}
          items={itemsOnDay(selectedDay)}
          onClose={() => setDayModalOpen(false)}
          onDelete={deleteItem}
          onAdd={() => {
            setAddDate(`${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`);
            setPendingItem(null); setDayModalOpen(false); setAddModalOpen(true);
          }}
          categoryColors={CATEGORY_COLORS}
        />
      )}

      {addModalOpen && (
        <AddPlannerItemModal
          userId={userId}
          initialDate={addDate}
          prefilled={pendingItem ?? undefined}
          onClose={() => { setAddModalOpen(false); setPendingItem(null); }}
          onSaved={() => { setAddModalOpen(false); setPendingItem(null); loadItems(); }}
        />
      )}

      {repurposeOpen && (
        <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRepurposeOpen(false)} />
          <div className="relative w-full md:max-w-xl rounded-t-2xl md:rounded-2xl border overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            style={{ background: SURFACE, borderColor: BORDER }}>
            <div className="flex items-center justify-between px-6 py-5 border-b shrink-0" style={{ borderColor: BORDER }}>
              <div>
                <h2 className="text-base font-bold text-white">♻️ Content Ideas</h2>
                <p className="text-sm text-white/40 mt-0.5">Find new angles — add directly to your planner</p>
              </div>
              <button onClick={() => setRepurposeOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <InlineContentIdeas userId={userId} onAddToPlanner={handleAddToPlanner} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DayDetailModal ───────────────────────────────────────────────────────────

function DayDetailModal({ day, month, year, items, onClose, onDelete, onAdd, categoryColors }: {
  day: number; month: number; year: number;
  items: PlannerItem[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  categoryColors: Record<string, string>;
}) {
  const dateLabel = new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl border overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
        style={{ background: SURFACE, borderColor: BORDER }}>
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
          <div>
            <div className="text-sm font-black text-white">{dateLabel}</div>
            <div className="text-xs text-white/35 mt-0.5">{items.length} idea{items.length !== 1 ? 's' : ''} planned</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition hover:brightness-110"
              style={{ background: GOLD, color: '#000' }}>
              <Plus className="w-3 h-3" /> Add
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {items
            .sort((a, b) => (a.plannedTime || '23:59') < (b.plannedTime || '23:59') ? -1 : 1)
            .map(item => {
              const col = categoryColors[item.category] || GOLD;
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: BORDER }}>
                  <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: col }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white leading-snug">{item.title}</span>
                      {item.sourceLabel && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${col}18`, color: col }}>
                          {item.sourceLabel}
                        </span>
                      )}
                    </div>
                    {item.notes && <p className="text-xs text-white/40 mt-1 leading-relaxed">{item.notes}</p>}
                    {item.plannedTime && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-white/30">
                        <Clock className="w-3 h-3" />
                        {item.plannedTime.slice(0, 5)}
                      </div>
                    )}
                  </div>
                  <button onClick={() => onDelete(item.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/20 text-white/20 hover:text-red-400 transition shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ─── AddPlannerItemModal ──────────────────────────────────────────────────────

function AddPlannerItemModal({ userId, initialDate, prefilled, onClose, onSaved }: {
  userId: string | null;
  initialDate: string;
  prefilled?: { title: string; notes?: string; category: string; sourceLabel: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle]       = useState(prefilled?.title || '');
  const [notes, setNotes]       = useState(prefilled?.notes || '');
  const [date, setDate]         = useState(initialDate);
  const [time, setTime]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const category                = prefilled?.category || 'idea';
  const sourceLabel             = prefilled?.sourceLabel;

  const handleSave = async () => {
    if (!title.trim()) { setError('Add a title for this idea'); return; }
    if (!date)         { setError('Pick a date'); return; }
    if (!userId)       { setError('Not logged in'); return; }
    setSaving(true); setError(null);
    try {
      const { error: dbErr } = await supabase.from('content_planner').insert({
        supabase_user_id: userId,
        title: title.trim(),
        notes: notes.trim() || null,
        planned_date: date,
        planned_time: time || null,
        category,
        source_label: sourceLabel || 'Manual',
      });
      if (dbErr) throw new Error(dbErr.message);
      onSaved();
    } catch (e: any) { setError(e.message || 'Save failed'); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center md:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-sm rounded-t-2xl md:rounded-2xl border overflow-hidden shadow-2xl flex flex-col"
        style={{ background: SURFACE, borderColor: BORDER }}>
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
          <div className="text-sm font-black text-white">
            {prefilled ? `Add to Planner — ${prefilled.sourceLabel}` : 'Add Idea to Planner'}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-3">
          <div>
            <label className="text-xs font-bold text-white/35 uppercase tracking-wider">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What's the idea?" autoFocus
              className="mt-1.5 w-full rounded-xl border bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
              style={{ borderColor: BORDER }} />
          </div>
          <div>
            <label className="text-xs font-bold text-white/35 uppercase tracking-wider">Notes <span className="font-normal opacity-50">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any details, angles, references…" rows={3}
              className="mt-1.5 w-full rounded-xl border bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none resize-none"
              style={{ borderColor: BORDER }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-white/35 uppercase tracking-wider">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border bg-black/30 px-3 py-2.5 text-sm text-white outline-none"
                style={{ borderColor: BORDER, colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="text-xs font-bold text-white/35 uppercase tracking-wider">Time <span className="font-normal opacity-50">(optional)</span></label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="mt-1.5 w-full rounded-xl border bg-black/30 px-3 py-2.5 text-sm text-white outline-none"
                style={{ borderColor: BORDER, colorScheme: 'dark' }} />
            </div>
          </div>
          {error && <div className="text-xs text-red-300">{error}</div>}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
            style={{ background: GOLD, color: '#000' }}>
            {saving ? <span className="flex items-center justify-center gap-2"><Loader className="w-4 h-4 animate-spin" /> Saving…</span> : 'Save to Planner'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ComposerPanel ────────────────────────────────────────────────────────────
// Two-column layout: Create Post (left) | Content Ideas (right)
// No "Your Channels" section — that's in the sidebar.

function ComposerPanel({ integrations, userId }: { integrations: PostizIntegration[]; userId: string | null }) {
  const [logOpen, setLogOpen]             = useState(false);
  const [logFilter, setLogFilter]         = useState<'all' | 'scheduled' | 'published' | 'failed'>('all');
  const [posts, setPosts]                 = useState<ScheduledPost[]>([]);
  const [loading, setLoading]             = useState(false);
  const [addModalOpen, setAddModalOpen]   = useState(false);
  const [addDate]                         = useState(() => new Date().toISOString().split('T')[0]);
  const [pendingItem, setPendingItem]     = useState<{ title: string; notes?: string; category: string; sourceLabel: string } | null>(null);

  const loadPosts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const end   = new Date(); end.setMonth(end.getMonth() + 3);
      const start = new Date(); start.setMonth(start.getMonth() - 1);
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/ayrshare-scheduled?userId=${encodeURIComponent(userId)}&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`);
      const data = res.ok ? await res.json() : { posts: [] };
      const list = Array.isArray(data?.posts) ? data.posts : [];
      setPosts(list.map((p: any) => {
        const scheduledAt = new Date(p.scheduledAt);
        return { id: p.id, content: p.content || '', platforms: Array.isArray(p.platforms) ? p.platforms : [], scheduledAt, status: resolveStatus(p.status || 'scheduled', scheduledAt) };
      }));
    } catch (e) {}
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const counts = {
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
    failed:    posts.filter(p => p.status === 'failed').length,
  };

  const handleAddToPlanner = (item: { title: string; notes?: string; category: string; sourceLabel: string }) => {
    setPendingItem(item);
    setAddModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full">

      {/* ── Stat counters ── */}
      <div className="grid grid-cols-3 border-b shrink-0" style={{ borderColor: BORDER }}>
        {([
          { key: 'scheduled' as const, label: 'Scheduled', color: GOLD },
          { key: 'published' as const, label: 'Published',  color: '#22c55e' },
          { key: 'failed'    as const, label: 'Failed',     color: '#ef4444' },
        ]).map((s, i) => (
          <button key={s.key}
            onClick={() => { setLogFilter(s.key); setLogOpen(true); }}
            className={`flex flex-col items-center justify-center py-3 md:py-4 transition hover:bg-white/4 ${i < 2 ? 'border-r' : ''}`}
            style={{ borderColor: BORDER }}>
            <div className="text-xl md:text-2xl font-black" style={{ color: s.color }}>
              {loading ? <Loader className="w-4 h-4 animate-spin opacity-30" /> : counts[s.key]}
            </div>
            <div className="text-[10px] md:text-xs font-semibold text-white/30 mt-0.5">{s.label}</div>
            <div className="text-[9px] text-white/20 mt-0.5">View log →</div>
          </button>
        ))}
      </div>

      {/* ── Main two-column layout ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x min-h-full" style={{ '--tw-divide-opacity': 1 } as any}>

          {/* Left column: Create Post */}
          <div className="px-4 md:px-6 py-6 space-y-1" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_L})` }}>
                <Send className="w-4 h-4 text-black" />
              </div>
              <div>
                <div className="text-sm font-black text-white">Create Post</div>
                <div className="text-xs text-white/35">Write, upload & schedule to your channels</div>
              </div>
            </div>
            <InlinePostComposer integrations={integrations} userId={userId} onSuccess={loadPosts} />
          </div>

          {/* Right column: Content Ideas */}
          <div className="px-4 md:px-6 py-6 border-t lg:border-t-0" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, #a78bfa, #7c3aed)` }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-black text-white">Content Ideas</div>
                <div className="text-xs text-white/35">Generate or add ideas — save to your planner</div>
              </div>
            </div>
            <InlineContentIdeas userId={userId} onAddToPlanner={handleAddToPlanner} />
          </div>
        </div>
      </div>

      {/* Modals */}
      <PostLogModal open={logOpen} onClose={() => setLogOpen(false)} userId={userId} initialFilter={logFilter} />

      {addModalOpen && (
        <AddPlannerItemModal
          userId={userId}
          initialDate={addDate}
          prefilled={pendingItem ?? undefined}
          onClose={() => { setAddModalOpen(false); setPendingItem(null); }}
          onSaved={() => { setAddModalOpen(false); setPendingItem(null); }}
        />
      )}
    </div>
  );
}

// ─── CalendarView ─────────────────────────────────────────────────────────────

function CalendarView({ integrations, userId }: { integrations: PostizIntegration[]; userId: string | null }) {
  const [posts, setPosts]               = useState<ScheduledPost[]>([]);
  const [loading, setLoading]           = useState(false);
  const [currentDate, setCurrentDate]   = useState(new Date());
  const [selectedDay, setSelectedDay]   = useState<number | null>(null);
  const [dayLogOpen, setDayLogOpen]     = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerDate, setComposerDate] = useState<Date | undefined>();

  const year        = currentDate.getFullYear();
  const month       = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const monthName   = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const today       = new Date();

  const loadPosts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const start = new Date(year, month, 1).toISOString();
      const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const res   = await fetch(`${SUPABASE_URL}/functions/v1/ayrshare-scheduled?userId=${encodeURIComponent(userId)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      const data  = res.ok ? await res.json() : { posts: [] };
      const list  = Array.isArray(data?.posts) ? data.posts : [];
      setPosts(list.map((p: any) => {
        const scheduledAt = new Date(p.scheduledAt);
        return { id: p.id, content: p.content || '', platforms: Array.isArray(p.platforms) ? p.platforms : [], scheduledAt, status: resolveStatus(p.status || 'scheduled', scheduledAt) };
      }));
    } catch (e) {}
    finally { setLoading(false); }
  }, [userId, year, month]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const STATUS_COLOR = (s: string) => s === 'published' ? '#22c55e' : s === 'failed' ? '#ef4444' : GOLD;

  const postsOnDay = (day: number) =>
    posts.filter(p => {
      const d = p.scheduledAt;
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    }).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm md:text-base font-bold text-white w-32 md:w-44 text-center">{monthName}</span>
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="px-2 py-1 rounded-lg text-xs font-bold border hover:bg-white/8 transition"
            style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
            Today
          </button>
          {loading && <Loader className="w-4 h-4 animate-spin text-white/20" />}
        </div>
        <button onClick={() => { setComposerDate(undefined); setComposerOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold transition hover:brightness-110"
          style={{ background: GOLD, color: '#000' }}>
          <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="hidden sm:inline">New Post</span>
        </button>
      </div>

      <div className="grid grid-cols-7 border-b shrink-0" style={{ borderColor: BORDER }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2 text-center text-[10px] md:text-xs font-bold text-white/25 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-7" style={{ gridAutoRows: 'minmax(72px, 1fr)' }}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} className="border-r border-b" style={{ borderColor: BORDER, background: 'rgba(255,255,255,0.01)' }} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day       = i + 1;
          const dayPosts  = postsOnDay(day);
          const isToday   = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          const isWeekend = [0, 6].includes(new Date(year, month, day).getDay());
          const dotPosts  = dayPosts.slice(0, 4);
          const overflow  = dayPosts.length - dotPosts.length;

          return (
            <div key={day}
              className="border-r border-b p-1.5 transition hover:bg-white/3 group cursor-pointer relative"
              style={{ borderColor: BORDER, background: isWeekend ? 'rgba(255,255,255,0.01)' : 'transparent' }}
              onClick={() => dayPosts.length > 0
                ? (setSelectedDay(day), setDayLogOpen(true))
                : (setComposerDate(new Date(year, month, day, 10, 0)), setComposerOpen(true))}>
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold mb-1.5"
                style={isToday ? { background: GOLD, color: '#000' } : { color: isWeekend ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)' }}>
                {day}
              </div>
              {dayPosts.length > 0 && (
                <div className="flex flex-wrap gap-0.5 items-center">
                  {dotPosts.map(post => (
                    <span key={post.id} className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: STATUS_COLOR(post.status) }} />
                  ))}
                  {overflow > 0 && (
                    <span className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>
                      +{overflow}
                    </span>
                  )}
                </div>
              )}
              {dayPosts.length > 0 && (
                <div className="mt-1 text-[9px] font-semibold" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  {dayPosts.length} post{dayPosts.length !== 1 ? 's' : ''}
                </div>
              )}
              {dayPosts.length === 0 && (
                <div className="opacity-0 group-hover:opacity-100 transition absolute bottom-1 right-1">
                  <Plus className="w-2.5 h-2.5 text-white/20" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {dayLogOpen && selectedDay !== null && (() => {
        const dayPosts  = postsOnDay(selectedDay);
        const dateLabel = new Date(year, month, selectedDay)
          .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const STATUS_COLOR2 = (s: string) => s === 'published' ? '#22c55e' : s === 'failed' ? '#ef4444' : GOLD;
        const STATUS_BG2    = (s: string) => s === 'published' ? 'rgba(34,197,94,0.12)' : s === 'failed' ? 'rgba(239,68,68,0.12)' : `${GOLD}12`;
        return (
          <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDayLogOpen(false)} />
            <div className="relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl border overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
              style={{ background: SURFACE, borderColor: BORDER }}>
              <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
                <div>
                  <div className="text-sm font-black text-white">{dateLabel}</div>
                  <div className="text-xs text-white/35 mt-0.5">{dayPosts.length} post{dayPosts.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setComposerDate(new Date(year, month, selectedDay, 10, 0)); setDayLogOpen(false); setComposerOpen(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold hover:brightness-110 transition"
                    style={{ background: GOLD, color: '#000' }}>
                    <Plus className="w-3 h-3" /> Add Post
                  </button>
                  <button onClick={() => setDayLogOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {dayPosts.map(post => (
                  <div key={post.id} className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: BORDER }}>
                    <div className="flex -space-x-1 shrink-0 pt-0.5">
                      {post.platforms.slice(0, 3).map((pid, i2) => (
                        <div key={i2} className="rounded-full border-2" style={{ borderColor: SURFACE }}>
                          <PlatformIcon id={pid} size="sm" />
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 line-clamp-2">{post.content || '(No caption)'}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-white/25">
                        <Clock className="w-3 h-3" />
                        {post.scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded-lg text-xs font-bold shrink-0"
                      style={{ background: STATUS_BG2(post.status), color: STATUS_COLOR2(post.status) }}>
                      {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Calendar New Post modal — uses regular modal for calendar view */}
      {composerOpen && (
        <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setComposerOpen(false)} />
          <div className="relative w-full md:max-w-2xl flex flex-col border overflow-hidden shadow-2xl rounded-t-2xl md:rounded-2xl max-h-[92vh] md:max-h-[90vh]"
            style={{ background: SURFACE, borderColor: BORDER }}>
            <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
              <h2 className="text-base font-bold text-white">Create Post</h2>
              <button onClick={() => setComposerOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/30 hover:text-white transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <InlinePostComposer integrations={integrations} userId={userId} onSuccess={() => { loadPosts(); setComposerOpen(false); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ view, setView, integrations, onOpenConnect }: {
  view: ViewMode; setView: (v: ViewMode) => void;
  integrations: PostizIntegration[]; onOpenConnect: () => void;
}) {
  const navItems = [
    { id: 'composer' as ViewMode, label: 'Posts',    icon: <Edit3 className="w-5 h-5" /> },
    { id: 'calendar' as ViewMode, label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
    { id: 'planner'  as ViewMode, label: 'Planner',  icon: <BookOpen className="w-5 h-5" /> },
  ];

  return (
    <>
      <aside className="hidden md:flex w-52 shrink-0 flex-col border-r h-full overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
        <div className="px-5 py-5 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_L})` }}>
              <Send className="w-4 h-4 text-black" />
            </div>
            <div className="leading-none">
              <div className="text-xs font-black text-white">MEDIA</div>
              <div className="text-xs font-bold mt-0.5" style={{ color: GOLD }}>MACHINE</div>
            </div>
          </div>
        </div>
        <nav className="px-3 py-4 space-y-0.5">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setView(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition"
              style={{ background: view === item.id ? `${GOLD}15` : 'transparent', color: view === item.id ? GOLD_L : 'rgba(255,255,255,0.4)', borderLeft: view === item.id ? `2px solid ${GOLD}` : '2px solid transparent' }}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t mt-auto" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-bold text-white/25 uppercase tracking-wider">Channels</span>
            <button onClick={onOpenConnect} className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-white/10 text-white/30 hover:text-white transition">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {integrations.length === 0 ? (
            <button onClick={onOpenConnect} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition hover:bg-white/5"
              style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.3)' }}>
              <Plus className="w-3.5 h-3.5" /> Add channels
            </button>
          ) : (
            <div className="space-y-0.5 max-h-44 overflow-y-auto">
              {integrations.map(int => (
                <div key={int.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition">
                  <PlatformIcon id={int.profile || int.identifier} size="sm" />
                  <span className="text-xs text-white/50 truncate flex-1">{int.name}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t"
        style={{ background: SURFACE, borderColor: BORDER, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setView(item.id)}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 py-3 transition"
            style={{ color: view === item.id ? GOLD : 'rgba(255,255,255,0.35)' }}>
            {view === item.id && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full" style={{ background: GOLD }} />
            )}
            {item.icon}
            <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
          </button>
        ))}

        <button onClick={onOpenConnect}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition"
          style={{ color: integrations.length > 0 ? 'rgba(255,255,255,0.35)' : GOLD }}>
          <Link2 className="w-5 h-5" />
          <span className="text-[10px] font-bold tracking-wide">
            {integrations.length > 0 ? `${integrations.length} Ch.` : 'Connect'}
          </span>
        </button>
      </nav>
    </>
  );
}

// ─── UserMenu ─────────────────────────────────────────────────────────────────

function UserMenu({ user, onSignOut }: { user: { email: string }; onSignOut: () => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const initials = user.email.slice(0, 2).toUpperCase();
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 4px 4px', borderRadius: 10, background: open ? 'rgba(255,255,255,0.08)' : 'transparent', border: `1px solid ${open ? 'rgba(214,178,94,0.3)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#0d0d0d', flexShrink: 0 }}>
          {initials}
        </div>
        <span className="hidden sm:block" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</span>
        <ChevronDown className="w-3 h-3 hidden sm:block" style={{ color: 'rgba(255,255,255,0.3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 200, borderRadius: 12, background: 'linear-gradient(160deg, #1a1a1a, #161616)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)', overflow: 'hidden', zIndex: 200, animation: 'dropIn 0.15s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Signed in as</div>
            <div style={{ fontSize: 13, color: 'white', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
          </div>
          <div style={{ padding: '6px' }}>
            <button onClick={() => { setOpen(false); onSignOut(); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fca5a5', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes dropIn { from { opacity: 0; transform: translateY(-6px) scale(0.97); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar({ integrations, integrationsLoading, onConnect, onDisconnect, onRefresh, onOpenConnect, user, onSignOut, onSignIn }: {
  integrations: PostizIntegration[]; integrationsLoading: boolean;
  onConnect: () => void; onDisconnect: () => void; onRefresh: (force?: boolean) => void; onOpenConnect: () => void;
  user: { email: string } | null; onSignOut: () => void; onSignIn: () => void;
}) {
  return (
    <div className="h-12 border-b flex items-center justify-between px-4 md:px-6 shrink-0" style={{ background: SURFACE, borderColor: BORDER }}>
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1.5 text-xs font-semibold text-white/30 hover:text-white transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <div className="flex md:hidden items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_L})` }}>
            <Send className="w-3 h-3 text-black" />
          </div>
          <span className="text-xs font-black tracking-widest text-white">MEDIA <span style={{ color: GOLD }}>MACHINE</span></span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {user ? (
          <>
            {integrations.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-400 font-semibold mr-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span>{integrationsLoading ? 'Syncing…' : `${integrations.length} channel${integrations.length !== 1 ? 's' : ''}`}</span>
              </div>
            )}
            <button onClick={() => onRefresh()} disabled={integrationsLoading}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/30 hover:text-white transition disabled:opacity-30">
              <RefreshCw className={`w-3.5 h-3.5 ${integrationsLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onOpenConnect}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition hover:bg-white/5"
              style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.5)' }}>
              <Plus className="w-3 h-3" /> {integrations.length > 0 ? 'Add Channel' : 'Connect'}
            </button>
            <UserMenu user={user} onSignOut={onSignOut} />
          </>
        ) : (
          <button onClick={onSignIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition hover:brightness-110"
            style={{ background: GOLD, color: '#000' }}>
            <Link2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign In to Connect</span>
            <span className="sm:hidden">Sign In</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MediaDistributionPage() {
  const [view, setView]                         = useState<ViewMode>('composer');
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [oauthLoading, setOauthLoading]         = useState(false);
  const [oauthError, setOauthError]             = useState<string | null>(null);
  const [integrations, setIntegrations]         = useState<PostizIntegration[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen]       = useState(false);
  const { user: authUser, signOut }             = useAuth();
  const currentUser = authUser ? { id: authUser.id, email: authUser.email ?? '' } : null;

  useEffect(() => {
    if (window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentUserId = currentUser?.id ?? null;

  const loadIntegrations = useCallback(async (force = false) => {
    if (!currentUserId) return;
    setIntegrationsLoading(true);
    const safetyTimer = setTimeout(() => setIntegrationsLoading(false), 10000);
    try { setIntegrations(await fetchChannels(currentUserId, force)); }
    catch { setIntegrations([]); }
    finally { clearTimeout(safetyTimer); setIntegrationsLoading(false); }
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (currentUserId) loadIntegrations(); }, [currentUserId, loadIntegrations]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const isSocialReturn = (() => {
          try { return localStorage.getItem(LS_SOCIAL_RETURN_KEY) === '1'; }
          catch { return false; }
        })();
        if (isSocialReturn) {
          try { localStorage.removeItem(LS_SOCIAL_RETURN_KEY); } catch {}
          setTimeout(() => loadIntegrations(true), 1500);
          setConnectModalOpen(false);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadIntegrations]);

  useEffect(() => {
    const isSocialReturn = (() => {
      try {
        return (
          localStorage.getItem(LS_SOCIAL_RETURN_KEY) === '1' ||
          !!localStorage.getItem('ayrshare_connected')
        );
      } catch { return false; }
    })();
    if (isSocialReturn) {
      try {
        localStorage.removeItem(LS_SOCIAL_RETURN_KEY);
        localStorage.removeItem('ayrshare_connected');
      } catch {}
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => loadIntegrations(true), 1500);
      setConnectModalOpen(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openConnectModal = () => setConnectModalOpen(true);

  const handleConnect = () => {
    if (!currentUser) {
      setAuthModalOpen(true);
    } else {
      openConnectModal();
    }
  };

  const handleDisconnect = () => {
    try { localStorage.removeItem(LS_SOCIAL_RETURN_KEY); } catch {}
    setIntegrations([]);
    setOauthError(null);
  };

  const handleSignOut = async () => {
    handleDisconnect();
    await signOut();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: BG, backgroundAttachment: 'fixed', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,400&display=swap');
        * { box-sizing: border-box; }
        html, body {
          background: linear-gradient(135deg, #0d0d0d 0%, #242424 50%, #131313 100%) fixed !important;
          min-height: 100vh;
        }
        @keyframes mmFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @keyframes mmPulse  { 0%,100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes goldShimmerSweep { 0% { background-position: 0% 50%; } 55% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .mm-gold-shimmer { background-image: linear-gradient(110deg, #b9892b 0%, #f7dc8a 20%, #ffffff 30%, #f1d27b 40%, #b9892b 60%, #f7dc8a 80%, #ffffff 90%, #b9892b 100%); background-size: 240% 100%; background-position: 0% 50%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: goldShimmerSweep 4.8s ease-in-out infinite; }
        .lg\\:divide-x > * + * { border-left-width: 1px; border-color: rgba(255,255,255,0.08); }
      `}</style>

      {oauthLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(10,10,10,0.95)' }}>
          <div className="flex flex-col items-center gap-4">
            <Loader className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
            <div className="text-sm font-bold text-white/60">Completing authorization…</div>
          </div>
        </div>
      )}

      {oauthError && (
        <div className="flex items-center gap-3 px-6 py-3 text-sm text-red-200 shrink-0 z-50"
          style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.18)' }}>
          <AlertCircle className="w-4 h-4 shrink-0 text-red-300" /> {oauthError}
          <button onClick={() => setOauthError(null)} className="ml-auto text-red-300/60 hover:text-red-200 transition"><X className="w-4 h-4" /></button>
        </div>
      )}

      <TopBar
        integrations={integrations} integrationsLoading={integrationsLoading}
        onConnect={handleConnect} onDisconnect={handleDisconnect}
        onRefresh={(force) => loadIntegrations(force)}
        onOpenConnect={() => setConnectModalOpen(true)}
        user={currentUser}
        onSignOut={handleSignOut}
        onSignIn={() => setAuthModalOpen(true)}
      />

      {!currentUser ? (
        <div className="flex-1 flex items-center justify-center p-6" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}08 0%, transparent 65%)`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', animation: 'mmPulse 6s ease-in-out infinite' }} />
          <div style={{ textAlign: 'center', maxWidth: 480, animation: 'mmFadeUp 0.5s ease both', position: 'relative' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: `0 12px 40px ${GOLD}35` }}>
              <Send size={30} color="#000" />
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              <span className="mm-gold-shimmer" style={{ display: 'block' }}>Media Machine</span>
              <span style={{ display: 'block', marginTop: 6, color: 'white', fontWeight: 700, fontSize: 22 }}>Schedule smarter. Grow faster.</span>
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: '0 0 32px', lineHeight: 1.6 }}>
              Schedule and publish to Instagram, TikTok, YouTube,<br className="hidden sm:block" />LinkedIn, X, Facebook and more — all in one place.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 36 }}>
              {['📅 Schedule posts', '🤖 AI captions', '📊 Multi-platform', '♻️ Content repurposing'].map(f => (
                <span key={f} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}>{f}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setAuthModalOpen(true)}
                style={{ padding: '13px 28px', borderRadius: 14, fontSize: 14, fontWeight: 800, background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})`, color: '#0d0d0d', border: 'none', cursor: 'pointer', boxShadow: `0 4px 24px ${GOLD}40`, transition: 'transform 0.15s, box-shadow 0.15s', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${GOLD}55`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 24px ${GOLD}40`; }}>
                <Send size={15} /> Get Started Free
              </button>
              <button onClick={() => setAuthModalOpen(true)}
                style={{ padding: '13px 24px', borderRadius: 14, fontSize: 14, fontWeight: 700, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s, background 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(214,178,94,0.4)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'transparent'; }}>
                Sign In
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <Sidebar view={view} setView={setView} integrations={integrations}
            onOpenConnect={() => setConnectModalOpen(true)} />
          <main className="flex-1 overflow-hidden pb-[60px] md:pb-0">
            {view === 'composer' && <ComposerPanel integrations={integrations} userId={currentUser?.id ?? null} />}
            {view === 'calendar' && <CalendarView  integrations={integrations} userId={currentUser?.id ?? null} />}
            {view === 'planner'  && <PlannerPanel userId={currentUser?.id ?? null} />}
          </main>
        </div>
      )}

      <ConnectAccountsModal
        open={connectModalOpen} onClose={() => setConnectModalOpen(false)}
        integrations={integrations} onConnectPostiz={handleConnect}
        integrationsLoading={integrationsLoading}
        onRefresh={(force) => loadIntegrations(force)}
        currentUser={currentUser}
      />

      <MediaMachineAuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          setTimeout(() => openConnectModal(), 300);
        }}
      />
    </div>
  );
}
