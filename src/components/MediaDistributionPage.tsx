import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Loader, CheckCircle2, AlertCircle, Sparkles, X,
  Plus, ChevronLeft, ChevronRight, Calendar, Clock,
  Video, Link2, Link2Off, RefreshCw, Send, Edit3, Image,
  ChevronDown, ChevronUp, Play, Pause, Volume2, VolumeX, Maximize2, LogOut,
  ClipboardList, FileText, Trash2, BookOpen, DollarSign, Copy, TrendingUp, Users, Gift,
  Film, Upload, Download, RefreshCcw, Wand2,
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

const resolveStatus = (raw: string, scheduledAt: Date): 'scheduled' | 'published' | 'failed' => {
  if (raw === 'scheduled' && scheduledAt < new Date()) return 'published';
  return (raw as any) || 'scheduled';
};

const VIRAL_ANGLES = [
  'bold contrarian take that challenges common wisdom',
  'personal story with a surprising or emotional twist',
  'specific number or stat that stops the scroll',
  'open loop hook, tease the payoff without giving it away',
  'relatable pain point that makes the reader feel seen',
  'before/after transformation framing',
  'curiosity gap, what most people get wrong about X',
  'social proof or authority positioning',
  'direct call-to-action with urgency or scarcity',
  'listicle with an unexpected final item',
].join(', ');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ORG_ID = '56bd14a6-07ab-4c57-bbfd-28d6d7d9eaa6';

const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

const LS_SOCIAL_RETURN_KEY = 'postiz_social_return';

type PlatformId =
  | 'instagram' | 'facebook' | 'tiktok' | 'youtube'
  | 'x' | 'linkedin' | 'threads' | 'bluesky';

// ── ViewMode now includes 'video' ──
type ViewMode = 'composer' | 'calendar' | 'planner' | 'partner' | 'video';

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

// ── AI Video Studio types ──
type VideoStudioStep = 'brief' | 'prompts' | 'frames' | 'video' | 'done';

type VideoPrompt = {
  id: string;
  text: string;
  selected: boolean;
};

type GeneratedFrame = {
  id: string;
  promptId: string;
  promptText: string;
  imageUrl: string;
  taskId?: string;
  selected: boolean;
};

type GeneratedVideo = {
  id: string;
  frameId: string;
  videoUrl: string;
  taskId?: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  thumbnailUrl?: string;
};

type VideoHistoryItem = {
  id: string;
  createdAt: Date;
  brief: string;
  videoUrl: string;
  thumbnailUrl?: string;
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

async function transcribeVideo(videoFile: File, authToken = ''): Promise<string> {
  let transcribeRes: Response;
  const authHeaders = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

  if (videoFile.size <= 5 * 1024 * 1024) {
    const form = new FormData();
    form.append('file', videoFile, videoFile.name);
    transcribeRes = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-video`, { method: 'POST', headers: authHeaders, body: form });
  } else {
    const audioBlob = await extractAudioFromVideo(videoFile);
    if (audioBlob.size <= 5 * 1024 * 1024) {
      const form = new FormData();
      form.append('file', audioBlob, 'audio.wav');
      transcribeRes = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-video`, { method: 'POST', headers: authHeaders, body: form });
    } else {
      const videoUrl = await uploadViaNativeXHR(audioBlob, 'video');
      transcribeRes = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ videoUrl }),
      });
    }
  }

  if (!transcribeRes.ok) {
    const err = await transcribeRes.json().catch(() => ({}));
    if (err.error === 'limit_reached') throw new Error(err.message);
    throw new Error(err.error || 'AI analysis failed');
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
        <span className="text-xs font-bold text-white/30 uppercase tracking-wider">AI Analysis</span>
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
              : <><ChevronDown className="w-3.5 h-3.5" /> View full analysis</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── AIVideoStudio ─────────────────────────────────────────────────────────────
// 5-step UI: brief → prompts → frames → video → done
// Calls: kling-generate-prompts, kling-generate-image, kling-generate-video, kling-poll

function AIVideoStudio({ userId }: { userId: string | null }) {
  // ── Step state ──
  const [step, setStep] = useState<VideoStudioStep>('brief');
  const [showHistory, setShowHistory] = useState(false);

  // ── Step 1: Brief ──
  const [brief, setBrief] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');

  // ── Step 2: Prompts ──
  const [prompts, setPrompts] = useState<VideoPrompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptsError, setPromptsError] = useState<string | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingPromptText, setEditingPromptText] = useState('');

  // ── Step 3: Frames (images) ──
  const [frames, setFrames] = useState<GeneratedFrame[]>([]);
  const [framesLoading, setFramesLoading] = useState(false);
  const [framesError, setFramesError] = useState<string | null>(null);
  const [framePolling, setFramePolling] = useState<Record<string, boolean>>({});

  // ── Step 4: Video ──
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);

  // ── History ──
  const [history, setHistory] = useState<VideoHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem('mm_video_history');
      if (!raw) return [];
      return JSON.parse(raw).map((h: any) => ({ ...h, createdAt: new Date(h.createdAt) }));
    } catch { return []; }
  });

  const persistHistory = (items: VideoHistoryItem[]) => {
    setHistory(items);
    try { localStorage.setItem('mm_video_history', JSON.stringify(items.slice(0, 20))); } catch {}
  };

  const addToHistory = (videoUrl: string, thumbnailUrl?: string) => {
    const item: VideoHistoryItem = {
      id: Date.now().toString(),
      createdAt: new Date(),
      brief: brief.slice(0, 120),
      videoUrl,
      thumbnailUrl,
    };
    persistHistory([item, ...history].slice(0, 20));
  };

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? '';
  };

  const selectedPrompts = prompts.filter(p => p.selected);
  const selectedFrames  = frames.filter(f => f.selected);

  // ── Step 1 → 2: Generate prompts ──
  const handleGeneratePrompts = async () => {
    if (!brief.trim()) return;
    setPromptsLoading(true);
    setPromptsError(null);
    setPrompts([]);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/kling-generate-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ brief: brief.trim(), style, aspectRatio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate prompts');
      const rawPrompts: string[] = Array.isArray(data.prompts) ? data.prompts : [];
      setPrompts(rawPrompts.map((text, i) => ({
        id: `prompt-${Date.now()}-${i}`,
        text,
        selected: i < 3,
      })));
      setStep('prompts');
    } catch (e: any) {
      setPromptsError(e.message || 'Something went wrong');
    } finally {
      setPromptsLoading(false);
    }
  };

  // ── Step 2 → 3: Generate frames for selected prompts ──
  const handleGenerateFrames = async () => {
    if (selectedPrompts.length === 0) return;
    setFramesLoading(true);
    setFramesError(null);
    setFrames([]);
    setStep('frames');

    const token = await getAuthToken();
    const newFrames: GeneratedFrame[] = selectedPrompts.map(p => ({
      id: `frame-${Date.now()}-${p.id}`,
      promptId: p.id,
      promptText: p.text,
      imageUrl: '',
      taskId: undefined,
      selected: false,
    }));
    setFrames(newFrames);

    await Promise.all(newFrames.map(async (frame, idx) => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/kling-generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ prompt: frame.promptText, aspectRatio }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Image generation failed');

        const taskId: string = data.taskId || data.task_id || '';
        setFrames(prev => prev.map(f => f.id === frame.id ? { ...f, taskId } : f));

        setFramePolling(prev => ({ ...prev, [frame.id]: true }));
        let imageUrl = '';
        for (let attempt = 0; attempt < 40; attempt++) {
          await new Promise(r => setTimeout(r, 3000));
          const pollRes = await fetch(`${SUPABASE_URL}/functions/v1/kling-poll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ taskId, type: 'image' }),
          });
          const pollData = await pollRes.json();
          if (pollData.status === 'succeed' || pollData.status === 'completed') {
            imageUrl = pollData.imageUrl || pollData.url || pollData.output?.image_url || '';
            break;
          }
          if (pollData.status === 'failed') throw new Error('Image generation failed');
        }

        if (!imageUrl) throw new Error('Image generation timed out');

        setFrames(prev => prev.map(f =>
          f.id === frame.id ? { ...f, imageUrl, selected: idx === 0 } : f
        ));
      } catch (e: any) {
        setFrames(prev => prev.map(f =>
          f.id === frame.id ? { ...f, imageUrl: 'error', selected: false } : f
        ));
      } finally {
        setFramePolling(prev => ({ ...prev, [frame.id]: false }));
      }
    }));

    setFramesLoading(false);
  };

  // ── Step 3 → 4: Generate videos for selected frames ──
  const handleGenerateVideos = async () => {
    if (selectedFrames.length === 0) return;
    setVideosLoading(true);
    setVideosError(null);
    setVideos([]);
    setStep('video');

    const token = await getAuthToken();
    const newVideos: GeneratedVideo[] = selectedFrames.map(f => ({
      id: `video-${Date.now()}-${f.id}`,
      frameId: f.id,
      videoUrl: '',
      taskId: undefined,
      status: 'pending' as const,
    }));
    setVideos(newVideos);

    await Promise.all(newVideos.map(async (vid) => {
      const frame = frames.find(f => f.id === vid.frameId);
      if (!frame) return;
      try {
        setVideos(prev => prev.map(v => v.id === vid.id ? { ...v, status: 'processing' } : v));

        const res = await fetch(`${SUPABASE_URL}/functions/v1/kling-generate-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            imageUrl: frame.imageUrl,
            prompt: frame.promptText,
            aspectRatio,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Video generation failed');

        const taskId: string = data.taskId || data.task_id || '';
        setVideos(prev => prev.map(v => v.id === vid.id ? { ...v, taskId } : v));

        let videoUrl = '';
        let thumbnailUrl = '';
        for (let attempt = 0; attempt < 80; attempt++) {
          await new Promise(r => setTimeout(r, 5000));
          const pollRes = await fetch(`${SUPABASE_URL}/functions/v1/kling-poll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ taskId, type: 'video' }),
          });
          const pollData = await pollRes.json();
          if (pollData.status === 'succeed' || pollData.status === 'completed') {
            videoUrl = pollData.videoUrl || pollData.url || pollData.output?.video_url || '';
            thumbnailUrl = pollData.thumbnailUrl || pollData.output?.thumbnail_url || '';
            break;
          }
          if (pollData.status === 'failed') throw new Error('Video generation failed');
        }

        if (!videoUrl) throw new Error('Video generation timed out');

        setVideos(prev => prev.map(v =>
          v.id === vid.id ? { ...v, videoUrl, thumbnailUrl, status: 'done' } : v
        ));
        addToHistory(videoUrl, thumbnailUrl);
      } catch (e: any) {
        setVideos(prev => prev.map(v => v.id === vid.id ? { ...v, status: 'failed' } : v));
      }
    }));

    setVideosLoading(false);
    setVideos(prev => {
      const anyDone = prev.some(v => v.status === 'done');
      if (anyDone) setTimeout(() => setStep('done'), 500);
      return prev;
    });
  };

  const handleReset = () => {
    setStep('brief');
    setBrief('');
    setStyle('cinematic');
    setAspectRatio('16:9');
    setPrompts([]);
    setFrames([]);
    setVideos([]);
    setPromptsError(null);
    setFramesError(null);
    setVideosError(null);
  };

  const STEPS: { id: VideoStudioStep; label: string }[] = [
    { id: 'brief',   label: 'Brief'   },
    { id: 'prompts', label: 'Prompts' },
    { id: 'frames',  label: 'Frames'  },
    { id: 'video',   label: 'Video'   },
    { id: 'done',    label: 'Done'    },
  ];
  const stepIdx = STEPS.findIndex(s => s.id === step);

  const STYLE_OPTIONS = [
    { value: 'cinematic',      label: '🎬 Cinematic'      },
    { value: 'documentary',    label: '🎥 Documentary'    },
    { value: 'animated',       label: '✨ Animated'       },
    { value: 'hyperrealistic', label: '📷 Hyperrealistic' },
    { value: 'abstract',       label: '🌀 Abstract'       },
    { value: 'commercial',     label: '📺 Commercial'     },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: BG }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 border-b shrink-0" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
            <Film className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-black text-white">AI Video Studio</div>
            <div className="text-xs text-white/35">Brief → Prompts → Frames → Video</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition hover:bg-white/5"
            style={{
              borderColor: BORDER,
              color: showHistory ? GOLD_L : 'rgba(255,255,255,0.4)',
              background: showHistory ? `${GOLD}10` : 'transparent',
            }}>
            <ClipboardList className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History ({history.length})</span>
          </button>
          {step !== 'brief' && (
            <button onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition hover:bg-white/5"
              style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
              <RefreshCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Video</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Step progress bar ── */}
      <div className="flex items-center gap-0 px-4 md:px-8 py-3 border-b shrink-0 overflow-x-auto" style={{ borderColor: BORDER }}>
        {STEPS.map((s, i) => {
          const isActive   = s.id === step;
          const isComplete = i < stepIdx;
          return (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition"
                  style={{
                    background: isActive ? GOLD : isComplete ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
                    color: isActive ? '#000' : isComplete ? '#86efac' : 'rgba(255,255,255,0.3)',
                    border: isActive ? 'none' : isComplete ? '1px solid rgba(34,197,94,0.4)' : `1px solid ${BORDER}`,
                  }}>
                  {isComplete ? '✓' : i + 1}
                </div>
                <span className="text-xs font-bold"
                  style={{ color: isActive ? GOLD_L : isComplete ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)' }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-6 md:w-10 h-px mx-1 shrink-0"
                  style={{ background: i < stepIdx ? 'rgba(34,197,94,0.3)' : BORDER }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Main content ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* ── STEP 1: Brief ── */}
            {step === 'brief' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-black text-white mb-1">Describe Your Video</h2>
                  <p className="text-sm text-white/40">Tell the AI what you want to create. Be specific about the subject, mood, setting, and action.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/35 uppercase tracking-wider">Video Brief</label>
                  <textarea
                    value={brief}
                    onChange={e => setBrief(e.target.value)}
                    placeholder="e.g. A luxury real estate agent walking through a modern penthouse at golden hour, slow cinematic pan, warm lighting, professional atmosphere…"
                    rows={5}
                    className="w-full rounded-xl border bg-black/30 px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                    style={{ borderColor: BORDER }}
                  />
                  <div className="text-xs text-white/20 text-right">{brief.length} chars</div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/35 uppercase tracking-wider">Visual Style</label>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setStyle(opt.value)}
                        className="px-3 py-2 rounded-xl text-xs font-bold border transition"
                        style={{
                          borderColor: style === opt.value ? GOLD : BORDER,
                          background: style === opt.value ? `${GOLD}18` : 'transparent',
                          color: style === opt.value ? GOLD_L : 'rgba(255,255,255,0.4)',
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/35 uppercase tracking-wider">Aspect Ratio</label>
                  <div className="flex gap-2">
                    {(['16:9', '9:16', '1:1'] as const).map(ar => (
                      <button key={ar} onClick={() => setAspectRatio(ar)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1.5"
                        style={{
                          borderColor: aspectRatio === ar ? GOLD : BORDER,
                          background: aspectRatio === ar ? `${GOLD}18` : 'transparent',
                          color: aspectRatio === ar ? GOLD_L : 'rgba(255,255,255,0.4)',
                        }}>
                        <div style={{
                          width: ar === '16:9' ? 28 : ar === '9:16' ? 14 : 20,
                          height: ar === '16:9' ? 16 : ar === '9:16' ? 24 : 20,
                          border: `2px solid ${aspectRatio === ar ? GOLD : 'rgba(255,255,255,0.25)'}`,
                          borderRadius: 3,
                        }} />
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>

                {promptsError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl border text-sm text-red-200"
                    style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {promptsError}
                  </div>
                )}

                <button
                  onClick={handleGeneratePrompts}
                  disabled={promptsLoading || !brief.trim()}
                  className="w-full flex flex-col items-center justify-center gap-0.5 py-3.5 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff' }}>
                  <span className="flex items-center gap-2">
                    {promptsLoading
                      ? <><Loader className="w-4 h-4 animate-spin" /> Generating prompts…</>
                      : <><Wand2 className="w-4 h-4" /> Generate Video Prompts</>}
                  </span>
                  {promptsLoading && <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 500 }}>May take up to 30 seconds</span>}
                </button>
              </div>
            )}

            {/* ── STEP 2: Prompts ── */}
            {step === 'prompts' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-black text-white mb-1">Select Video Prompts</h2>
                  <p className="text-sm text-white/40">Choose up to 4 prompts to generate frames for. Edit any prompt to refine it.</p>
                </div>

                <div className="space-y-2">
                  {prompts.map((prompt, idx) => {
                    const isEditing = editingPromptId === prompt.id;
                    return (
                      <div key={prompt.id}
                        className="rounded-xl border overflow-hidden transition"
                        style={{
                          borderColor: prompt.selected ? `${GOLD}60` : BORDER,
                          background: prompt.selected ? `${GOLD}06` : 'rgba(0,0,0,0.2)',
                        }}>
                        <div className="flex items-center gap-3 px-3 py-2 border-b" style={{ borderColor: BORDER }}>
                          <button
                            onClick={() => setPrompts(prev => prev.map(p =>
                              p.id === prompt.id ? { ...p, selected: !p.selected } : p
                            ))}
                            className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition"
                            style={{
                              background: prompt.selected ? GOLD : 'transparent',
                              border: `2px solid ${prompt.selected ? GOLD : 'rgba(255,255,255,0.2)'}`,
                            }}>
                            {prompt.selected && <span className="text-black text-[10px] font-black">✓</span>}
                          </button>
                          <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Prompt {idx + 1}</span>
                          <div className="ml-auto flex items-center gap-1">
                            <button
                              onClick={() => {
                                if (isEditing) {
                                  setPrompts(prev => prev.map(p =>
                                    p.id === prompt.id ? { ...p, text: editingPromptText } : p
                                  ));
                                  setEditingPromptId(null);
                                } else {
                                  setEditingPromptId(prompt.id);
                                  setEditingPromptText(prompt.text);
                                }
                              }}
                              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10 transition"
                              style={{ color: isEditing ? GOLD : 'rgba(255,255,255,0.3)' }}>
                              {isEditing
                                ? <CheckCircle2 className="w-3.5 h-3.5" />
                                : <Edit3 className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        {isEditing ? (
                          <textarea
                            value={editingPromptText}
                            onChange={e => setEditingPromptText(e.target.value)}
                            autoFocus rows={3}
                            className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none resize-none"
                          />
                        ) : (
                          <p className="px-4 py-3 text-sm text-white/70 leading-relaxed">{prompt.text}</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-white/30">{selectedPrompts.length} selected</span>
                  <button onClick={() => setPrompts(prev => prev.map(p => ({ ...p, selected: true })))}
                    className="text-white/30 hover:text-white transition underline underline-offset-2">
                    Select all
                  </button>
                  <button onClick={() => setPrompts(prev => prev.map(p => ({ ...p, selected: false })))}
                    className="text-white/30 hover:text-white transition underline underline-offset-2">
                    Deselect all
                  </button>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep('brief')}
                    className="px-4 py-2.5 rounded-xl border text-sm font-bold transition hover:bg-white/5"
                    style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
                    ← Back
                  </button>
                  <button
                    onClick={handleGenerateFrames}
                    disabled={selectedPrompts.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff' }}>
                    <Image className="w-4 h-4" />
                    Generate {selectedPrompts.length} Frame{selectedPrompts.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Frames ── */}
            {step === 'frames' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-black text-white mb-1">Select Key Frames</h2>
                  <p className="text-sm text-white/40">AI-generated key frames. Select the ones you want to animate into video.</p>
                </div>

                {framesError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl border text-sm text-red-200"
                    style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {framesError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {frames.map((frame) => {
                    const isPolling = framePolling[frame.id];
                    const isError   = frame.imageUrl === 'error';
                    const isReady   = !!frame.imageUrl && frame.imageUrl !== 'error';
                    return (
                      <div key={frame.id}
                        className="rounded-xl border overflow-hidden transition cursor-pointer"
                        style={{
                          borderColor: frame.selected ? `${GOLD}60` : BORDER,
                          background: 'rgba(0,0,0,0.3)',
                        }}
                        onClick={() => isReady && setFrames(prev => prev.map(f =>
                          f.id === frame.id ? { ...f, selected: !f.selected } : f
                        ))}>
                        <div className="relative"
                          style={{
                            aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '9:16' ? '9/16' : '1/1',
                            background: 'rgba(0,0,0,0.5)',
                          }}>
                          {isPolling && !isReady && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                              <div className="w-8 h-8 border-2 rounded-full animate-spin"
                                style={{ borderColor: 'rgba(167,139,250,0.3)', borderTopColor: '#a78bfa' }} />
                              <span className="text-xs text-white/40 font-medium">Generating frame…</span>
                            </div>
                          )}
                          {isError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                              <AlertCircle className="w-6 h-6 text-red-400/60" />
                              <span className="text-xs text-red-400/60">Generation failed</span>
                            </div>
                          )}
                          {isReady && (
                            <>
                              <img src={frame.imageUrl} alt={frame.promptText} className="w-full h-full object-cover" />
                              {frame.selected && (
                                <div className="absolute inset-0 flex items-center justify-center"
                                  style={{ background: `${GOLD}20` }}>
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: GOLD }}>
                                    <CheckCircle2 className="w-5 h-5 text-black" />
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="px-3 py-2 flex items-center gap-2">
                          <p className="flex-1 text-xs text-white/50 line-clamp-2 leading-relaxed">{frame.promptText}</p>
                          {isReady && (
                            <a href={frame.imageUrl} download target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10 transition shrink-0"
                              style={{ color: 'rgba(255,255,255,0.3)' }}
                              title="Download frame">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {frames.some(f => f.imageUrl && f.imageUrl !== 'error') && (
                  <div className="flex gap-3">
                    <button onClick={() => setStep('prompts')}
                      className="px-4 py-2.5 rounded-xl border text-sm font-bold transition hover:bg-white/5"
                      style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
                      ← Back
                    </button>
                    <button
                      onClick={handleGenerateVideos}
                      disabled={selectedFrames.length === 0 || framesLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff' }}>
                      <Film className="w-4 h-4" />
                      Animate {selectedFrames.length} Frame{selectedFrames.length !== 1 ? 's' : ''} into Video{selectedFrames.length !== 1 ? 's' : ''}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 4: Video generation ── */}
            {step === 'video' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-black text-white mb-1">Generating Your Videos</h2>
                  <p className="text-sm text-white/40">AI is animating your frames. This typically takes 2–5 minutes per video.</p>
                </div>

                {videosError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl border text-sm text-red-200"
                    style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {videosError}
                  </div>
                )}

                <div className="space-y-4">
                  {videos.map((vid) => {
                    const sourceFrame = frames.find(f => f.id === vid.frameId);
                    const isProcessing = vid.status === 'pending' || vid.status === 'processing';
                    return (
                      <div key={vid.id} className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.3)' }}>
                        <div className="relative"
                          style={{
                            aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '9:16' ? '9/16' : '1/1',
                            background: 'rgba(0,0,0,0.6)',
                          }}>
                          {isProcessing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                              {sourceFrame?.imageUrl && sourceFrame.imageUrl !== 'error' && (
                                <img src={sourceFrame.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                              )}
                              <div className="relative flex flex-col items-center gap-3">
                                <div className="w-10 h-10 border-2 rounded-full animate-spin"
                                  style={{ borderColor: 'rgba(167,139,250,0.3)', borderTopColor: '#a78bfa' }} />
                                <span className="text-sm text-white/60 font-medium">
                                  {vid.status === 'pending' ? 'Queued…' : 'Animating frame…'}
                                </span>
                                <span className="text-xs text-white/25">Typically 2–5 minutes</span>
                              </div>
                            </div>
                          )}
                          {vid.status === 'failed' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                              <AlertCircle className="w-8 h-8 text-red-400/60" />
                              <span className="text-sm text-red-400/60">Video generation failed</span>
                            </div>
                          )}
                          {vid.status === 'done' && vid.videoUrl && (
                            <video
                              src={vid.videoUrl}
                              poster={vid.thumbnailUrl}
                              controls
                              playsInline
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <p className="flex-1 text-xs text-white/40 truncate">{sourceFrame?.promptText}</p>
                          <span className="px-2 py-1 rounded-lg text-[10px] font-bold shrink-0"
                            style={{
                              background: vid.status === 'done' ? 'rgba(34,197,94,0.12)' : vid.status === 'failed' ? 'rgba(239,68,68,0.12)' : 'rgba(167,139,250,0.12)',
                              color: vid.status === 'done' ? '#86efac' : vid.status === 'failed' ? '#fca5a5' : '#a78bfa',
                            }}>
                            {vid.status === 'done' ? '✓ Ready' : vid.status === 'failed' ? '✗ Failed' : 'Processing…'}
                          </span>
                          {vid.status === 'done' && vid.videoUrl && (
                            <a href={vid.videoUrl} download target="_blank" rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition shrink-0"
                              style={{ color: GOLD }}>
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 5: Done ── */}
            {step === 'done' && (
              <div className="space-y-5">
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.3)' }}>
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <h2 className="text-xl font-black text-white mb-2">Videos Ready!</h2>
                  <p className="text-sm text-white/40">Your AI-generated videos are ready to download and share.</p>
                </div>

                <div className="space-y-4">
                  {videos.filter(v => v.status === 'done').map((vid) => {
                    const sourceFrame = frames.find(f => f.id === vid.frameId);
                    return (
                      <div key={vid.id} className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(0,0,0,0.3)' }}>
                        <div className="relative"
                          style={{ aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '9:16' ? '9/16' : '1/1' }}>
                          <video
                            src={vid.videoUrl}
                            poster={vid.thumbnailUrl}
                            controls
                            playsInline
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                          <p className="flex-1 text-xs text-white/40 truncate">{sourceFrame?.promptText}</p>
                          <a href={vid.videoUrl} download target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition hover:brightness-110"
                            style={{ background: GOLD, color: '#000' }}>
                            <Download className="w-3.5 h-3.5" /> Download
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button onClick={handleReset}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition hover:bg-white/5"
                  style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.5)' }}>
                  <RefreshCcw className="w-4 h-4" /> Create Another Video
                </button>
              </div>
            )}

          </div>
        </div>

        {/* ── History sidebar ── */}
        {showHistory && (
          <div className="w-64 md:w-72 shrink-0 border-l flex flex-col overflow-hidden"
            style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: BORDER }}>
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider">History</span>
              <button onClick={() => setShowHistory(false)}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10 text-white/30 hover:text-white transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
                  <Film className="w-6 h-6 text-white/15" />
                  <span className="text-xs text-white/25">No videos yet</span>
                </div>
              ) : (
                history.map(item => (
                  <div key={item.id} className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="" className="w-full object-cover" style={{ aspectRatio: '16/9' }} />
                    ) : (
                      <div className="w-full flex items-center justify-center"
                        style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.04)' }}>
                        <Film className="w-6 h-6 text-white/15" />
                      </div>
                    )}
                    <div className="px-3 py-2 space-y-1.5">
                      <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{item.brief}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/25">
                          {item.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <a href={item.videoUrl} download target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition hover:brightness-110"
                          style={{ background: `${GOLD}18`, color: GOLD_L }}>
                          <Download className="w-3 h-3" /> Download
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {history.length > 0 && (
                <button onClick={() => persistHistory([])}
                  className="w-full py-1.5 rounded-lg text-[10px] font-bold border transition hover:bg-red-500/10 hover:text-red-400"
                  style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.2)' }}>
                  Clear History
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── PART 1 ENDS HERE ─────────────────────────────────────────────────────────

// ─── PART 2 ───────────────────────────────────────────────────────────────────
// Continuation of MediaDistributionPage.tsx
// Contains: ConnectAccountsModal, PostLogModal, VideoPreviewCard,
// ImagePreviewCard, SavedPostCard, InlinePostComposer, InlineContentIdeas,
// PlannerPanel, DayDetailModal, AddPlannerItemModal, ComposerPanel,
// CalendarView, PartnerDashboard, Sidebar (updated with 'video' nav),
// UserMenu, TopBar, MediaDistributionPage (updated routing)

// ─── ConnectAccountsModal ─────────────────────────────────────────────────────

function ConnectAccountsModal({
  open,
  onClose,
  userId,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  onConnected?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileUrl, setProfileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!userId) return;
    setLoading(true);
    setError(null);
    fetch(`${SUPABASE_URL}/functions/v1/ayrshare-profile?userId=${encodeURIComponent(userId)}`)
      .then(r => r.json())
      .then(d => {
        setProfileUrl(d?.profileUrl ?? null);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, [open, userId]);

  const handleConnect = async (platformId: PlatformId) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const stateKey = generateState();
      localStorage.setItem(LS_SOCIAL_RETURN_KEY, JSON.stringify({ platformId, stateKey }));
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ayrshare-oauth-init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId, userId, stateKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start OAuth');
      if (data.url) window.open(data.url, '_blank');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border overflow-hidden"
        style={{ background: '#1a1a1a', borderColor: BORDER }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER }}>
          <div>
            <h2 className="text-base font-bold text-white">Connect Accounts</h2>
            <p className="text-xs text-white/40 mt-0.5">Link your social profiles to start publishing</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {loading && !error && (
            <div className="flex justify-center py-4">
              <Loader className="w-5 h-5 animate-spin" style={{ color: GOLD }} />
            </div>
          )}

          {profileUrl && (
            <div className="mb-4 rounded-xl border px-4 py-3" style={{ borderColor: `${GOLD}30`, background: `${GOLD}08` }}>
              <p className="text-xs font-bold mb-2" style={{ color: GOLD }}>Ayrshare Profile URL</p>
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 underline break-all"
              >
                {profileUrl}
              </a>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(PLATFORMS) as PlatformId[]).map(pid => {
              const p = PLATFORMS[pid];
              return (
                <button
                  key={pid}
                  onClick={() => handleConnect(pid)}
                  disabled={loading}
                  className="flex items-center gap-3 rounded-xl border px-4 py-3 transition hover:border-white/20 hover:bg-white/05 disabled:opacity-50"
                  style={{ borderColor: BORDER, background: SURFACE }}
                >
                  <PlatformIcon id={pid} size="sm" />
                  <span className="text-sm font-medium text-white/80">{p.label}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-center text-white/25">
            Powered by Ayrshare · Your credentials are never stored
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── PostLogModal ─────────────────────────────────────────────────────────────

function PostLogModal({
  open,
  onClose,
  posts,
}: {
  open: boolean;
  onClose: () => void;
  posts: ScheduledPost[];
}) {
  if (!open) return null;

  const sorted = [...posts].sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border overflow-hidden max-h-[80vh] flex flex-col"
        style={{ background: '#1a1a1a', borderColor: BORDER }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
          <div>
            <h2 className="text-base font-bold text-white">Post Log</h2>
            <p className="text-xs text-white/40 mt-0.5">{posts.length} post{posts.length !== 1 ? 's' : ''} total</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="w-10 h-10 mb-3 text-white/10" />
              <p className="text-sm font-medium text-white/30">No posts yet</p>
              <p className="text-xs text-white/20 mt-1">Your scheduled posts will appear here</p>
            </div>
          ) : (
            sorted.map(post => {
              const status = resolveStatus(post.status, post.scheduledAt);
              return (
                <div
                  key={post.id}
                  className="rounded-xl border p-4"
                  style={{ borderColor: BORDER, background: SURFACE }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm text-white/70 leading-relaxed flex-1 line-clamp-2">{post.content}</p>
                    <span
                      className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        background: status === 'published' ? 'rgba(34,197,94,0.15)' : status === 'failed' ? 'rgba(239,68,68,0.15)' : `${GOLD}18`,
                        color: status === 'published' ? '#22c55e' : status === 'failed' ? '#ef4444' : GOLD,
                      }}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-white/30" />
                      <span className="text-xs text-white/30">
                        {post.scheduledAt.toLocaleDateString()} {post.scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {post.platforms.map(p => (
                        <PlatformIcon key={p} id={p} size="sm" />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── VideoPreviewCard ─────────────────────────────────────────────────────────

function VideoPreviewCard({
  url,
  caption,
  platforms,
  onRemove,
}: {
  url: string;
  caption?: string;
  platforms?: string[];
  onRemove?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const toggle = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: BORDER, background: SURFACE }}>
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={url}
          loop
          muted={muted}
          playsInline
          className="w-full h-full object-cover"
          onEnded={() => setPlaying(false)}
        />
        {/* Controls overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={toggle}
            className="w-12 h-12 rounded-full flex items-center justify-center transition hover:scale-110"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          >
            {playing
              ? <Pause className="w-5 h-5 text-white" />
              : <Play className="w-5 h-5 text-white ml-0.5" />}
          </button>
        </div>
        {/* Top-right actions */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <button
            onClick={() => { setMuted(v => !v); if (videoRef.current) videoRef.current.muted = !muted; }}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-white/20"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-white" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
          </button>
          <button
            onClick={() => videoRef.current?.requestFullscreen().then(() => setFullscreen(true)).catch(() => {})}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-white/20"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <Maximize2 className="w-3.5 h-3.5 text-white" />
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-red-500/30"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>
      {(caption || (platforms && platforms.length > 0)) && (
        <div className="px-4 py-3 space-y-2">
          {caption && <p className="text-sm text-white/60 leading-relaxed line-clamp-2">{caption}</p>}
          {platforms && platforms.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {platforms.map(p => <PlatformIcon key={p} id={p} size="sm" />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ImagePreviewCard ─────────────────────────────────────────────────────────

function ImagePreviewCard({
  url,
  caption,
  onRemove,
}: {
  url: string;
  caption?: string;
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: BORDER, background: SURFACE }}>
      <div className="relative">
        <img src={url} alt="" className="w-full object-cover max-h-64" />
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-red-500/30"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>
      {caption && (
        <div className="px-4 py-3">
          <p className="text-sm text-white/60 leading-relaxed line-clamp-2">{caption}</p>
        </div>
      )}
    </div>
  );
}

// ─── SavedPostCard ─────────────────────────────────────────────────────────────

function SavedPostCard({
  content,
  platforms,
  mediaUrl,
  mediaType,
  onUse,
  onDelete,
}: {
  content: string;
  platforms: string[];
  mediaUrl?: string;
  mediaType?: 'video' | 'image';
  onUse: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="rounded-2xl border p-4 space-y-3 transition hover:border-white/15"
      style={{ borderColor: BORDER, background: SURFACE }}
    >
      {mediaUrl && mediaType === 'image' && (
        <img src={mediaUrl} alt="" className="w-full rounded-xl object-cover max-h-40" />
      )}
      {mediaUrl && mediaType === 'video' && (
        <video src={mediaUrl} className="w-full rounded-xl max-h-40 object-cover" muted playsInline />
      )}
      <p className="text-sm text-white/70 leading-relaxed line-clamp-3">{content}</p>
      {platforms.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {platforms.map(p => <PlatformIcon key={p} id={p} size="sm" />)}
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onUse}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition hover:brightness-110"
          style={{ background: `${GOLD}20`, color: GOLD, border: `1px solid ${GOLD}30` }}
        >
          Use Post
        </button>
        <button
          onClick={onDelete}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition hover:bg-red-500/20 border"
          style={{ borderColor: BORDER }}
        >
          <Trash2 className="w-4 h-4 text-red-400/60" />
        </button>
      </div>
    </div>
  );
}

// ─── InlineContentIdeas ───────────────────────────────────────────────────────

function InlineContentIdeas({
  userId,
  onSelectIdea,
}: {
  userId: string | null;
  onSelectIdea: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-content-ideas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, viralAngles: VIRAL_ANGLES }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate ideas');
      setIdeas(Array.isArray(data.ideas) ? data.ideas : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: BORDER, background: SURFACE }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
          <span className="text-sm font-bold text-white">Content Ideas</span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition hover:brightness-110 disabled:opacity-50"
          style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}25` }}
        >
          {loading ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {ideas.length > 0 ? 'Regenerate' : 'Generate'}
        </button>
      </div>
      <div className="p-3 space-y-2">
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
        )}
        {ideas.length === 0 && !loading && !error && (
          <p className="text-xs text-white/25 text-center py-4">Click Generate to get AI-powered content ideas</p>
        )}
        {loading && (
          <div className="flex justify-center py-4">
            <Loader className="w-5 h-5 animate-spin" style={{ color: GOLD }} />
          </div>
        )}
        {ideas.map((idea, i) => (
          <button
            key={i}
            onClick={() => onSelectIdea(idea)}
            className="w-full text-left rounded-xl border px-3 py-2.5 text-xs text-white/60 leading-relaxed transition hover:bg-white/05 hover:border-white/15 hover:text-white/80"
            style={{ borderColor: BORDER }}
          >
            {idea}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── InlinePostComposer ───────────────────────────────────────────────────────

function InlinePostComposer({
  userId,
  channels,
  onPost,
  onSave,
  initialContent,
}: {
  userId: string | null;
  channels: PostizIntegration[];
  onPost: (post: ScheduledPost) => void;
  onSave: (content: string, platforms: string[], mediaUrl?: string, mediaType?: 'video' | 'image') => void;
  initialContent?: string;
}) {
  const [content, setContent] = useState(initialContent ?? '');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postSuccess, setPostSuccess] = useState(false);
  const [youTubeTitle, setYouTubeTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialContent !== undefined) setContent(initialContent);
  }, [initialContent]);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleFile = async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const type = isVideo ? 'video' : 'image';
    setMediaType(type);
    setUploadState({ status: 'uploading', progress: 0 });
    try {
      const url = await uploadViaNativeXHR(file, type, pct => {
        setUploadState({ status: 'uploading', progress: pct });
      });
      setUploadState({ status: 'done', path: url, url, fileName: file.name, mime: file.type, size: file.size });
    } catch (e: any) {
      setUploadState({ status: 'error', message: e.message });
    }
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    setPostError(null);
    try {
      const mediaUrl = uploadState.status === 'done' ? uploadState.url : undefined;
      const isYt = selectedPlatforms.includes('youtube');
      const payload: any = {
        platforms: selectedPlatforms.length > 0 ? selectedPlatforms : Object.keys(PLATFORMS),
        post: content,
        ...(mediaUrl ? { mediaUrls: [mediaUrl] } : {}),
        ...(scheduledAt ? { scheduleDate: new Date(scheduledAt).toISOString() } : {}),
        ...(isYt && youTubeTitle ? { youTubeTitle } : {}),
        ...(isYt ? { youTubeShorts: true, youTubeVisibility: 'public' } : {}),
      };
      await ayrsharePost(payload);
      const newPost: ScheduledPost = {
        id: Date.now().toString(),
        content,
        platforms: payload.platforms,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        status: scheduledAt ? 'scheduled' : 'published',
      };
      onPost(newPost);
      setPostSuccess(true);
      setContent('');
      setSelectedPlatforms([]);
      setScheduledAt('');
      setUploadState({ status: 'idle' });
      setTimeout(() => setPostSuccess(false), 3000);
    } catch (e: any) {
      setPostError(e.message);
    } finally {
      setPosting(false);
    }
  };

  const hasYt = selectedPlatforms.includes('youtube');
  const mediaUrl = uploadState.status === 'done' ? uploadState.url : undefined;
  const needsMedia = selectedPlatforms.some(p => MEDIA_REQUIRED_PLATFORMS.has(p));

  return (
    <div className="space-y-4">
      {postSuccess && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <p className="text-xs text-green-400 font-medium">Post submitted successfully!</p>
        </div>
      )}
      {postError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400 whitespace-pre-wrap">{postError}</p>
        </div>
      )}

      {/* Platform selector */}
      <div className="flex flex-wrap gap-2">
        {channels.map(ch => {
          const pid = ch.identifier?.toLowerCase().replace('twitter', 'x') as PlatformId;
          const isSelected = selectedPlatforms.includes(ch.identifier);
          return (
            <button
              key={ch.id}
              onClick={() => togglePlatform(ch.identifier)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition"
              style={{
                borderColor: isSelected ? GOLD : BORDER,
                background: isSelected ? `${GOLD}18` : SURFACE,
                color: isSelected ? GOLD : 'rgba(255,255,255,0.5)',
              }}
            >
              <PlatformIcon id={pid} size="sm" />
              {ch.name}
            </button>
          );
        })}
        {channels.length === 0 && (
          <p className="text-xs text-white/25 py-1">No channels connected — post will go to all available</p>
        )}
      </div>

      {/* YouTube title */}
      {hasYt && (
        <input
          type="text"
          value={youTubeTitle}
          onChange={e => setYouTubeTitle(e.target.value)}
          placeholder="YouTube video title"
          className="w-full rounded-xl border px-4 py-3 text-sm text-white bg-transparent outline-none focus:ring-1 placeholder:text-white/25"
          style={{ borderColor: BORDER }}
          onFocus={e => (e.currentTarget.style.borderColor = GOLD)}
          onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
        />
      )}

      {/* Text area */}
      <div className="relative rounded-2xl border overflow-hidden" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What do you want to post today?"
          rows={5}
          className="w-full px-4 py-3 text-sm text-white/80 bg-transparent outline-none resize-none placeholder:text-white/25 leading-relaxed"
        />
        <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: BORDER }}>
          <span className="text-xs text-white/20">{content.length} chars</span>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <Upload className="w-3.5 h-3.5" />
              Media
            </button>
          </div>
        </div>
      </div>

      {/* Media preview */}
      {uploadState.status === 'uploading' && (
        <div className="rounded-xl border px-4 py-3 space-y-2" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>Uploading…</span>
            <span>{uploadState.progress ?? 0}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${uploadState.progress ?? 0}%`, background: `linear-gradient(90deg, ${GOLD_D}, ${GOLD})` }}
            />
          </div>
        </div>
      )}
      {uploadState.status === 'error' && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{uploadState.message}</div>
      )}
      {uploadState.status === 'done' && (
        mediaType === 'video'
          ? <VideoPreviewCard url={uploadState.url} onRemove={() => setUploadState({ status: 'idle' })} />
          : <ImagePreviewCard url={uploadState.url} onRemove={() => setUploadState({ status: 'idle' })} />
      )}

      {needsMedia && uploadState.status !== 'done' && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/08 px-3 py-2 text-xs text-amber-400/80 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Selected platforms require media — please upload a video or image
        </div>
      )}

      {/* Schedule & actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="w-full rounded-xl border px-4 py-2.5 text-sm text-white/60 bg-transparent outline-none focus:ring-0"
            style={{ borderColor: BORDER, colorScheme: 'dark' }}
          />
        </div>
        <button
          onClick={() => {
            if (mediaUrl) onSave(content, selectedPlatforms, mediaUrl, mediaType);
            else onSave(content, selectedPlatforms);
          }}
          className="px-4 py-2.5 rounded-xl text-sm font-medium border transition hover:bg-white/05"
          style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}
        >
          Save
        </button>
        <button
          onClick={handlePost}
          disabled={posting || !content.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition hover:brightness-110 disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000' }}
        >
          {posting ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {scheduledAt ? 'Schedule' : 'Post Now'}
        </button>
      </div>
    </div>
  );
}

// ─── AddPlannerItemModal ──────────────────────────────────────────────────────

function AddPlannerItemModal({
  open,
  onClose,
  onAdd,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: PlannerItem) => void;
  defaultDate?: string;
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [plannedDate, setPlannedDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [plannedTime, setPlannedTime] = useState('');
  const [category, setCategory] = useState('content');

  const CATEGORIES = [
    { id: 'content', label: 'Content' },
    { id: 'campaign', label: 'Campaign' },
    { id: 'partnership', label: 'Partnership' },
    { id: 'event', label: 'Event' },
    { id: 'other', label: 'Other' },
  ];

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({
      id: Date.now().toString(),
      title: title.trim(),
      notes: notes.trim() || undefined,
      plannedDate,
      plannedTime: plannedTime || undefined,
      category,
    });
    setTitle('');
    setNotes('');
    setPlannedTime('');
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border overflow-hidden"
        style={{ background: '#1a1a1a', borderColor: BORDER }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER }}>
          <h2 className="text-base font-bold text-white">Add Planner Item</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Product launch post"
              className="w-full rounded-xl border px-4 py-3 text-sm text-white bg-transparent outline-none"
              style={{ borderColor: BORDER }}
              onFocus={e => (e.currentTarget.style.borderColor = GOLD)}
              onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Date</label>
              <input
                type="date"
                value={plannedDate}
                onChange={e => setPlannedDate(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm text-white/70 bg-transparent outline-none"
                style={{ borderColor: BORDER, colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Time (optional)</label>
              <input
                type="time"
                value={plannedTime}
                onChange={e => setPlannedTime(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm text-white/70 bg-transparent outline-none"
                style={{ borderColor: BORDER, colorScheme: 'dark' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
                  style={{
                    borderColor: category === c.id ? GOLD : BORDER,
                    background: category === c.id ? `${GOLD}18` : SURFACE,
                    color: category === c.id ? GOLD : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional details or context…"
              rows={3}
              className="w-full rounded-xl border px-4 py-3 text-sm text-white/70 bg-transparent outline-none resize-none placeholder:text-white/25"
              style={{ borderColor: BORDER }}
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={!title.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold transition hover:brightness-110 disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000' }}
          >
            Add to Planner
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DayDetailModal ───────────────────────────────────────────────────────────

function DayDetailModal({
  open,
  onClose,
  date,
  items,
  posts,
  onAddItem,
}: {
  open: boolean;
  onClose: () => void;
  date: Date | null;
  items: PlannerItem[];
  posts: ScheduledPost[];
  onAddItem: () => void;
}) {
  if (!open || !date) return null;

  const dayStr = date.toISOString().slice(0, 10);
  const dayPosts = posts.filter(p => p.scheduledAt.toISOString().slice(0, 10) === dayStr);
  const dayItems = items.filter(i => i.plannedDate === dayStr);

  const CATEGORY_COLORS: Record<string, string> = {
    content: '#3b82f6',
    campaign: '#8b5cf6',
    partnership: '#f59e0b',
    event: '#10b981',
    other: '#6b7280',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border overflow-hidden max-h-[80vh] flex flex-col"
        style={{ background: '#1a1a1a', borderColor: BORDER }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
          <div>
            <h2 className="text-base font-bold text-white">
              {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <p className="text-xs text-white/30 mt-0.5">{dayItems.length} item{dayItems.length !== 1 ? 's' : ''} · {dayPosts.length} post{dayPosts.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition hover:brightness-110"
              style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}30` }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition">
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {dayItems.map(item => (
            <div
              key={item.id}
              className="rounded-xl border p-3 flex items-start gap-3"
              style={{ borderColor: BORDER, background: SURFACE }}
            >
              <div
                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                style={{ background: CATEGORY_COLORS[item.category] || '#6b7280' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80">{item.title}</p>
                {item.plannedTime && (
                  <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {item.plannedTime}
                  </p>
                )}
                {item.notes && <p className="text-xs text-white/40 mt-1 leading-relaxed">{item.notes}</p>}
              </div>
              <span
                className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                style={{ background: `${CATEGORY_COLORS[item.category] || '#6b7280'}20`, color: CATEGORY_COLORS[item.category] || '#6b7280' }}
              >
                {item.category}
              </span>
            </div>
          ))}

          {dayPosts.map(post => {
            const status = resolveStatus(post.status, post.scheduledAt);
            return (
              <div
                key={post.id}
                className="rounded-xl border p-3"
                style={{ borderColor: `${GOLD}20`, background: `${GOLD}06` }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs text-white/60 line-clamp-2 flex-1">{post.content}</p>
                  <span
                    className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                    style={{
                      background: status === 'published' ? 'rgba(34,197,94,0.15)' : `${GOLD}18`,
                      color: status === 'published' ? '#22c55e' : GOLD,
                    }}
                  >
                    {status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {post.platforms.map(p => <PlatformIcon key={p} id={p} size="sm" />)}
                </div>
              </div>
            );
          })}

          {dayItems.length === 0 && dayPosts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Calendar className="w-8 h-8 mb-3 text-white/10" />
              <p className="text-sm text-white/25">Nothing planned for this day</p>
              <button
                onClick={onAddItem}
                className="mt-3 text-xs font-bold transition hover:brightness-125"
                style={{ color: GOLD }}
              >
                + Add something
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PlannerPanel ─────────────────────────────────────────────────────────────

function PlannerPanel({ userId }: { userId: string | null }) {
  const [items, setItems] = useState<PlannerItem[]>(() => {
    try {
      const raw = localStorage.getItem('mm_planner_items');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [defaultDate, setDefaultDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const persist = (next: PlannerItem[]) => {
    setItems(next);
    try { localStorage.setItem('mm_planner_items', JSON.stringify(next)); } catch {}
  };

  const handleAdd = (item: PlannerItem) => { persist([...items, item]); };
  const handleDelete = (id: string) => { persist(items.filter(i => i.id !== id)); };

  const CATEGORIES = ['all', 'content', 'campaign', 'partnership', 'event', 'other'];
  const CATEGORY_COLORS: Record<string, string> = {
    content: '#3b82f6',
    campaign: '#8b5cf6',
    partnership: '#f59e0b',
    event: '#10b981',
    other: '#6b7280',
  };

  const filtered = items
    .filter(i => filterCategory === 'all' || i.category === filterCategory)
    .filter(i => !searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase()) || (i.notes ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b flex items-center gap-3 flex-wrap shrink-0" style={{ borderColor: BORDER }}>
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search planner…"
            className="w-full rounded-xl border px-4 py-2.5 text-sm text-white/70 bg-transparent outline-none placeholder:text-white/25"
            style={{ borderColor: BORDER }}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border transition capitalize"
              style={{
                borderColor: filterCategory === c ? GOLD : BORDER,
                background: filterCategory === c ? `${GOLD}18` : SURFACE,
                color: filterCategory === c ? GOLD : 'rgba(255,255,255,0.35)',
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setDefaultDate(new Date().toISOString().slice(0, 10)); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition hover:brightness-110"
          style={{ background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000' }}
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <BookOpen className="w-12 h-12 mb-4 text-white/10" />
            <p className="text-sm font-medium text-white/30">
              {items.length === 0 ? 'Your content planner is empty' : 'No items match your filter'}
            </p>
            <p className="text-xs text-white/20 mt-1">
              {items.length === 0 ? 'Start adding planned posts, campaigns, and events' : 'Try adjusting your search or category filter'}
            </p>
            {items.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 flex items-center gap-1.5 text-xs font-bold transition hover:brightness-125"
                style={{ color: GOLD }}
              >
                <Plus className="w-3.5 h-3.5" /> Add your first item
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => (
              <div
                key={item.id}
                className="rounded-2xl border p-4 flex items-start gap-3 transition hover:border-white/15"
                style={{ borderColor: BORDER, background: SURFACE }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                  style={{ background: CATEGORY_COLORS[item.category] || '#6b7280' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80">{item.title}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-white/30 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.plannedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {item.plannedTime && (
                      <span className="text-xs text-white/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.plannedTime}
                      </span>
                    )}
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                      style={{ background: `${CATEGORY_COLORS[item.category] || '#6b7280'}20`, color: CATEGORY_COLORS[item.category] || '#6b7280' }}
                    >
                      {item.category}
                    </span>
                  </div>
                  {item.notes && <p className="text-xs text-white/40 mt-1.5 leading-relaxed">{item.notes}</p>}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="shrink-0 p-1.5 rounded-lg transition hover:bg-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400/50" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddPlannerItemModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
        defaultDate={defaultDate}
      />
    </div>
  );
}

// ─── CalendarView ─────────────────────────────────────────────────────────────

function CalendarView({
  posts,
  userId,
}: {
  posts: ScheduledPost[];
  userId: string | null;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>(() => {
    try { const raw = localStorage.getItem('mm_planner_items'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const postsByDay: Record<string, ScheduledPost[]> = {};
  posts.forEach(p => {
    const k = p.scheduledAt.toISOString().slice(0, 10);
    if (!postsByDay[k]) postsByDay[k] = [];
    postsByDay[k].push(p);
  });

  const itemsByDay: Record<string, PlannerItem[]> = {};
  plannerItems.forEach(item => {
    if (!itemsByDay[item.plannedDate]) itemsByDay[item.plannedDate] = [];
    itemsByDay[item.plannedDate].push(item);
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const openDay = (day: number) => {
    setSelectedDate(new Date(year, month, day));
    setDayModalOpen(true);
  };

  const handleAddFromDay = () => {
    setDayModalOpen(false);
    setAddModalOpen(true);
  };

  const handleAddItem = (item: PlannerItem) => {
    const next = [...plannerItems, item];
    setPlannerItems(next);
    try { localStorage.setItem('mm_planner_items', JSON.stringify(next)); } catch {}
  };

  const cells = Array.from({ length: firstDay }, (_, i) => ({ key: `empty-${i}`, empty: true }))
    .concat(Array.from({ length: daysInMonth }, (_, i) => ({ key: `day-${i + 1}`, day: i + 1, empty: false })));

  return (
    <div className="flex-1 flex flex-col min-h-0 p-4">
      {/* Nav */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/10 transition">
          <ChevronLeft className="w-5 h-5 text-white/60" />
        </button>
        <h2 className="text-base font-bold text-white">{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/10 transition">
          <ChevronRight className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-bold text-white/20 pb-2 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 flex-1">
        {cells.map(cell => {
          if (cell.empty) return <div key={cell.key} />;
          const day = cell.day!;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayPosts = postsByDay[dateStr] || [];
          const dayItems = itemsByDay[dateStr] || [];
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const hasContent = dayPosts.length > 0 || dayItems.length > 0;

          return (
            <button
              key={cell.key}
              onClick={() => openDay(day)}
              className="rounded-xl p-1.5 min-h-[64px] flex flex-col items-start transition hover:bg-white/08 text-left"
              style={{
                background: isToday ? `${GOLD}12` : undefined,
                border: `1px solid ${isToday ? `${GOLD}40` : BORDER}`,
              }}
            >
              <span
                className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center mb-1 ${isToday ? 'text-black' : 'text-white/50'}`}
                style={isToday ? { background: GOLD } : {}}
              >
                {day}
              </span>
              {dayPosts.slice(0, 2).map(p => (
                <div
                  key={p.id}
                  className="w-full rounded text-[9px] px-1 py-0.5 truncate font-medium mb-0.5"
                  style={{ background: `${GOLD}20`, color: GOLD }}
                >
                  {p.content.slice(0, 18)}…
                </div>
              ))}
              {dayItems.slice(0, 1).map(i => (
                <div
                  key={i.id}
                  className="w-full rounded text-[9px] px-1 py-0.5 truncate font-medium"
                  style={{ background: 'rgba(99,102,241,0.2)', color: 'rgba(165,180,252,0.9)' }}
                >
                  {i.title.slice(0, 18)}
                </div>
              ))}
              {(dayPosts.length + dayItems.length) > 3 && (
                <span className="text-[9px] text-white/25 mt-0.5">+{dayPosts.length + dayItems.length - 3} more</span>
              )}
            </button>
          );
        })}
      </div>

      <DayDetailModal
        open={dayModalOpen}
        onClose={() => setDayModalOpen(false)}
        date={selectedDate}
        items={selectedDate ? (itemsByDay[selectedDate.toISOString().slice(0, 10)] || []) : []}
        posts={selectedDate ? (postsByDay[selectedDate.toISOString().slice(0, 10)] || []) : []}
        onAddItem={handleAddFromDay}
      />
      <AddPlannerItemModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddItem}
        defaultDate={selectedDate?.toISOString().slice(0, 10)}
      />
    </div>
  );
}

// ─── ComposerPanel ─────────────────────────────────────────────────────────────

function ComposerPanel({
  userId,
  channels,
  posts,
  onPost,
}: {
  userId: string | null;
  channels: PostizIntegration[];
  posts: ScheduledPost[];
  onPost: (post: ScheduledPost) => void;
}) {
  const [savedPosts, setSavedPosts] = useState<Array<{
    id: string; content: string; platforms: string[]; mediaUrl?: string; mediaType?: 'video' | 'image';
  }>>(() => {
    try { const raw = localStorage.getItem('mm_saved_posts'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [composerContent, setComposerContent] = useState('');
  const [activeTab, setActiveTab] = useState<'compose' | 'saved' | 'ideas'>('compose');

  const persistSaved = (next: typeof savedPosts) => {
    setSavedPosts(next);
    try { localStorage.setItem('mm_saved_posts', JSON.stringify(next)); } catch {}
  };

  const handleSave = (content: string, platforms: string[], mediaUrl?: string, mediaType?: 'video' | 'image') => {
    if (!content.trim()) return;
    persistSaved([{ id: Date.now().toString(), content, platforms, mediaUrl, mediaType }, ...savedPosts]);
  };

  const handleDeleteSaved = (id: string) => { persistSaved(savedPosts.filter(p => p.id !== id)); };

  const TABS = [
    { id: 'compose' as const, label: 'Compose', icon: <Edit3 className="w-4 h-4" /> },
    { id: 'saved' as const, label: `Saved${savedPosts.length > 0 ? ` (${savedPosts.length})` : ''}`, icon: <FileText className="w-4 h-4" /> },
    { id: 'ideas' as const, label: 'Ideas', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b shrink-0" style={{ borderColor: BORDER }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition border-b-2 -mb-px"
            style={{
              borderColor: activeTab === tab.id ? GOLD : 'transparent',
              color: activeTab === tab.id ? GOLD : 'rgba(255,255,255,0.35)',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'compose' && (
          <InlinePostComposer
            userId={userId}
            channels={channels}
            onPost={onPost}
            onSave={handleSave}
            initialContent={composerContent}
          />
        )}

        {activeTab === 'saved' && (
          <div className="space-y-4">
            {savedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileText className="w-12 h-12 mb-4 text-white/10" />
                <p className="text-sm font-medium text-white/30">No saved posts yet</p>
                <p className="text-xs text-white/20 mt-1">Save posts from the Compose tab to reuse them later</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {savedPosts.map(p => (
                  <SavedPostCard
                    key={p.id}
                    content={p.content}
                    platforms={p.platforms}
                    mediaUrl={p.mediaUrl}
                    mediaType={p.mediaType}
                    onUse={() => { setComposerContent(p.content); setActiveTab('compose'); }}
                    onDelete={() => handleDeleteSaved(p.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ideas' && (
          <InlineContentIdeas
            userId={userId}
            onSelectIdea={text => { setComposerContent(text); setActiveTab('compose'); }}
          />
        )}
      </div>
    </div>
  );
}

// ─── PartnerDashboard ─────────────────────────────────────────────────────────

function PartnerDashboard({ userId }: { userId: string | null }) {
  type Partner = {
    id: string;
    name: string;
    email: string;
    split: number;
    status: 'active' | 'pending' | 'paused';
    revenue: number;
    joined: string;
  };

  const [partners, setPartners] = useState<Partner[]>(() => {
    try { const raw = localStorage.getItem('mm_partners'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSplit, setNewSplit] = useState(20);
  const [addError, setAddError] = useState<string | null>(null);

  const persist = (next: Partner[]) => {
    setPartners(next);
    try { localStorage.setItem('mm_partners', JSON.stringify(next)); } catch {}
  };

  const handleAdd = () => {
    if (!newName.trim() || !newEmail.trim()) { setAddError('Name and email are required'); return; }
    const partner: Partner = {
      id: Date.now().toString(),
      name: newName.trim(),
      email: newEmail.trim(),
      split: newSplit,
      status: 'pending',
      revenue: 0,
      joined: new Date().toISOString().slice(0, 10),
    };
    persist([...partners, partner]);
    setNewName('');
    setNewEmail('');
    setNewSplit(20);
    setAddError(null);
    setShowAdd(false);
  };

  const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
    pending: { bg: `${GOLD}18`, color: GOLD },
    paused: { bg: 'rgba(100,116,139,0.15)', color: 'rgba(148,163,184,0.7)' },
  };

  const totalRevenue = partners.reduce((s, p) => s + p.revenue, 0);
  const activeCount = partners.filter(p => p.status === 'active').length;

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Partners', value: partners.length, icon: <Users className="w-4 h-4" style={{ color: GOLD }} /> },
          { label: 'Active', value: activeCount, icon: <TrendingUp className="w-4 h-4 text-green-400" /> },
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: <DollarSign className="w-4 h-4 text-blue-400" /> },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border p-4" style={{ borderColor: BORDER, background: SURFACE }}>
            <div className="flex items-center justify-between mb-2">
              {stat.icon}
              <span className="text-xl font-bold text-white">{stat.value}</span>
            </div>
            <p className="text-xs text-white/30">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Add partner */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Partners</h3>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:brightness-110"
          style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}30` }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Partner
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: `${GOLD}30`, background: `${GOLD}05` }}>
          {addError && (
            <p className="text-xs text-red-400">{addError}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Partner name"
              className="rounded-xl border px-4 py-2.5 text-sm text-white bg-transparent outline-none placeholder:text-white/25"
              style={{ borderColor: BORDER }}
            />
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="Email address"
              className="rounded-xl border px-4 py-2.5 text-sm text-white bg-transparent outline-none placeholder:text-white/25"
              style={{ borderColor: BORDER }}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-white/40 shrink-0">Revenue split:</label>
            <input
              type="range"
              min={5} max={50} step={5}
              value={newSplit}
              onChange={e => setNewSplit(Number(e.target.value))}
              className="flex-1 accent-yellow-500"
            />
            <span className="text-sm font-bold w-10 text-right" style={{ color: GOLD }}>{newSplit}%</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000' }}
            >
              Add Partner
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddError(null); }}
              className="px-4 py-2.5 rounded-xl text-sm border transition hover:bg-white/05"
              style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Partner list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {partners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Gift className="w-12 h-12 mb-4 text-white/10" />
            <p className="text-sm font-medium text-white/30">No partners yet</p>
            <p className="text-xs text-white/20 mt-1">Add revenue-sharing partners to grow your network</p>
          </div>
        ) : (
          partners.map(p => (
            <div
              key={p.id}
              className="rounded-2xl border p-4 flex items-center gap-4"
              style={{ borderColor: BORDER, background: SURFACE }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: `${GOLD}18`, color: GOLD }}
              >
                {p.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80 truncate">{p.name}</p>
                <p className="text-xs text-white/30 truncate">{p.email}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold" style={{ color: GOLD }}>{p.split}% split</p>
                <p className="text-xs text-white/30">${p.revenue.toLocaleString()} earned</p>
              </div>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0"
                style={{ background: STATUS_COLORS[p.status].bg, color: STATUS_COLORS[p.status].color }}
              >
                {p.status}
              </span>
              <button
                onClick={() => persist(partners.filter(x => x.id !== p.id))}
                className="p-1.5 rounded-lg transition hover:bg-red-500/20 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400/50" />
              </button>
            </div>
          ))
        )}
      </div>
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
    { id: 'video'    as ViewMode, label: 'AI Video', icon: <Film className="w-5 h-5" /> },
    { id: 'partner'  as ViewMode, label: 'Earn',     icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
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
                <div key={int.id} className="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition">
                  <PlatformIcon id={int.profile || int.identifier} size="sm" />
                  <span className="text-xs text-white/50 truncate flex-1">{int.name}</span>
                  <button
                    onClick={onOpenConnect}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
                    title="Manage / Disconnect">
                    <Link2Off className="w-3 h-3 text-red-400/60 hover:text-red-400" />
                  </button>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 md:group-hover:hidden" />
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t"
        style={{ background: '#0d0d0f', borderColor: BORDER, paddingBottom: 'env(safe-area-inset-bottom)' }}>
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

function UserMenu({ user, onSignOut, subscription, onManagePlan }: { user: { email: string }; onSignOut: () => void; subscription?: { plan: string; status: string } | null; onManagePlan?: () => void }) {
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
        {subscription?.status === 'active' && (
          <button onClick={onManagePlan} title="Manage subscription"
            style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000', letterSpacing: '0.06em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            {subscription.plan}
          </button>
        )}
        {(!subscription || subscription.status !== 'active') && user && (
          <button onClick={onManagePlan} title="Upgrade plan"
            style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', flexShrink: 0 }}>
            upgrade
          </button>
        )}
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

function TopBar({ integrations, integrationsLoading, onConnect, onDisconnect, onRefresh, onOpenConnect, user, onSignOut, onSignIn, subscription, onManagePlan }: {
  integrations: PostizIntegration[]; integrationsLoading: boolean;
  onConnect: () => void; onDisconnect: () => void; onRefresh: (force?: boolean) => void; onOpenConnect: () => void;
  user: { email: string } | null; onSignOut: () => void; onSignIn: () => void;
  subscription?: { plan: string; status: string } | null;
  onManagePlan?: () => void;
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
            <UserMenu user={user} onSignOut={onSignOut} subscription={subscription} onManagePlan={onManagePlan} />
          </>
        ) : (
          <button onClick={onSignIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition hover:brightness-110"
            style={{ background: GOLD, color: '#000' }}>
            <Link2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Already have an account? Sign In to Connect</span>
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
  const [subscription, setSubscription]         = useState<{ plan: string; status: string; current_period_end: string; stripe_customer_id?: string } | null>(null);
  const [checkoutLoading, setCheckoutLoading]   = useState<string | null>(null);
  const [portalLoading, setPortalLoading]       = useState(false);
  const [pricingOpen, setPricingOpen]           = useState(false);
  const [promoCode, setPromoCode]               = useState('');
  const [promoLoading, setPromoLoading]         = useState(false);
  const [promoError, setPromoError]             = useState('');
  const [promoSuccess, setPromoSuccess]         = useState('');
  const [integrations, setIntegrations]         = useState<PostizIntegration[]>([]);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen]       = useState(false);
  const { user: authUser, signOut }             = useAuth();
  const currentUser = authUser ? { id: authUser.id, email: authUser.email ?? '' } : null;

  useEffect(() => {
    if (window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    // Persist ?ref= code before sign-up so it survives the auth flow
    const refParam = new URLSearchParams(window.location.search).get('ref');
    if (refParam) localStorage.setItem('mm_ref_code', refParam);
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

  useEffect(() => {
    if (!currentUserId) return;
    loadIntegrations();
    // Load subscription
    (async () => {
      try {
        const { data } = await supabase.from('subscriptions').select('plan,status,current_period_end,stripe_customer_id').eq('supabase_user_id', currentUserId).maybeSingle();
        if (data) setSubscription(data);
      } catch (_) {}
    })();
    // Handle ?checkout=success return
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(async () => {
        const { data } = await supabase.from('subscriptions').select('plan,status,current_period_end,stripe_customer_id').eq('supabase_user_id', currentUserId).maybeSingle();
        if (data) setSubscription(data);
      }, 2500);
    }
    // Handle ?ref= referral code — record it when user is logged in
    const refCode = params.get('ref') || localStorage.getItem('mm_ref_code');
    if (refCode) {
      localStorage.removeItem('mm_ref_code');
      window.history.replaceState({}, '', window.location.pathname);
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await fetch(`${SUPABASE_URL}/functions/v1/referral-record`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ referralCode: refCode }),
            });
          }
        } catch (_) {}
      })();
    }
  }, [currentUserId]);

  // ── Social account return detection ──────────────────────────────────────
  const pollForChannels = useCallback(async () => {
    if (!currentUserId) return;
    setIntegrationsLoading(true);
    let found = false;
    try {
      const channels = await fetchChannels(currentUserId, true);
      setIntegrations(channels);
      if (channels.length > 0) found = true;
    } catch { /* keep going */ }

    if (!found) {
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(r => setTimeout(r, 2500));
        try {
          const channels = await fetchChannels(currentUserId, true);
          setIntegrations(channels);
          if (channels.length > 0) { found = true; break; }
        } catch { /* keep polling */ }
      }
    }
    setIntegrationsLoading(false);
  }, [currentUserId]);

  // Signal 1: URL param ?connected=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === '1') {
      window.history.replaceState({}, '', window.location.pathname);
      try { localStorage.removeItem(LS_SOCIAL_RETURN_KEY); } catch {}
      setConnectModalOpen(false);
      pollForChannels();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Signal 2: localStorage flag
  useEffect(() => {
    const isSocialReturn = (() => {
      try { return localStorage.getItem(LS_SOCIAL_RETURN_KEY) === '1' || !!localStorage.getItem('ayrshare_connected'); }
      catch { return false; }
    })();
    if (isSocialReturn) {
      try { localStorage.removeItem(LS_SOCIAL_RETURN_KEY); localStorage.removeItem('ayrshare_connected'); } catch {}
      window.history.replaceState({}, '', window.location.pathname);
      setConnectModalOpen(false);
      pollForChannels();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Signal 3: visibilitychange
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const flag = (() => { try { return localStorage.getItem(LS_SOCIAL_RETURN_KEY) === '1'; } catch { return false; } })();
      if (flag) {
        try { localStorage.removeItem(LS_SOCIAL_RETURN_KEY); } catch {}
        setConnectModalOpen(false);
        pollForChannels();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [pollForChannels]);

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

  const handleDisconnectPlatform = async (platformId: string) => {
    setIntegrations(prev => prev.filter(i => (i.profile || i.id) !== platformId));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ayrshare-disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ platform: platformId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        loadIntegrations(true);
        throw new Error(err.error || 'Failed to disconnect');
      }
    } catch (err) {
      loadIntegrations(true);
      throw err;
    }
  };

  const handleCheckout = async (plan: string) => {
    if (!currentUser) { setAuthModalOpen(true); return; }
    setCheckoutLoading(plan);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plan, successUrl: window.location.href + '?checkout=success', cancelUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Checkout failed');
    } catch (e: any) { setOauthError(e.message); }
    finally { setCheckoutLoading(null); }
  };

  const handlePortal = async () => {
    if (subscription?.stripe_customer_id?.startsWith('promo_')) {
      setOauthError('Your account was activated with a promo code. No billing to manage.');
      return;
    }
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.promo) {
        setOauthError('Your account was activated with a promo code. No billing to manage.');
        return;
      }
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Portal failed');
    } catch (e: any) { setOauthError(e.message); }
    finally { setPortalLoading(false); }
  };

  const handlePromoRedeem = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    setPromoSuccess('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch('https://wcbkzebgcsfvrugibsjr.supabase.co/functions/v1/redeem-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setPromoError(data.error || 'Invalid promo code'); return; }
      setPromoSuccess('🎉 Promo applied! Unlocking your account...');
      setTimeout(async () => {
        if (currentUser) {
          const { data: sub } = await supabase.from('subscriptions').select('*').eq('supabase_user_id', currentUser.id).single();
          if (sub) setSubscription(sub);
        }
        setPricingOpen(false);
        setPromoCode('');
        setPromoSuccess('');
      }, 1500);
    } catch {
      setPromoError('Something went wrong. Please try again.');
    } finally {
      setPromoLoading(false);
    }
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
        @media (min-width: 640px) {
          .mm-pricing-backdrop { align-items: center !important; padding: 16px !important; }
          .mm-pricing-sheet { border-radius: 24px !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; max-height: 90vh !important; }
        }
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
        onOpenConnect={() => subscription?.status === 'active' ? setConnectModalOpen(true) : setPricingOpen(true)}
        user={currentUser}
        onSignOut={handleSignOut}
        onSignIn={() => setAuthModalOpen(true)}
        subscription={subscription}
        onManagePlan={currentUser ? (subscription?.status === 'active' ? handlePortal : () => setPricingOpen(true)) : () => setAuthModalOpen(true)}
      />

      {/* ── STATE 1: Logged out — simple hero + sign in/up ── */}
      {!currentUser ? (
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}08 0%, transparent 65%)`, top: '35%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', animation: 'mmPulse 6s ease-in-out infinite' }} />
          <div className="relative flex flex-col items-center justify-center min-h-full" style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 5vw, 32px)', animation: 'mmFadeUp 0.5s ease both' }}>
            {/* Logo */}
            <div style={{ width: 64, height: 64, borderRadius: 18, background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: `0 16px 48px ${GOLD}35`, flexShrink: 0 }}>
              <Send size={26} color="#000" />
            </div>
            <span className="mm-gold-shimmer" style={{ display: 'block', fontSize: 'clamp(32px, 8vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.0, marginBottom: 8, textAlign: 'center' }}>Media Machine</span>
            <span style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>By Infinite Wealth Solutions AI</span>
            <p style={{ fontSize: 'clamp(14px, 3vw, 17px)', color: 'rgba(255,255,255,0.55)', marginBottom: 12, lineHeight: 1.6, textAlign: 'center', maxWidth: 420, fontWeight: 500 }}>
              One video. Thirty pieces of content. Every platform.
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '0 0 36px', lineHeight: 1.6, textAlign: 'center', maxWidth: 380 }}>
              Upload a video and Media Machine handles the rest. AI video analysis, caption generation, platform scheduling, and content strategy. All automatic.
            </p>
            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 40, maxWidth: 440 }}>
              {['🤖 AI Video Analysis', '✍️ Platform Captions', '♻️ Content Repurposing', '📅 Smart Scheduling', '💡 Strategy Planner', '🎬 AI Video Studio'].map(f => (
                <span key={f} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{f}</span>
              ))}
            </div>
            {/* CTA buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%', maxWidth: 320 }}>
              <button onClick={() => setAuthModalOpen(true)}
                style={{ width: '100%', padding: '14px 0', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})`, color: '#000', border: 'none', boxShadow: `0 8px 32px ${GOLD}40`, letterSpacing: '-0.01em' }}>
                Start Multiplying Your Content
              </button>
              <button onClick={() => setAuthModalOpen(true)}
                style={{ width: '100%', padding: '12px 0', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}>
                Already have an account? Sign In
              </button>
            </div>
            {/* Subtle referral nudge */}
            <div style={{ marginTop: 32, padding: '12px 20px', borderRadius: 12, background: 'rgba(200,162,74,0.06)', border: '1px solid rgba(200,162,74,0.15)', textAlign: 'center', maxWidth: 320 }}>
              <span style={{ fontSize: 11, color: 'rgba(200,162,74,0.7)', fontWeight: 600, letterSpacing: '0.04em' }}>
                💸 2 for 20 Partner Program
              </span>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '4px 0 0', lineHeight: 1.5 }}>
                Sign up and earn 20% recurring commission for every person you refer. They get 20% off their first month.
              </p>
            </div>
          </div>
        </div>

      ) : (
        /* ── STATES 2 & 3: Logged in — always show dashboard ── */
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Upgrade banner — only shown when no active subscription */}
          {subscription?.status !== 'active' && (
            <div style={{ background: `linear-gradient(90deg, ${GOLD_D}22, ${GOLD}18, ${GOLD_D}22)`, borderBottom: `1px solid ${GOLD}30`, padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500, whiteSpace: 'nowrap' }}>✨ Free preview</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'inline' }}>—</span>
              <button onClick={() => setPricingOpen(true)}
                style={{ fontSize: 12, fontWeight: 800, color: GOLD_L, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 0, whiteSpace: 'nowrap' }}>
                Upgrade to start multiplying your content
              </button>
            </div>
          )}
          <div className="flex flex-1 overflow-hidden min-h-0">
          <Sidebar view={view} setView={setView} integrations={integrations}
            onOpenConnect={() => subscription?.status === 'active' ? setConnectModalOpen(true) : setPricingOpen(true)} />
          <main className="flex-1 flex flex-col min-h-0 overflow-x-hidden" style={{ position: 'relative' }}>

            {view === 'composer' && <ComposerPanel integrations={integrations} userId={currentUser?.id ?? null} />}
            {view === 'calendar' && <CalendarView  integrations={integrations} userId={currentUser?.id ?? null} />}
            {view === 'planner'  && <PlannerPanel  userId={currentUser?.id ?? null} />}
            {view === 'video'    && <AIVideoStudio userId={currentUser?.id ?? null} />}
            {view === 'partner'  && <PartnerDashboard userId={currentUser?.id ?? null} userEmail={currentUser?.email ?? null} userName={authUser?.user_metadata?.full_name ?? authUser?.user_metadata?.name ?? null} />}
          </main>
          </div>
        </div>
      )}

      {/* ── Pricing Modal ── */}
      {pricingOpen && (
        <div className="mm-pricing-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0, animation: 'mmFadeUp 0.2s ease both' }}
          onClick={e => { if (e.target === e.currentTarget) setPricingOpen(false); }}>
          <div className="mm-pricing-sheet" style={{ width: '100%', maxWidth: 820, background: '#111', borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', padding: 'clamp(20px, 5vw, 36px) clamp(16px, 5vw, 36px)', position: 'relative', maxHeight: '92dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <button onClick={() => setPricingOpen(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#10005;</button>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 900, color: 'white', marginBottom: 6, letterSpacing: '-0.02em' }}>Choose Your Plan</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Every plan includes AI video analysis, caption generation, content repurposing, scheduling, the content planner, and AI Video Studio.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 'clamp(8px, 2vw, 14px)' }}>
                {[
                  { name: 'Starter', price: '$47', per: '/mo', features: ['10 AI video analyses/mo', '30 scheduled posts/mo', 'Up to 3 platforms per post', 'AI caption generation', 'Content calendar'], highlight: false },
                  { name: 'Creator', price: '$97', per: '/mo', features: ['40 AI video analyses/mo', '150 scheduled posts/mo', 'All platforms, no limits', 'AI captions + repurposing engine', 'Content planner + strategy AI'], highlight: true },
                  { name: 'Agency', price: '$199', per: '/mo', features: ['Unlimited AI video analyses', 'Unlimited scheduled posts', 'All platforms, no limits', 'Everything in Creator', 'Priority support + onboarding call'], highlight: false },
                ].map(pkg => {
                  const isCurrentPlan = subscription?.status === 'active' && subscription?.plan === pkg.name.toLowerCase();
                  const isLoading = checkoutLoading === pkg.name.toLowerCase();
                  return (
                    <div key={pkg.name} style={{ borderRadius: 16, padding: 'clamp(12px, 3vw, 22px) clamp(10px, 2.5vw, 16px)', background: pkg.highlight ? `linear-gradient(160deg, ${GOLD}1a, ${GOLD}0a)` : 'rgba(255,255,255,0.03)', border: `1px solid ${pkg.highlight ? GOLD + '60' : 'rgba(255,255,255,0.09)'}`, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: pkg.highlight ? `0 12px 48px ${GOLD}25` : 'none' }}>
                      {pkg.highlight && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />}
                      {pkg.highlight && <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 7, fontWeight: 800, padding: '2px 6px', borderRadius: 20, background: GOLD, color: '#000', textTransform: 'uppercase' }}>Popular</span>}
                      <div style={{ fontSize: 9, fontWeight: 700, color: pkg.highlight ? GOLD_L : 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>{pkg.name}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 8 }}>
                        <span style={{ fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: 900, color: pkg.highlight ? GOLD_L : 'white', letterSpacing: '-0.03em', lineHeight: 1 }}>{pkg.price}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{pkg.per}</span>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {pkg.features.map(f => (
                          <li key={f} style={{ fontSize: 'clamp(9px, 2vw, 11px)', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                            <span style={{ color: pkg.highlight ? GOLD : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>&#10003;</span>{f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => isCurrentPlan ? handlePortal() : handleCheckout(pkg.name.toLowerCase())}
                        disabled={isLoading || portalLoading}
                        style={{ marginTop: 'auto', width: '100%', padding: 'clamp(7px, 1.5vw, 10px) 0', borderRadius: 9, fontSize: 'clamp(10px, 2vw, 12px)', fontWeight: 800, cursor: 'pointer', background: isCurrentPlan ? 'rgba(74,222,128,0.15)' : pkg.highlight ? `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})` : 'rgba(255,255,255,0.07)', color: isCurrentPlan ? 'rgb(74,222,128)' : pkg.highlight ? '#000' : 'rgba(255,255,255,0.7)', border: isCurrentPlan ? '1px solid rgba(74,222,128,0.4)' : pkg.highlight ? 'none' : '1px solid rgba(255,255,255,0.12)', opacity: isLoading ? 0.6 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span>{isLoading ? 'Loading...' : isCurrentPlan ? '✓ Current Plan' : 'Subscribe'}</span>
                        {isLoading && <span style={{ fontSize: 8, opacity: 0.6, fontWeight: 500 }}>May take up to 30 seconds</span>}
                      </button>
                    </div>
                  );
                })}
            </div>

            {/* Promo Code */}
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 500, whiteSpace: 'nowrap' }}>Have a promo code?</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); setPromoSuccess(''); }}
                  onKeyDown={e => e.key === 'Enter' && handlePromoRedeem()}
                  placeholder="Enter code"
                  style={{ width: 110, padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', letterSpacing: '0.08em' }}
                />
                <button
                  onClick={handlePromoRedeem}
                  disabled={promoLoading || !promoCode.trim()}
                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000', border: 'none', opacity: promoLoading || !promoCode.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                  {promoLoading ? '...' : 'Apply'}
                </button>
              </div>
              {promoError && <div style={{ width: '100%', marginTop: 4, fontSize: 11, color: '#f87171', textAlign: 'center' }}>{promoError}</div>}
              {promoSuccess && <div style={{ width: '100%', marginTop: 4, fontSize: 11, color: 'rgb(74,222,128)', textAlign: 'center' }}>{promoSuccess}</div>}
            </div>

          </div>
        </div>
      )}

      <ConnectAccountsModal
        open={connectModalOpen} onClose={() => setConnectModalOpen(false)}
        integrations={integrations} onConnectPostiz={handleConnect}
        integrationsLoading={integrationsLoading}
        onRefresh={(force) => loadIntegrations(force)}
        onDisconnectPlatform={handleDisconnectPlatform}
        currentUser={currentUser}
      />

      <MediaMachineAuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
        }}
      />
    </div>
  );
}
