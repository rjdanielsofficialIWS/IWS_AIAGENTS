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

// Resolve a raw API status against current time — if scheduled but past-due, treat as published
const resolveStatus = (raw: string, scheduledAt: Date): 'scheduled' | 'published' | 'failed' => {
  if (raw === 'scheduled' && scheduledAt < new Date()) return 'published';
  return (raw as any) || 'scheduled';
};

// Viral content angles injected into every AI generation call
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

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

type ViewMode = 'composer' | 'calendar' | 'planner' | 'partner' | 'video' | 'workspaces';

type Workspace = { id: string; name: string; color: string; assignedChannelIds: string[]; createdAt: string };

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
  workspaceId?: string | null; thread?: string[]; carousel?: boolean;
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

async function fetchChannels(userId: string, force = false, workspaceId?: string | null): Promise<PostizIntegration[]> {
  if (!userId) return [];
  const wsParam = workspaceId ? `&workspaceId=${encodeURIComponent(workspaceId)}` : '';
  const url = `${SUPABASE_URL}/functions/v1/ayrshare-channels?userId=${encodeURIComponent(userId)}${force ? '&force=true' : ''}${wsParam}`;
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

function PlatformIcon({ id, size = 'md', picture }: { id: string; size?: 'sm' | 'md' | 'lg'; picture?: string }) {
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
    reddit: {
      bg: '#FF4500',
      node: <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="white"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>,
    },
    telegram: {
      bg: '#229ED9',
      node: <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
    },
  };

  const logo = logos[key];

  // Profile photo avatar with platform badge
  if (picture && picture.startsWith('http')) {
    const badgePx = size === 'sm' ? 20 : size === 'lg' ? 30 : 24;
    const badgeOffset = -6;
    return (
      <div style={{ position: 'relative', width: px, height: px, flexShrink: 0 }}>
        <div style={{ width: px, height: px, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', border: '1.5px solid rgba(255,255,255,0.15)' }}>
          <img src={picture} alt={id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
        {logo && (
          <div style={{ position: 'absolute', bottom: badgeOffset, right: badgeOffset, width: badgePx, height: badgePx, borderRadius: '50%', background: logo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #111', boxShadow: '0 1px 4px rgba(0,0,0,0.8)', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ transform: `scale(${badgePx / 24})`, transformOrigin: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{logo.node}</div>
          </div>
        )}
      </div>
    );
  }

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

// ─── ConnectAccountsModal ─────────────────────────────────────────────────────

function ConnectAccountsModal({
  open, onClose, integrations, onConnectPostiz, integrationsLoading, onRefresh, currentUser, onDisconnectPlatform, workspaceId, isSubscriptionActive = false, onNeedsPricing,
}: {
  open: boolean; onClose: () => void; integrations: PostizIntegration[];
  onConnectPostiz: () => void; integrationsLoading: boolean;
  onRefresh: (force?: boolean) => void;
  onDisconnectPlatform: (platformId: string) => Promise<void>;
  currentUser: { id: string; email: string } | null;
  workspaceId?: string | null;
  isSubscriptionActive?: boolean;
  onNeedsPricing?: () => void;
}) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null); // platform id being connected via Late
  const [error, setError] = useState<string | null>(null);
  const [liveEmail, setLiveEmail] = useState<string>('');

  const CONNECTABLE_PLATFORMS: { id: string; label: string; color: string; bg: string }[] = [
    { id: 'instagram',  label: 'Instagram',   color: '#E1306C', bg: 'rgba(225,48,108,0.12)' },
    { id: 'facebook',   label: 'Facebook',    color: '#1877F2', bg: 'rgba(24,119,242,0.12)' },
    { id: 'twitter',    label: 'X (Twitter)', color: '#ffffff', bg: 'rgba(255,255,255,0.08)' },
    { id: 'linkedin',   label: 'LinkedIn',    color: '#0A66C2', bg: 'rgba(10,102,194,0.12)' },
    { id: 'tiktok',     label: 'TikTok',      color: '#ffffff', bg: 'rgba(255,255,255,0.08)' },
    { id: 'youtube',    label: 'YouTube',     color: '#FF0000', bg: 'rgba(255,0,0,0.12)' },
    { id: 'threads',    label: 'Threads',     color: '#ffffff', bg: 'rgba(255,255,255,0.08)' },
    { id: 'bluesky',    label: 'Bluesky',     color: '#0085ff', bg: 'rgba(0,133,255,0.12)' },
    { id: 'pinterest',  label: 'Pinterest',   color: '#E60023', bg: 'rgba(230,0,35,0.12)' },
  ];


  useEffect(() => {
    if (open) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setLiveEmail(user?.email ?? '');
      });
    } else {
      setConnecting(null);
      setError(null);
    }
  }, [open]);

  const handleConnectPlatform = async (platformId: string) => {
    setConnecting(platformId); setError(null);
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session) { setConnecting(null); onClose(); onConnectPostiz(); return; }

      // On mobile open in same tab, on desktop open popup
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      const popup = isMobile ? null : window.open('', '_blank');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/ayrshare-connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ platform: platformId, ...(workspaceId ? { workspaceId } : {}) }),
      });

      if (!res.ok) {
        popup?.close();
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${res.status}`);
      }

      const { connectUrl } = await res.json();
      if (!connectUrl) { popup?.close(); throw new Error('No connect URL returned'); }

      localStorage.setItem(LS_SOCIAL_RETURN_KEY, '1');
      if (popup) { popup.location.href = connectUrl; }
      else { window.location.href = connectUrl; }
      setConnecting(null);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to open connection. Please try again.');
      setConnecting(null);
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
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Connect Channels
              {integrationsLoading && <Loader className="w-3.5 h-3.5 animate-spin" style={{ color: GOLD }} />}
            </h2>
            <p className="text-sm text-white/40 mt-0.5">
              {integrationsLoading ? 'Syncing your accounts…' : liveEmail ? `Account: ${liveEmail}` : 'Link your social accounts to start scheduling'}
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
                  <div key={int.id} className="group flex items-center gap-3 p-3 rounded-xl border transition"
                    style={{ borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.05)' }}>
                    <PlatformIcon id={int.profile || int.identifier} size="md" picture={int.picture} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{int.name}</div>
                      <div className="text-xs text-white/30">{int.profile || int.identifier}</div>
                    </div>
                    <button
                      onClick={async () => {
                        const platformId = int.profile || int.id;
                        setDisconnecting(platformId);
                        setError(null);
                        try {
                          const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
                          if (sessionErr || !session) throw new Error('Not signed in');
                          const res = await fetch(`${SUPABASE_URL}/functions/v1/ayrshare-disconnect`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                            body: JSON.stringify({ platform: platformId, ...(workspaceId ? { workspaceId } : {}) }),
                          });
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            throw new Error(err.error || 'Failed to disconnect');
                          }
                          onRefresh(true);
                        } catch (e: any) {
                          setError(e.message || 'Failed to disconnect');
                        } finally {
                          setDisconnecting(null);
                        }
                      }}
                      disabled={disconnecting === (int.profile || int.id)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition hover:bg-red-500/15 disabled:opacity-40"
                      style={{ color: 'rgba(239,68,68,0.7)', border: '1px solid rgba(239,68,68,0.2)' }}
                      title="Disconnect account">
                      {disconnecting === (int.profile || int.id)
                        ? <><Loader className="w-3 h-3 animate-spin" /> Removing…</>
                        : <><Link2Off className="w-3 h-3" /> Disconnect</>}
                    </button>
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 group-hover:hidden" />
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

          <div>
            <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">
              {integrations.length > 0 ? 'Add Another Platform' : 'Choose a Platform to Connect'}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CONNECTABLE_PLATFORMS.filter(p => {
                // Hide platforms already connected — treat 'twitter' and 'x' as equivalent
                const normPid = p.id === 'twitter' ? 'x' : p.id;
                return !integrations.some(i => {
                  const prof = (i.profile || i.identifier || '').toLowerCase();
                  const normProf = prof === 'twitter' ? 'x' : prof;
                  return normProf === normPid || normProf.includes(normPid);
                });
              }).map(p => {
                const isConnecting = connecting === p.id;
                const isConnected = false; // already filtered out connected ones
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (!isSubscriptionActive) { onClose(); setTimeout(() => { onNeedsPricing ? onNeedsPricing() : onConnectPostiz(); }, 50); return; }
                      handleConnectPlatform(p.id);
                    }}
                    disabled={!!connecting}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border transition hover:brightness-110 disabled:opacity-40 relative"
                    style={{
                      borderColor: isConnecting ? `${p.color}60` : BORDER,
                      background: isConnecting ? p.bg : 'rgba(255,255,255,0.03)',
                    }}>

                    {isConnecting
                      ? <Loader className="w-6 h-6 animate-spin" style={{ color: p.color }} />
                      : <PlatformIcon id={p.id} size="md" />
                    }
                    <span className="text-[10px] font-bold text-center leading-tight"
                      style={{ color: isConnecting ? p.color : 'rgba(255,255,255,0.5)' }}>
                      {isConnecting ? 'Opening\u2026' : p.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {connecting && (
              <p className="text-[10px] text-white/30 text-center mt-2">Opening OAuth window\u2026 may take a moment</p>
            )}
          </div>

          {/* Manual refresh — shown after connecting so user can force a sync */}
          {integrations.length === 0 && !connecting && (
            <button
              onClick={() => onRefresh(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition hover:bg-white/8"
              style={{ color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Already connected? Tap to refresh
            </button>
          )}
          {integrations.length > 0 && (
            <button
              onClick={() => onRefresh(true)}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl text-xs font-semibold transition hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <RefreshCw className="w-3 h-3" /> Refresh accounts
            </button>
          )}


        </div>
      </div>
    </div>
  );
}

// ─── PostLogModal ─────────────────────────────────────────────────────────────

function PostLogModal({ open, onClose, userId, initialFilter = 'all', workspaceId }: {
  open: boolean; onClose: () => void; userId: string | null; initialFilter?: string; workspaceId?: string | null;
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
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/ayrshare-scheduled?userId=${encodeURIComponent(userId)}&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}${workspaceId ? `&workspaceId=${encodeURIComponent(workspaceId)}` : ''}`);
      const data = res.ok ? await res.json() : { posts: [] };
      const now = new Date();
      const list = Array.isArray(data?.posts) ? data.posts : [];
      setPosts(list.map((p: any) => {
        const scheduledAt = new Date(p.scheduledAt);
        return { id: p.id, content: p.content || '', platforms: Array.isArray(p.platforms) ? p.platforms : [], scheduledAt, status: resolveStatus(p.status || 'scheduled', scheduledAt) };
      }).sort((a: ScheduledPost, b: ScheduledPost) => b.scheduledAt.getTime() - a.scheduledAt.getTime()));
    } catch (e) {}
    finally { setLoading(false); }
  }, [userId, open, workspaceId]);

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

// ─── ThreadVideoPlayer ────────────────────────────────────────────────────────
const ThreadVideoPlayer = React.memo(function ThreadVideoPlayer({
  src, fileName, onRemove,
}: { src: string; fileName: string; onRemove: () => void }) {
  return (
    <div className="relative rounded-xl overflow-hidden mb-2" style={{ border: '1.5px solid ' + GOLD + '60' }}>
      <video src={src} controls className="w-full" style={{ background: '#000', display: 'block', maxHeight: '60vh' }} />
      <button onClick={onRemove}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/70 hover:bg-red-500/80 transition"
        style={{ color: 'white' }}>
        <X className="w-3 h-3" />
      </button>
      <div className="px-3 py-1.5 text-[10px] font-medium truncate" style={{ color: GOLD, background: GOLD + '10' }}>{fileName}</div>
    </div>
  );
});

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
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>('16/9');

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
  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration ?? 0);
    if (v.videoWidth && v.videoHeight) {
      setVideoAspectRatio(`${v.videoWidth}/${v.videoHeight}`);
    }
  };
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
      <div className="relative bg-black" style={{ aspectRatio: videoAspectRatio }}>
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
          <CheckCircle2 className="w-3 h-3" /> Uploaded, ready to post
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

// ─── SavedPostCard ─────────────────────────────────────────────────────────────

function SavedPostCard({
  post, textPostAccounts, isEditing, editText,
  onEditStart, onEditChange, onEditSave, onEditCancel, onDelete, workspaceId,
}: {
  post: { id: string; text: string; label: string; savedAt: Date };
  textPostAccounts: { integ: PostizIntegration; platform: PlatformId }[];
  isEditing: boolean;
  editText: string;
  workspaceId?: string | null;
  onEditStart: () => void;
  onEditChange: (v: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
}) {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [scheduleType, setScheduleType]         = useState<'now' | 'schedule'>('now');
  const [scheduleDateStr, setScheduleDate]       = useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [posting, setPosting]   = useState(false);
  const [postOk, setPostOk]     = useState(false);
  const [postErr, setPostErr]   = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelectedAccounts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const activeText = isEditing ? editText : post.text;

  const handlePost = async () => {
    if (!activeText.trim())          { setPostErr('Post is empty.'); return; }
    if (selectedAccounts.length === 0) { setPostErr('Select at least one account.'); return; }
    setPosting(true); setPostErr(null);
    try {
      const sd = scheduleType === 'schedule' ? new Date(scheduleDateStr).toISOString() : undefined;
      const platformIds = selectedAccounts.map(id => {
        const a = textPostAccounts.find(a => a.integ.id === id);
        return a?.integ.profile || a?.integ.id || a?.platform || '';
      }).filter(Boolean);
      await ayrsharePost({ platforms: platformIds, post: activeText, scheduleDate: sd, workspaceId: workspaceId ?? null });
      setPostOk(true);
      setSelectedAccounts([]);
      setTimeout(() => setPostOk(false), 3000);
    } catch (e: any) { setPostErr(e.message || 'Post failed'); }
    finally { setPosting(false); }
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: BORDER }}>
        <span className="text-xs font-bold" style={{ color: GOLD_L }}>🔖 {post.label}</span>
        <span className="text-[10px] text-white/25 ml-1">
          {post.savedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {isEditing ? (
            <>
              <button onClick={onEditSave}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition hover:bg-white/8"
                style={{ color: GOLD_L, border: `1px solid ${GOLD}40` }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={onEditCancel}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/8 transition text-white/30 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button onClick={onEditStart}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/8 transition"
              style={{ color: 'rgba(255,255,255,0.3)' }} title="Edit post">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onDelete}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/15 transition text-red-400/40 hover:text-red-400"
            title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Post body ── */}
      {isEditing ? (
        <textarea
          value={editText}
          onChange={e => onEditChange(e.target.value)}
          autoFocus rows={5}
          className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none resize-none"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        />
      ) : (
        <div className="px-4 py-3 text-sm text-white/75 leading-relaxed whitespace-pre-wrap"
          style={{ borderBottom: `1px solid ${BORDER}` }}>
          {post.text}
        </div>
      )}

      {/* ── Account selector ── */}
      <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
        <div className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Post to</div>
        {textPostAccounts.length === 0 ? (
          <p className="text-xs text-white/25">No X, LinkedIn, or Threads account connected.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {textPostAccounts.map(({ integ, platform }) => {
              const sel = selectedAccounts.includes(integ.id);
              const p   = PLATFORMS[platform];
              return (
                <button key={integ.id} onClick={() => toggle(integ.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border font-semibold transition"
                  style={{ borderColor: sel ? (p?.color || GOLD) : BORDER, background: sel ? (p?.bg || `${GOLD}15`) : 'transparent', color: sel ? (p?.color || GOLD) : 'rgba(255,255,255,0.4)' }}>
                  <PlatformIcon id={platform} size="sm" picture={integ.picture} />
                  <span className="text-xs truncate max-w-[80px]">{integ.name}</span>
                  {sel && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Schedule / post now toggle ── */}
      <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
        <div className="flex gap-2 mb-2">
          {(['now', 'schedule'] as const).map(t => (
            <button key={t} onClick={() => setScheduleType(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border transition"
              style={{ borderColor: scheduleType === t ? GOLD : BORDER, background: scheduleType === t ? `${GOLD}18` : 'transparent', color: scheduleType === t ? GOLD_L : 'rgba(255,255,255,0.35)' }}>
              {t === 'now' ? '⚡ Post Now' : '🗓 Schedule'}
            </button>
          ))}
        </div>
        {scheduleType === 'schedule' && (
          <input type="datetime-local" value={scheduleDateStr} onChange={e => setScheduleDate(e.target.value)}
            className="rounded-xl border bg-black/25 px-3 py-1.5 text-xs text-white outline-none"
            style={{ borderColor: BORDER, colorScheme: 'dark', width: 'fit-content' }} />
        )}
      </div>

      {/* ── Footer: error + post button ── */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex-1">
          {postErr && <p className="text-xs text-red-400">{postErr}</p>}
          {postOk  && <p className="text-xs text-green-400 font-bold">✓ {scheduleType === 'schedule' ? 'Scheduled!' : 'Posted!'}</p>}
          <span className="text-[10px] text-white/20">{activeText.length} chars</span>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button onClick={handlePost} disabled={posting || selectedAccounts.length === 0}
            className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl text-sm font-bold transition disabled:opacity-40 hover:brightness-110"
            style={{ background: postOk ? '#22c55e' : GOLD, color: '#000' }}>
            <span className="flex items-center gap-2">
              {posting ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Posting…</>
                : postOk ? <><CheckCircle2 className="w-3.5 h-3.5" /> Done!</>
                : <><Send className="w-3.5 h-3.5" /> {scheduleType === 'schedule' ? 'Schedule' : 'Post Now'}</>}
            </span>
            {posting && <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 500 }}>May take up to 5 minutes</span>}
          </button>
        </div>
      </div>

    </div>
  );
}

// ─── InlinePostComposer ────────────────────────────────────────────────────────
// Inline version of PostComposerModal (no modal wrapper)

function InlinePostComposer({
  integrations, userId, onSuccess, initialVideoUrl, initialMode, workspaceId,
}: {
  integrations: PostizIntegration[];
  userId: string | null;
  onSuccess?: () => void;
  initialVideoUrl?: string | null;
  initialMode?: 'media' | 'text' | 'saved';
  workspaceId?: string | null;
}) {
  type PostType = 'media' | 'text' | 'saved';
  type SavedPost = { id: string; text: string; label: string; savedAt: Date };
  const [postType, setPostType]         = useState<PostType>(initialMode || 'media');
  const [savedPosts, setSavedPosts]     = useState<SavedPost[]>(() => {
    try { return JSON.parse(localStorage.getItem('mm_saved_posts') || '[]').map((p: any) => ({ ...p, savedAt: new Date(p.savedAt) })); }
    catch { return []; }
  });
  const [savedEditId, setSavedEditId]   = useState<string | null>(null);
  const [savedEditText, setSavedEditText] = useState('');
  const persistSaved = (posts: SavedPost[]) => {
    setSavedPosts(posts);
    try { localStorage.setItem('mm_saved_posts', JSON.stringify(posts)); } catch {}
  };
  const savePost = (text: string, label: string) => {
    if (!text.trim()) return;
    const next = [{ id: Date.now().toString(), text: text.trim(), label, savedAt: new Date() }, ...savedPosts];
    persistSaved(next);
  };
  const deleteSavedPost = (id: string) => persistSaved(savedPosts.filter(p => p.id !== id));
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
  const [manualCaptions, setManualCaptions] = useState({});
  const [videoFile, setVideoFile]       = useState<File | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [videoUpload, setVideoUpload]   = useState<UploadState>({ status: 'idle' });

  // Pre-populate with AI-generated video URL if provided
  React.useEffect(() => {
    if (!initialVideoUrl) return;
    setPostType('media');
    setVideoUpload({ status: 'done', path: '', url: initialVideoUrl, fileName: 'ai-video.mp4', mime: 'video/mp4', size: 0 });
    // Also pre-fill AI caption mode pointed at the video URL
    setCaptionMode('from_description');
    setAiDescription('AI-generated video. Write captions describing this content.');
  }, [initialVideoUrl]);
  const [imageFiles, setImageFiles]     = useState<File[]>([]);
  const [imageUploads, setImageUploads] = useState<UploadState[]>([]);
  type PostFormat = 'standard' | 'carousel' | 'thread';
  const [postFormat, setPostFormat]     = useState<PostFormat>('standard');
  const [threadTweets, setThreadTweets] = useState<string[]>(['', '']);
  const [carouselCount, setCarouselCount] = useState<number>(3);
  const [threadTopic, setThreadTopic] = useState('');
  const [threadTopicError, setThreadTopicError] = useState(false);
  const [threadVideoMode, setThreadVideoMode] = useState(false);
  const [threadVideoFile, setThreadVideoFile] = useState<File|null>(null);
  const [threadVideoUrl, setThreadVideoUrl] = useState<string>('');
  const [threadVideoTranscript, setThreadVideoTranscript] = useState('');
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
  const [usageData, setUsageData]       = useState<{ used: number; limit: number; postsUsed: number; postsLimit: number; plan: string } | null>(null);

  React.useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/check-usage`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (res.ok) {
          const d = await res.json();
          setUsageData({
            used: d.usage?.ai_analyses_used ?? 0,
            limit: d.limits?.ai_captions_per_month ?? d.limits?.ai_analyses_per_month ?? 0,
            postsUsed: d.usage?.posts_scheduled ?? 0,
            postsLimit: d.limits?.posts_per_month ?? 0,
            plan: d.plan ?? 'free',
          });
        }
      } catch (e) { /* silent */ }
    })();
  }, [userId, workspaceId]);

  const [textTab, setTextTab]           = useState<'twitter' | 'linkedin'>('twitter');
  const [xText, setXText]               = useState('');
  const [linkedinText, setLinkedinText] = useState('');
  const [showTextAi, setShowTextAi]     = useState(false);
  const [textAiMode, setTextAiMode]     = useState<'from_video' | 'from_description'>('from_description');
  const [textAiDesc, setTextAiDesc]     = useState('');
  const [textAiTone, setTextAiTone]     = useState('');
  const [textAiVideo, setTextAiVideo]   = useState<File | null>(null);
  const [textAiVideoObjectUrl, setTextAiVideoObjectUrl] = useState<string | null>(null);
  const [textAiLoading, setTextAiLoading] = useState(false);
  const [textAiError, setTextAiError]   = useState<string | null>(null);
  const [textAiPosts, setTextAiPosts]   = useState<{ twitter: string[]; linkedin: string[] } | null>(null);
  const [textAiSelected, setTextAiSelected] = useState<{ twitter: number | null; linkedin: number | null }>({ twitter: null, linkedin: null });


  // Multi-select for text post accounts
  const [selectedTextAccounts, setSelectedTextAccounts] = useState<string[]>([]);
  const toggleTextAccount = (id: string) => setSelectedTextAccounts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // AI edit state
  const [aiEditText, setAiEditText] = useState('');
  const [editingIdx, setEditingIdx] = useState<{ tab: 'twitter' | 'linkedin'; idx: number } | null>(null);

  const textPostAccounts = integrations
    .filter(i => ['x','twitter','linkedin','threads'].includes((i.profile||i.identifier||'').toLowerCase()))
    .map(i => {
      const prof = (i.profile||i.identifier||'').toLowerCase();
      const platform: PlatformId = prof.startsWith('linkedin') ? 'linkedin' : prof.startsWith('threads') ? 'threads' : 'x';
      return { integ: i, platform };
    });

  const getSelectedPlatforms = () =>
    selectedIntegrations.map(id => { const i = integrations.find(x => x.id === id); return i?.profile || i?.id || ''; }).filter(Boolean) as string[];
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
        const { data: { session: txSession } } = await supabase.auth.getSession();
        sourceText = await transcribeVideo(videoFile, txSession?.access_token ?? '');
        setTranscript(sourceText);
      } else {
        if (!aiDescription.trim()) throw new Error('Enter a description of your video');
        sourceText = aiDescription;
      }
      const mode = captionMode === 'from_video' ? 'captions_from_video' : 'captions_from_description';
      const { data: { session: capSession } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-captions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${capSession?.access_token ?? ''}` },
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
        const { data: { session: txSession2 } } = await supabase.auth.getSession();
        source = await transcribeVideo(textAiVideo, txSession2?.access_token ?? '');
      } else {
        if (!textAiDesc.trim()) throw new Error('Enter a description');
        source = textAiDesc;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-captions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ mode: 'repurpose_posts', transcript: textAiMode === 'from_video' ? source : undefined, description: textAiMode !== 'from_video' ? source : undefined, tone: textAiTone }),
      });
      const data = await res.json();
      if (data.error === 'upgrade_required') {
        setTextAiError('upgrade_required');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Generation failed');
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
    if (captionType === 'manual' && !content.trim() && Object.values(manualCaptions).every(v => !v.trim())) { setSubmitError('Write a caption first.'); return; }
    if (captionType === 'ai' && !generatedCaptions)  { setSubmitError('Generate AI captions first.'); return; }
    if (isYouTubeSelected && !youTubeTitle.trim() && captionType === 'manual') {
      setSubmitError('YouTube requires a video title. Fill in the Title field above.');
      return;
    }
    if (videoUpload.status === 'uploading' || imageUploads.some(u => u.status === 'uploading')) {
      setSubmitError('Wait for media to finish uploading.'); return;
    }
    const selectedPlatformIds = selectedIntegrations
      .map(id => { const i = integrations.find(x => x.id === id); return i?.profile || i?.id || ''; })
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
    // Thread format validation
    if (postFormat === 'thread') {
      const validTweets = threadTweets.filter(t => t.trim());
      if (validTweets.length < 2) { setSubmitError('Add at least 2 tweets to create a thread.'); return; }
      if (validTweets.some(t => t.length > 280)) { setSubmitError('One or more tweets exceed 280 characters.'); return; }
    }

    setSubmitting(true); setSubmitError(null);
    try {
      const mediaUrls: string[] = [];
      imageUploads.forEach(u => { if (u.status === 'done' && (u as any).url) mediaUrls.push((u as any).url); });
      if (videoUpload.status === 'done' && (videoUpload as any).url) mediaUrls.push((videoUpload as any).url);
      const sd = scheduleType === 'schedule' ? new Date(scheduleDateStr).toISOString() : undefined;

      // Handle thread format — post as thread to all selected platforms
      if (postFormat === 'thread') {
        const validTweets = threadTweets.filter(t => t.trim());
        const platformIds = selectedIntegrations.map(id => { const i = integrations.find(x => x.id === id); return i?.profile || i?.id || ''; }).filter(Boolean);
        await ayrsharePost({ platforms: platformIds, post: validTweets[0], thread: validTweets.slice(1), mediaUrls, scheduleDate: sd, workspaceId: workspaceId ?? null });
      } else if (captionType === 'manual') {
        if (selectedIntegrations.length === 1) {
          const platforms = selectedIntegrations.map(id => { const i = integrations.find(x => x.id === id); return i?.profile || i?.id || ''; }).filter(Boolean);
          const isYT = platforms.includes('youtube');
          const cap = manualCaptions[platforms[0]] || content;
          const isCarousel = postFormat === 'carousel' && mediaUrls.length > 1;
          await ayrsharePost({ platforms, post: cap, mediaUrls, scheduleDate: sd, workspaceId: workspaceId ?? null, ...(isYT ? { youTubeTitle: youTubeTitle || cap.slice(0, 100), youTubeShorts: true } : {}), ...(isCarousel ? { carousel: true } : {}) });
        } else {
          const postPromises = selectedIntegrations.map(async (integId) => {
            const integ = integrations.find(i => i.id === integId);
            if (!integ) return;
            const platformId = integ.profile || integ.id || '';
            const cap = manualCaptions[platformId] || content || '';
            if (!cap) return;
            const isYT = platformId === 'youtube';
            await ayrsharePost({ platforms: [platformId], post: cap, mediaUrls, scheduleDate: sd, workspaceId: workspaceId ?? null, ...(isYT ? { youTubeTitle: youTubeTitle || cap.slice(0, 100), youTubeShorts: true } : {}) });
          });
          await Promise.all(postPromises);
        }
      } else {
        const postPromises = selectedIntegrations.map(async (integId) => {
          const integ = integrations.find(i => i.id === integId);
          if (!integ) return;
          const platformId = integ.profile || integ.id || '';
          const caption = generatedCaptions![platformId]
            ?? generatedCaptions![platformId.toLowerCase()]
            ?? Object.values(generatedCaptions!)[0]
            ?? '';
          if (!caption) return;
          const isYT = platformId === 'youtube';
          await ayrsharePost({
            platforms: [platformId], post: caption, mediaUrls, scheduleDate: sd, workspaceId: workspaceId ?? null,
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
        setGeneratedCaptions(null); setManualCaptions({}); setSelectedIntegrations([]);
        setPostFormat('standard'); setThreadTweets(['', '']); setCarouselCount(3); setThreadTopic('');
        onSuccess?.();
      }, 1600);
    } catch (e: any) { setSubmitError(e.message || 'Failed to post'); }
    finally { setSubmitting(false); }
  };

  const handleTextSubmit = async () => {
    if (postFormat === 'thread') {
      const validTweets = threadTweets.filter(t => t.trim());
      if (validTweets.length < 2) { setSubmitError('Add at least 2 posts to create a thread.'); return; }
      if (validTweets.some(t => t.length > 280)) { setSubmitError('One or more posts exceed 280 characters.'); return; }
    } else {
      const text = editingIdx ? aiEditText : xText;
      if (!text.trim()) { setSubmitError('Write something first.'); return; }
    }
    if (selectedTextAccounts.length === 0) { setSubmitError('Select at least one account to post to.'); return; }
    setSubmitting(true); setSubmitError(null);
    try {
      const sd = scheduleType === 'schedule' ? new Date(scheduleDateStr).toISOString() : undefined;
      const platformIds = selectedTextAccounts.map(id => {
        const acct = textPostAccounts.find(a => a.integ.id === id);
        return acct?.integ.profile || acct?.integ.id || acct?.platform || '';
      }).filter(Boolean);
      if (postFormat === 'thread') {
        const validTweets = threadTweets.filter(t => t.trim());
        await ayrsharePost({ platforms: platformIds, post: validTweets[0], thread: validTweets.slice(1), scheduleDate: sd, workspaceId: workspaceId ?? null });
      } else {
      const text = editingIdx ? aiEditText : xText;
      await ayrsharePost({ platforms: platformIds, post: text, scheduleDate: sd, workspaceId: workspaceId ?? null });
      }
      setSubmitOk(true);
      setXText(''); setLinkedinText('');
      setAiEditText(''); setEditingIdx(null); setSelectedTextAccounts([]);
      setPostFormat('standard'); setThreadTweets(['', '']);
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
          className="rounded-xl border bg-black/25 px-3 py-2 text-sm text-white outline-none"
          style={{ borderColor: BORDER, colorScheme: 'dark', width: 'fit-content' }} />
      )}
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Post type toggle */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl" style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${BORDER}` }}>
        {([
          ['media', '📎', 'Media Post',  'Video & images'],
          ['text',  '✍️', 'Text Post',   'X, LinkedIn & more'],
          ['saved', '🔖', 'Saved',       `${savedPosts.length} post${savedPosts.length !== 1 ? 's' : ''}`],
        ] as const).map(([type, emoji, label, sub]) => (
          <button key={type} onClick={() => { setPostType(type); setSubmitOk(false); setSubmitError(null); }}
            className="flex flex-col items-start px-3 py-3 rounded-xl transition"
            style={{ background: postType === type ? `${GOLD}18` : 'transparent', border: `1px solid ${postType === type ? GOLD : 'transparent'}` }}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm">{emoji}</span>
              <span className="text-xs font-bold" style={{ color: postType === type ? GOLD_L : 'rgba(255,255,255,0.5)' }}>{label}</span>
            </div>
            <span className="text-[10px] pl-5" style={{ color: postType === type ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)' }}>{sub}</span>
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
                      <PlatformIcon id={int.profile || int.identifier} size="sm" picture={int.picture} />
                      <span className="max-w-[90px] truncate text-xs">{int.name}</span>
                      {selected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Format toggle — Carousel or Standard */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-white/25 uppercase tracking-wider">Format</span>
            <button onClick={() => { setPostFormat('standard'); setImageFiles([]); setImageUploads([]); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border transition"
              style={{ borderColor: postFormat === 'standard' ? GOLD : BORDER, background: postFormat === 'standard' ? `${GOLD}18` : 'transparent', color: postFormat === 'standard' ? GOLD_L : 'rgba(255,255,255,0.4)' }}>
              Standard
            </button>
            {(() => {
              const selP = selectedIntegrations.map(id => { const i = integrations.find(x => x.id === id); return (i?.profile || i?.id || '').toLowerCase(); });
              const allSupportCarousel = selP.length > 0 && selP.every(p => ['instagram','facebook','linkedin','threads'].includes(p));
              // Auto-revert to standard if non-carousel platform selected
              if (postFormat === 'carousel' && !allSupportCarousel && selP.length > 0) {
                setTimeout(() => setPostFormat('standard'), 0);
              }
              if (!allSupportCarousel) return null;
              return (
                <button onClick={() => { setPostFormat('carousel'); setVideoFile(null); setVideoObjectUrl(null); setVideoUpload({ status: 'idle' }); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border transition"
                  style={{ borderColor: postFormat === 'carousel' ? '#38bdf8' : BORDER, background: postFormat === 'carousel' ? 'rgba(56,189,248,0.15)' : 'transparent', color: postFormat === 'carousel' ? '#7dd3fc' : 'rgba(255,255,255,0.4)' }}>
                  🖼 Carousel
                </button>
              );
            })()}
          </div>

          {/* Carousel image count selector */}
          {postFormat === 'carousel' && (
            <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: BORDER, background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Carousel Images</span>
                <span className="text-[10px] text-white/25">{imageFiles.filter(Boolean).length} of {carouselCount} added</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: carouselCount }).map((_, i) => {
                  const file = imageFiles[i];
                  const uploadState = imageUploads[i] ?? { status: 'idle' };
                  if (file) {
                    return (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border shrink-0" style={{ borderColor: BORDER }}>
                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`Slide ${i+1}`} />
                        <div className="absolute top-0 left-0 w-4 h-4 flex items-center justify-center rounded-br text-[8px] font-black" style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.7)' }}>{i+1}</div>
                        {uploadState.status === 'uploading' && <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}><Loader className="w-3 h-3 animate-spin text-white" /></div>}
                        {uploadState.status === 'done' && <div className="absolute bottom-0 right-0 w-4 h-4 flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.8)' }}><CheckCircle2 className="w-2.5 h-2.5 text-white" /></div>}
                        <button onClick={() => { setImageFiles(prev => { const n = [...prev]; n.splice(i, 1); return n; }); setImageUploads(prev => { const n = [...prev]; n.splice(i, 1); return n; }); setCarouselCount(prev => Math.max(2, prev - 1)); }}
                          className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center rounded-bl" style={{ background: 'rgba(239,68,68,0.8)' }}>
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      </div>
                    );
                  }
                  return (
                    <label key={i} className="cursor-pointer w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 shrink-0 hover:border-white/30 transition"
                      style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                      <span className="text-[9px] text-white/30 font-bold">Image {i+1}</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const newFiles = [...imageFiles];
                          const newUploads = [...imageUploads];
                          newFiles[i] = f;
                          newUploads[i] = { status: 'idle' };
                          setImageFiles(newFiles);
                          setImageUploads(newUploads);
                          uploadFileForPost(f, 'image', s => setImageUploads(prev => { const n = [...prev]; n[i] = s; return n; }));
                        }} />
                    </label>
                  );
                })}
                {carouselCount < 10 && (
                  <button onClick={() => setCarouselCount(prev => Math.min(10, prev + 1))}
                    className="w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 shrink-0 hover:border-white/30 transition"
                    style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Plus className="w-4 h-4 text-white/25" />
                    <span className="text-[9px] text-white/20">Add</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-white/20">Instagram, Facebook, LinkedIn & Threads</p>
            </div>
          )}

          {/* Standard media upload */}
          {postFormat === 'standard' && (
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
          )}

          {postFormat === 'standard' && (imageFiles.length > 0 || videoFile) && (
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
              {selectedIntegrations.length === 0 ? (
                <div className="rounded-xl border px-4 py-6 text-center text-sm text-white/30" style={{ borderColor: BORDER }}>Select channels above to write captions</div>
              ) : selectedIntegrations.length === 1 ? (() => {
                const _mi = integrations.find(x => x.id === selectedIntegrations[0]);
                const _mpid = _mi?.profile || _mi?.id || selectedIntegrations[0];
                const _mval = manualCaptions[_mpid] || content;
                return (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                    <textarea value={_mval} onChange={e => { setManualCaptions(prev => ({ ...prev, [_mpid]: e.target.value })); setContent(e.target.value); }}
                      placeholder={isYouTubeSelected ? 'Write your YouTube description here…' : 'Write your caption here…'} rows={5}
                      className="w-full bg-transparent px-4 pt-4 pb-2 text-sm text-white placeholder-white/20 outline-none resize-none" />
                    <div className="flex items-center justify-end px-4 py-2 border-t" style={{ borderColor: BORDER }}>
                      <span className="text-xs" style={{ color: _mval.length > 280 ? '#f87171' : 'rgba(255,255,255,0.2)' }}>{_mval.length} chars</span>
                    </div>
                  </div>
                );
              })() : (
                <div className="space-y-3">
                  {selectedIntegrations.map(integId => {
                    const _mi = integrations.find(x => x.id === integId);
                    if (!_mi) return null;
                    const _mpid = _mi.profile || _mi.id || '';
                    const _mlogos = { instagram: '📷', facebook: '👥', x: 'X', twitter: 'X', tiktok: '🎵', youtube: '▶️', linkedin: '💼', pinterest: '📌', threads: '🧵', snapchat: '👻' };
                    const _mlimits = { twitter: 280, x: 280, instagram: 2200, facebook: 63206, tiktok: 2200, linkedin: 3000, youtube: 5000, threads: 500 };
                    const _mlimit = _mlimits[_mpid] || 2200;
                    const _mval = manualCaptions[_mpid] || '';
                    const _mlabel = _mpid === 'x' ? 'X (Twitter)' : _mpid.charAt(0).toUpperCase() + _mpid.slice(1);
                    return (
                      <div key={integId} className="rounded-xl border overflow-hidden" style={{ borderColor: _mval.length > _mlimit ? '#f87171' : BORDER }}>
                        <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: BORDER, background: 'rgba(255,255,255,0.02)' }}>
                          <span className="text-sm">{_mlogos[_mpid] || '📱'}</span>
                          <span className="text-xs font-bold text-white/50">{_mlabel}</span>
                          <span className="ml-auto text-xs" style={{ color: _mval.length > _mlimit ? '#f87171' : 'rgba(255,255,255,0.2)' }}>{_mval.length}/{_mlimit}</span>
                        </div>
                        <textarea value={_mval} onChange={e => setManualCaptions(prev => ({ ...prev, [_mpid]: e.target.value }))}
                          placeholder={'Write your ' + _mlabel + ' caption here…'} rows={4}
                          className="w-full bg-transparent px-4 pt-3 pb-2 text-sm text-white placeholder-white/20 outline-none resize-none" />
                      </div>
                    );
                  })}
                </div>
              )}
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
                  {([['from_video', '🎙 Analyze Video'], ['from_description', '📝 From Description']] as const).map(([m, label]) => (
                    <button key={m} onClick={() => setCaptionMode(m)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition"
                      style={{ borderColor: captionMode === m ? GOLD : BORDER, background: captionMode === m ? `${GOLD}12` : 'transparent', color: captionMode === m ? GOLD_L : 'rgba(255,255,255,0.3)' }}>
                      {label}
                    </button>
                  ))}
                </div>
                {captionMode === 'from_video' && !videoFile && <div className="text-xs text-amber-400/70 px-1">⚠️ Upload a talking video above. AI will analyze the spoken content to write captions.</div>}
                {captionMode === 'from_video' && videoFile && videoUpload.status === 'uploading' && <div className="text-xs px-1" style={{ color: GOLD }}>⏳ Uploading ({(videoUpload as any).progress ?? 0}%)…</div>}
                {captionMode === 'from_video' && videoFile && videoUpload.status === 'done' && <div className="text-xs text-green-400/80 px-1">✓ Video ready. Click Generate below</div>}
                {captionMode === 'from_description' && (
                  <textarea value={aiDescription} onChange={e => setAiDescription(e.target.value)}
                    placeholder="Describe your video or content. Topic, key points, your offer…" rows={3}
                    className="w-full rounded-lg border bg-black/30 px-3 py-2.5 text-xs text-white placeholder-white/25 outline-none resize-none" style={{ borderColor: BORDER }} />
                )}
                <input value={aiTone} onChange={e => setAiTone(e.target.value)}
                  placeholder="Tone (optional): casual, alex hormozi, luxury, funny…"
                  className="w-full rounded-lg border bg-black/30 px-3 py-2 text-xs text-white placeholder-white/25 outline-none" style={{ borderColor: BORDER }} />
                {selectedIntegrations.length === 0 && <div className="text-xs text-amber-400/70 px-1">⚠️ Select at least one channel above to generate captions for those platforms</div>}
                {usageData && usageData.plan !== 'free' && usageData.limit !== -1 && (
                  <div className="flex items-center gap-2 px-1">
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (usageData.used / usageData.limit) * 100)}%`, background: usageData.used >= usageData.limit ? '#ef4444' : usageData.used / usageData.limit > 0.8 ? '#f59e0b' : GOLD }} />
                    </div>
                    <span style={{ fontSize: 10, color: usageData.used >= usageData.limit ? '#ef4444' : 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                      {usageData.used}/{usageData.limit} captions
                    </span>
                  </div>
                )}
                <button onClick={handleAiGenerate} disabled={aiLoading || selectedIntegrations.length === 0}
                  className="w-full flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 transition hover:brightness-110"
                  style={{ background: GOLD, color: '#000' }}>
                  <span className="flex items-center gap-2">
                    {aiLoading ? <><Loader className="w-3.5 h-3.5 animate-spin" /> {captionMode === 'from_video' ? 'Analyzing & Writing…' : 'Writing…'}</> : <><Sparkles className="w-3.5 h-3.5" /> Generate Captions for {selectedIntegrations.length || 'Selected'} Platform{selectedIntegrations.length !== 1 ? 's' : ''}</>}
                  </span>
                  {aiLoading && <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 500 }}>May take up to 5 minutes</span>}
                </button>
                {aiError && <div className="text-xs text-red-300 px-1">{aiError}</div>}
              </div>

              {generatedCaptions && Object.keys(generatedCaptions).length > 0 && (
                <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: BORDER }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Captions generated. Edit if needed, then post</span>
                  </div>
                  {isYouTubeSelected && (
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${PLATFORMS.youtube.color}30` }}>
                      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: `${PLATFORMS.youtube.color}20`, background: PLATFORMS.youtube.bg }}>
                        <PlatformIcon id="youtube" size="sm" />
                        <span className="text-xs font-bold" style={{ color: PLATFORMS.youtube.color }}>YouTube, Title</span>
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
                    const label = platform === 'youtube' ? 'YouTube Description' : (p?.label || integ?.name || platform);
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
                      <PlatformIcon id={platform} size="sm" picture={integ.picture} />
                      <span className="max-w-[90px] truncate text-xs">{integ.name}</span>
                      {selected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Step 2: Write manually OR use AI ── */}

          {/* Thread format toggle for text posts */}
          {(() => {
            const selPlatforms = selectedTextAccounts.map(id => { const a = textPostAccounts.find(x => x.integ.id === id); return (a?.integ.profile || a?.integ.id || '').toLowerCase(); });
            const hasThread = selPlatforms.some(p => ['twitter','x','threads','linkedin','bluesky'].includes(p));
            if (!hasThread || selectedTextAccounts.length === 0) return null;
            return (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white/25 uppercase tracking-wider">Format</span>
                <button onClick={() => setPostFormat('standard')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border transition"
                  style={{ borderColor: postFormat === 'standard' ? GOLD : BORDER, background: postFormat === 'standard' ? `${GOLD}18` : 'transparent', color: postFormat === 'standard' ? GOLD_L : 'rgba(255,255,255,0.4)' }}>
                  Standard
                </button>
                <button onClick={() => setPostFormat('thread')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border transition"
                  style={{ borderColor: postFormat === 'thread' ? '#a78bfa' : BORDER, background: postFormat === 'thread' ? 'rgba(167,139,250,0.15)' : 'transparent', color: postFormat === 'thread' ? '#c4b5fd' : 'rgba(255,255,255,0.4)' }}>
                  🧵 Thread
                </button>
              </div>
            );
          })()}

          {/* Thread composer for text posts */}
          {postFormat === 'thread' && (
            <div className="space-y-3 rounded-2xl border p-4" style={{ borderColor: BORDER, background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/40 uppercase tracking-wider">🧵 Thread</span>
                <div className="flex items-center gap-2">
                  <button onClick={async () => {
                    const desc = threadTopic.trim();
                    if (threadVideoMode && !threadVideoFile) return;
                    if (!threadVideoMode && !desc) { setThreadTopicError(true); return; }
                    setTextAiLoading(true); setTextAiError(null);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-captions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
                        body: JSON.stringify({ mode: 'thread_posts', description: threadVideoMode ? (threadVideoTranscript || desc || 'Generate a viral thread') : desc, tone: textAiTone, video_repurpose: threadVideoMode }),
                      });
                      const data = await res.json();
                      if (data.error === 'upgrade_required') { setTextAiError('upgrade_required'); return; }
                      if (!res.ok) throw new Error(data.error || 'Generation failed');
                      if (data.thread && Array.isArray(data.thread)) setThreadTweets(data.thread);
                    } catch (e: any) { setTextAiError(e.message || 'Failed'); }
                    finally { setTextAiLoading(false); }
                  }}
                  disabled={textAiLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition disabled:opacity-40"
                  style={{ background: GOLD + '33', border: '1.5px solid ' + GOLD, color: GOLD }}>
                    {textAiLoading ? <><Loader className="w-3 h-3 animate-spin" /> Generating…</> : <><Sparkles className="w-3 h-3" /> AI Thread</>}
                  </button>
                  <button onClick={() => setThreadTweets(prev => [...prev, ''])}
                    disabled={threadTweets.length >= 10}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition disabled:opacity-40 hover:bg-white/8"
                    style={{ border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.4)' }}>
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => { setThreadVideoMode(v => !v); setThreadTopicError(false); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: threadVideoMode ? GOLD + '22' : 'transparent', border: '1px solid ' + (threadVideoMode ? GOLD : GOLD + '40'), color: threadVideoMode ? GOLD : GOLD + '99' }}
                >
                  <Video className="w-3 h-3" /> Repurpose Video
                </button>
                {threadVideoMode && !threadVideoFile && <span className="text-xs" style={{ color: GOLD + 'aa' }}>Upload a video to repurpose</span>}
                {threadVideoMode && threadVideoFile && <span className="text-xs" style={{ color: GOLD }}>&#10003; {threadVideoFile.name}</span>}
              </div>
              {threadVideoMode && (
                <>
                  {/* Video upload dropzone */}
                  {!threadVideoFile ? (
                    <label className="flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-all py-4 mb-2"
                      style={{ borderColor: GOLD + '40', background: 'transparent' }}>
                      <input type="file" accept="video/*,audio/*" className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (threadVideoUrl) URL.revokeObjectURL(threadVideoUrl);
                          setThreadVideoFile(file);
                          setThreadVideoUrl(URL.createObjectURL(file));
                          setThreadVideoTranscript('Video: ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + 'MB). Repurpose the key insights, story and talking points from this video into a viral thread.');
                        }} />
                      <div className="flex flex-col items-center gap-1">
                        <Video className="w-5 h-5" style={{ color: GOLD + '80' }} />
                        <span className="text-xs" style={{ color: GOLD + '99' }}>Click to upload video or audio</span>
                        <span className="text-[10px]" style={{ color: GOLD + '55' }}>MP4, MOV, MP3, M4A supported</span>
                      </div>
                    </label>
                  ) : (
                    <ThreadVideoPlayer
                      src={threadVideoUrl}
                      fileName={threadVideoFile.name}
                      onRemove={() => { if (threadVideoUrl) URL.revokeObjectURL(threadVideoUrl); setThreadVideoFile(null); setThreadVideoUrl(''); setThreadVideoTranscript(''); }}
                    />
                  )}
                  {/* Optional context input always shown in video mode */}
                  <input value={threadTopic} onChange={e => { setThreadTopic(e.target.value); setThreadTopicError(false); }}
                    placeholder="Optional: describe what the video is about..."
                    className="w-full rounded-lg border bg-black/30 px-3 py-2 text-xs text-white placeholder-white/20 outline-none mb-2"
                    style={{ borderColor: BORDER }} />
                </>
              )}
              {!threadVideoMode && (
                <input value={threadTopic} onChange={e => { setThreadTopic(e.target.value); setThreadTopicError(false); }}
                  placeholder="Thread topic or idea..."
                  className="w-full rounded-lg border bg-black/30 px-3 py-2 text-xs text-white placeholder-white/20 outline-none"
                  style={{ borderColor: threadTopicError ? '#ef4444' : BORDER }}
                />
              )}
              {threadTopicError && <p className="text-xs mt-1 text-red-400">Please enter a topic or enable Repurpose Video mode</p>}
              {textAiError && textAiError !== 'upgrade_required' && <p className="text-xs text-red-300">{textAiError}</p>}
              {threadTweets.map((tweet, i) => (
                <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: tweet.length > 280 ? '#f87171' : BORDER }}>
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                    <span className="text-[10px] font-bold text-white/30">#{i + 1}</span>
                    <span className="ml-auto text-[10px]" style={{ color: tweet.length > 280 ? '#f87171' : 'rgba(255,255,255,0.2)' }}>{tweet.length}/280</span>
                    {threadTweets.length > 2 && (
                      <button onClick={() => setThreadTweets(prev => prev.filter((_, xi) => xi !== i))}
                        className="w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 transition">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <textarea value={tweet}
                    onChange={e => setThreadTweets(prev => prev.map((x, xi) => xi === i ? e.target.value : x))}
                    placeholder={i === 0 ? 'Start your thread here…' : `Post ${i + 1}…`}
                    rows={3}
                    className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-white/20 outline-none resize-none" />
                </div>
              ))}
            </div>
          )}

          {/* Manual compose — always visible unless AI panel is open */}
          {!showTextAi && postFormat !== 'thread' && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
              <textarea
                value={xText}
                onChange={e => setXText(e.target.value)}
                placeholder="Write your post here. It will be sent to all selected accounts above."
                rows={6}
                className="w-full bg-transparent px-4 pt-4 pb-3 text-sm text-white placeholder-white/20 outline-none resize-none"
              />
              <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: BORDER }}>
                <span className="text-xs text-white/20">{xText.length} chars</span>
                <div className="flex items-center gap-2">
                  {xText.length > 280 && <span className="text-xs text-amber-400/80 font-bold">⚠ Over X's 280 char limit</span>}
                  <button onClick={() => { savePost(xText, 'Manual'); setXText(''); }}
                    disabled={!xText.trim()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition disabled:opacity-30 hover:bg-white/8"
                    style={{ color: GOLD_L, border: `1px solid ${GOLD}30` }}>
                    🔖 Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Generate section — hidden in carousel mode */}
          {postFormat !== 'carousel' && postFormat !== 'thread' && <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${GOLD}30`, background: `${GOLD}05` }}>
            <button onClick={() => { setShowTextAi(v => !v); }} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/4 transition">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>
                  {showTextAi ? 'Write Manually Instead' : 'AI Generate Posts'}
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
                  {([['from_video', '🎙 Analyze Video'], ['from_description', '📝 From Description']] as const).map(([m, label]) => (
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
                      <input type="file" accept="video/*" className="hidden" onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          if (textAiVideoObjectUrl) URL.revokeObjectURL(textAiVideoObjectUrl);
                          const url = URL.createObjectURL(f);
                          setTextAiVideo(f);
                          setTextAiVideoObjectUrl(url);
                        }
                      }} />
                    </label>
                  ) : (
                    <VideoPreviewCard
                      file={textAiVideo}
                      objectUrl={textAiVideoObjectUrl!}
                      uploadState={{ status: 'idle' }}
                      onRemove={() => {
                        if (textAiVideoObjectUrl) URL.revokeObjectURL(textAiVideoObjectUrl);
                        setTextAiVideo(null);
                        setTextAiVideoObjectUrl(null);
                      }}
                    />
                  )
                )}
                {textAiMode === 'from_description' && (
                  <textarea value={textAiDesc} onChange={e => setTextAiDesc(e.target.value)}
                    placeholder="Describe what you want to post about. Topic, key points, your offer…" rows={3}
                    className="w-full rounded-lg border bg-black/30 px-3 py-2.5 text-xs text-white placeholder-white/25 outline-none resize-none" style={{ borderColor: BORDER }} />
                )}
                <input value={textAiTone} onChange={e => setTextAiTone(e.target.value)}
                  placeholder="Tone (optional): casual, alex hormozi, luxury, professional…"
                  className="w-full rounded-lg border bg-black/30 px-3 py-2 text-xs text-white placeholder-white/25 outline-none" style={{ borderColor: BORDER }} />
                {textAiError && textAiError === 'upgrade_required' ? (
                  <div className="rounded-xl p-4 text-center space-y-2" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: GOLD_L }}>Creator & Agency Feature</div>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>The Content Repurposing Engine is available on Creator and Agency plans.</p>
                    <button onClick={() => onUpgrade?.()} className="px-4 py-2 rounded-lg text-xs font-bold transition hover:brightness-110" style={{ background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000' }}>Upgrade to Unlock</button>
                  </div>
                ) : textAiError ? (
                  <div className="text-xs text-red-300 px-1">{textAiError}</div>
                ) : null}
                <button onClick={handleTextAiGenerate} disabled={textAiLoading}
                  className="w-full flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 transition hover:brightness-110"
                  style={{ background: GOLD, color: '#000' }}>
                  <span className="flex items-center gap-2">
                    {textAiLoading
                      ? <><Loader className="w-3.5 h-3.5 animate-spin" />{textAiMode === 'from_video' ? 'Analyzing…' : 'Generating…'}</>
                      : <><Sparkles className="w-3.5 h-3.5" /> Generate 10 Posts Each</>}
                  </span>
                  {textAiLoading && <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 500 }}>May take up to 5 minutes</span>}
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
                                <span className="text-[10px] font-bold" style={{ color: GOLD }}>✓ Selected</span>
                              )}
                              {isEditing && (
                                <span className="text-[10px] font-bold text-amber-400/70">editing…</span>
                              )}
                              <button
                                onClick={e => { e.stopPropagation(); savePost(liveText, textTab === 'twitter' ? 'X Post' : 'LinkedIn Post'); }}
                                className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition hover:bg-white/8"
                                style={{ color: GOLD_L, border: `1px solid ${GOLD}25` }}
                                title="Save for later">
                                🔖 Save
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>}

          {scheduleSectionJsx}
        </>
      )}

      {postType === 'saved' && (
        <>
          {savedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <span className="text-4xl">🔖</span>
              <div className="text-sm font-bold text-white/30">No saved posts yet</div>
              <div className="text-xs text-white/20">Save any manual or AI-generated post using the 🔖 Save button</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-xs font-bold text-white/30 uppercase tracking-wider">
                {savedPosts.length} Saved Post{savedPosts.length !== 1 ? 's' : ''}
              </div>

              {savedPosts.map(p => (
                <SavedPostCard
                  key={p.id}
                  post={p}
                  textPostAccounts={textPostAccounts}
                  workspaceId={workspaceId}
                  isEditing={savedEditId === p.id}
                  editText={savedEditText}
                  onEditStart={() => { setSavedEditId(p.id); setSavedEditText(p.text); }}
                  onEditChange={setSavedEditText}
                  onEditSave={() => {
                    persistSaved(savedPosts.map(x => x.id === p.id ? { ...x, text: savedEditText } : x));
                    setSavedEditId(null);
                  }}
                  onEditCancel={() => setSavedEditId(null)}
                  onDelete={() => deleteSavedPost(p.id)}
                />
              ))}
            </div>
          )}
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
        className="w-full flex flex-col items-center justify-center gap-0.5 px-5 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
        style={{ background: submitOk ? '#22c55e' : GOLD, color: '#000' }}>
        <span className="flex items-center gap-2">
          {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Posting…</>
            : submitOk ? <><CheckCircle2 className="w-4 h-4" /> {scheduleType === 'schedule' ? 'Scheduled!' : 'Posted!'}</>
            : postType === 'media'
              ? <><Send className="w-4 h-4" /> {scheduleType === 'schedule' ? 'Schedule Post' : 'Post Now'}</>
              : <><Send className="w-4 h-4" /> {scheduleType === 'schedule' ? `Schedule to ${selectedTextAccounts.length || 0} Account${selectedTextAccounts.length !== 1 ? 's' : ''}` : `Post to ${selectedTextAccounts.length || 0} Account${selectedTextAccounts.length !== 1 ? 's' : ''}`}</>}
        </span>
        {submitting && <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 500 }}>May take up to 5 minutes</span>}
      </button>
    </div>
  );
}

// ─── InlineContentStrategist ───────────────────────────────────────────────────────
// Inline content strategy panel with AI/manual toggle and save-to-planner

function InlineContentStrategist({ userId, onAddToPlanner, onUpgrade }: {
  userId: string | null;
  onAddToPlanner?: (item: { title: string; notes?: string; category: string; sourceLabel: string }, onSaved?: () => void) => void;
  onUpgrade?: () => void;
  workspaceId?: string | null;
}) {
  type StrategistTab = 'brief' | 'trends' | 'calendar' | 'strategy' | 'video';
  type BriefData = {
    niche: string; offer: string; audience: string; platforms: string[];
    frequency: string; tone: string; goals: string[]; currentStage: string;
  };

  const [tab, setTab]                   = useState<StrategistTab>('brief');
  const [brief, setBrief]               = useState<BriefData>({
    niche: '', offer: '', audience: '', platforms: ['instagram', 'linkedin'],
    frequency: '5x/week', tone: '', goals: ['grow audience', 'generate leads'], currentStage: 'growing',
  });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [results, setResults]           = useState<any | null>(() => {
    try { return JSON.parse(localStorage.getItem('mm_strategy_results') || 'null'); } catch { return null; }
  });

  // Sync results to/from Supabase user metadata so they persist across devices
  React.useEffect(() => {
    if (!userId) return;
    // On mount: pull from server if localStorage is empty
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const serverResults = user?.user_metadata?.mm_strategy;
        if (serverResults && !localStorage.getItem('mm_strategy_results')) {
          setResults(serverResults);
        }
      } catch {}
    })();
  }, [userId]);

  React.useEffect(() => {
    try {
      if (results) {
        localStorage.setItem('mm_strategy_results', JSON.stringify(results));
        // Push to server so other devices pick it up
        supabase.auth.updateUser({ data: { mm_strategy: results } }).catch(() => {});
      } else {
        localStorage.removeItem('mm_strategy_results');
        supabase.auth.updateUser({ data: { mm_strategy: null } }).catch(() => {});
      }
    } catch {}
  }, [results]);

  // Trends state
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsError, setTrendsError]     = useState<string | null>(null);
  const [trendsResults, setTrendsResults] = useState<any | null>(() => {
    try { return JSON.parse(localStorage.getItem('mm_trends_results') || 'null'); } catch { return null; }
  });
  React.useEffect(() => {
    try {
      if (trendsResults) localStorage.setItem('mm_trends_results', JSON.stringify(trendsResults));
      else localStorage.removeItem('mm_trends_results');
    } catch {}
  }, [trendsResults]);

  // Video repurpose state
  const [videoFile, setVideoFile]       = useState<File | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError]     = useState<string | null>(null);
  const [videoIdeas, setVideoIdeas]     = useState<any | null>(null);
  const [videoTone, setVideoTone]       = useState('');
  const [added, setAdded]               = useState<Set<string>>(new Set());

  const SUPABASE_URL_LOCAL = import.meta.env.VITE_SUPABASE_URL as string;

  const PLATFORM_OPTIONS = ['instagram','facebook','tiktok','youtube','x','linkedin','threads','bluesky'];
  const GOAL_OPTIONS = ['grow audience','generate leads','drive sales','build authority','grow email list','get speaking gigs','launch a product'];
  const STAGE_OPTIONS = ['just starting','growing','established','scaling'];
  const FREQ_OPTIONS = ['3x/week','5x/week','7x/week','2x/week','1x/day','2x/day'];

  const CATEGORY_COLORS: Record<string, string> = {
    idea: GOLD, short_clip: '#a78bfa', hook: '#38bdf8', blog: '#86efac', other: '#fb923c', strategy: '#f472b6',
  };

  const togglePlatform = (p: string) => setBrief(prev => ({
    ...prev, platforms: prev.platforms.includes(p) ? prev.platforms.filter(x => x !== p) : [...prev.platforms, p],
  }));
  const toggleGoal = (g: string) => setBrief(prev => ({
    ...prev, goals: prev.goals.includes(g) ? prev.goals.filter(x => x !== g) : [...prev.goals, g],
  }));

  const handleFetchTrends = async (briefSnapshot: typeof brief) => {
    if (!briefSnapshot.niche.trim()) return;
    if (!userId) return;
    setTrendsLoading(true); setTrendsError(null); setTrendsResults(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL_LOCAL}/functions/v1/content-strategist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({
          mode: 'trends_research',
          niche: briefSnapshot.niche,
          audience: briefSnapshot.audience,
          platforms: briefSnapshot.platforms,
          goals: briefSnapshot.goals,
          offer: briefSnapshot.offer,
        }),
      });
      const data = await res.json();
      if (data.error === 'upgrade_required') { onUpgrade?.(); return; }
      if (!res.ok) throw new Error(data.error || 'Trends research failed');
      setTrendsResults(data);
    } catch (e: any) { setTrendsError(e.message || 'Something went wrong'); }
    finally { setTrendsLoading(false); }
  };

  const handleGenerate = async () => {
    if (!brief.niche.trim() || !brief.audience.trim()) {
      setError('Fill in your niche and target audience to continue.'); return;
    }
    if (!userId) { setError('Sign in to use the AI Strategist.'); return; }
    setLoading(true); setError(null); setResults(null);
    // Fire trends research in parallel — don't await, results land when ready
    handleFetchTrends(brief);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL_LOCAL}/functions/v1/content-strategist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ mode: 'full_strategy', ...brief }),
      });
      const data = await res.json();
      if (data.error === 'upgrade_required') { onUpgrade?.(); setLoading(false); return; }
      if (data.error === 'limit_reached') { setError(data.message || 'Monthly strategy limit reached. Upgrade to Agency for unlimited strategies.'); setLoading(false); return; }
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResults(data);
      setTab('trends');
    } catch (e: any) { setError(e.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  const handleVideoRepurpose = async () => {
    if (!videoFile) { setVideoError('Select a video first'); return; }
    if (!userId) { setVideoError('Sign in first'); return; }
    setVideoLoading(true); setVideoError(null); setVideoIdeas(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const transcript = await transcribeVideo(videoFile, session?.access_token ?? '');
      const res = await fetch(`${SUPABASE_URL_LOCAL}/functions/v1/content-strategist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ mode: 'repurpose_from_video', transcript, tone: videoTone }),
      });
      const data = await res.json();
      if (data.error === 'upgrade_required') { onUpgrade?.(); return; }
      if (!res.ok) throw new Error(data.error || 'Failed');
      setVideoIdeas(data.ideas);
    } catch (e: any) { setVideoError(e.message || 'Something went wrong'); }
    finally { setVideoLoading(false); }
  };

  const handleAdd = (key: string, title: string, notes: string | undefined, category: string, sourceLabel: string) => {
    if (added.has(key)) return;
    onAddToPlanner?.({ title, notes, category, sourceLabel }, () => {
      setAdded(prev => new Set([...prev, key]));
    });
  };

  const PILLAR_COLOR = (p: string) => p === 'Reach' ? '#38bdf8' : p === 'Trust' ? '#a78bfa' : p === 'Sales' ? '#fb923c' : GOLD;

  const tabs: { id: StrategistTab; label: string; emoji: string }[] = [
    { id: 'brief',    label: 'Brief',    emoji: '📋' },
    { id: 'trends',   label: 'Trends',   emoji: '📈' },
    { id: 'calendar', label: 'Calendar', emoji: '📅' },
    { id: 'strategy', label: 'Strategy', emoji: '🎯' },
    { id: 'video',    label: 'Repurpose', emoji: '🎬' },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar + New Strategy button */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${BORDER}` }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0"
              style={{
                background: tab === t.id ? `${GOLD}18` : 'transparent',
                border: `1px solid ${tab === t.id ? GOLD : 'transparent'}`,
                color: tab === t.id ? GOLD_L : 'rgba(255,255,255,0.4)',
              }}>
              <span>{t.emoji}</span> {t.label}
              {t.id !== 'brief' && t.id !== 'trends' && t.id !== 'video' && !results && (
                <span className="text-[9px] opacity-40">—</span>
              )}
            </button>
          ))}
        </div>
        {results && (
          <button
            onClick={() => { setResults(null); setTab('brief'); }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition hover:bg-white/5"
            style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}
            title="Clear and generate a new strategy">
            <RefreshCw className="w-3.5 h-3.5" /> New
          </button>
        )}
      </div>

      {/* ── BRIEF TAB ─────────────────────────────────────────────────────── */}
      {tab === 'brief' && (
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-1" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}25` }}>
            <div className="text-sm font-black text-white">AI Content Strategist</div>
            <div className="text-xs text-white/45 leading-relaxed">
              Tell me about your business and I'll build you a 7-day content calendar with viral hooks, trend intelligence, and a follower-to-client strategy — all tailored to your niche.
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-white/35 uppercase tracking-wider">Your Niche *</label>
              <input value={brief.niche} onChange={e => setBrief(p => ({ ...p, niche: e.target.value }))}
                placeholder="e.g. Business coaching for real estate agents"
                className="mt-1.5 w-full rounded-xl border bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none"
                style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="text-xs font-bold text-white/35 uppercase tracking-wider">Your Offer <span className="normal-case font-normal opacity-60">(recommended)</span></label>
              <input value={brief.offer} onChange={e => setBrief(p => ({ ...p, offer: e.target.value }))}
                placeholder="e.g. 1-on-1 coaching $2,500/mo, online course $497"
                className="mt-1.5 w-full rounded-xl border bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none"
                style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="text-xs font-bold text-white/35 uppercase tracking-wider">Target Audience *</label>
              <input value={brief.audience} onChange={e => setBrief(p => ({ ...p, audience: e.target.value }))}
                placeholder="e.g. Real estate agents doing $100k/yr who want to hit $300k"
                className="mt-1.5 w-full rounded-xl border bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none"
                style={{ borderColor: BORDER }} />
            </div>

            <div>
              <label className="text-xs font-bold text-white/35 uppercase tracking-wider mb-2 block">Platforms</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map(p => (
                  <button key={p} onClick={() => togglePlatform(p)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition"
                    style={{
                      borderColor: brief.platforms.includes(p) ? GOLD : BORDER,
                      background: brief.platforms.includes(p) ? `${GOLD}15` : 'transparent',
                      color: brief.platforms.includes(p) ? GOLD_L : 'rgba(255,255,255,0.35)',
                    }}>
                    <PlatformIcon id={p} size="sm" />
                    <span className="capitalize">{p === 'x' ? 'X' : p}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-white/35 uppercase tracking-wider mb-2 block">Posting Frequency</label>
              <div className="flex flex-wrap gap-2">
                {FREQ_OPTIONS.map(f => (
                  <button key={f} onClick={() => setBrief(p => ({ ...p, frequency: f }))}
                    className="px-3 py-1.5 rounded-lg border text-xs font-bold transition"
                    style={{
                      borderColor: brief.frequency === f ? GOLD : BORDER,
                      background: brief.frequency === f ? `${GOLD}15` : 'transparent',
                      color: brief.frequency === f ? GOLD_L : 'rgba(255,255,255,0.35)',
                    }}>{f}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-white/35 uppercase tracking-wider mb-2 block">Goals</label>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map(g => (
                  <button key={g} onClick={() => toggleGoal(g)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-bold transition capitalize"
                    style={{
                      borderColor: brief.goals.includes(g) ? GOLD : BORDER,
                      background: brief.goals.includes(g) ? `${GOLD}15` : 'transparent',
                      color: brief.goals.includes(g) ? GOLD_L : 'rgba(255,255,255,0.35)',
                    }}>{g}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-white/35 uppercase tracking-wider mb-2 block">Current Stage</label>
              <div className="flex flex-wrap gap-2">
                {STAGE_OPTIONS.map(s => (
                  <button key={s} onClick={() => setBrief(p => ({ ...p, currentStage: s }))}
                    className="px-3 py-1.5 rounded-lg border text-xs font-bold transition capitalize"
                    style={{
                      borderColor: brief.currentStage === s ? GOLD : BORDER,
                      background: brief.currentStage === s ? `${GOLD}15` : 'transparent',
                      color: brief.currentStage === s ? GOLD_L : 'rgba(255,255,255,0.35)',
                    }}>{s}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-white/35 uppercase tracking-wider">Voice & Tone <span className="font-normal opacity-50">(optional)</span></label>
              <input value={brief.tone} onChange={e => setBrief(p => ({ ...p, tone: e.target.value }))}
                placeholder="e.g. Alex Hormozi, casual, luxury, professional, funny…"
                className="mt-1.5 w-full rounded-xl border bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none"
                style={{ borderColor: BORDER }} />
            </div>
          </div>

          {error && error !== 'upgrade_required' && (
            <div className="text-xs text-red-300 px-1">{error}</div>
          )}
          {error === 'upgrade_required' && (
            <div className="rounded-xl p-4 text-center space-y-2" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30` }}>
              <div className="text-sm font-bold" style={{ color: GOLD_L }}>Paid Plan Required</div>
              <p className="text-xs text-white/50">The AI Content Strategist is available on Creator, Viral, and Agency plans.</p>
            </div>
          )}

          <button onClick={handleGenerate} disabled={loading || !brief.niche.trim() || !brief.audience.trim()}
            className="w-full flex flex-col items-center justify-center gap-0.5 py-3.5 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
            style={{ background: GOLD, color: '#000' }}>
            <span className="flex items-center gap-2">
              {loading
                ? <><Loader className="w-4 h-4 animate-spin" /> Building your strategy…</>
                : <><Sparkles className="w-4 h-4" /> Build My Content Strategy</>}
            </span>
            {loading && <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 500 }}>Running 3 AI models in parallel. Up to 5 minutes.</span>}
          </button>
        </div>
      )}

      {/* ── TRENDS TAB ────────────────────────────────────────────────────── */}
      {tab === 'trends' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="rounded-xl p-4 space-y-1" style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.18)' }}>
            <div className="text-sm font-black text-white flex items-center gap-2">
              <span>📈</span> Niche Trend Intelligence
            </div>
            <div className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Deep research into what's trending in <span className="text-sky-300 font-semibold">{brief.niche || 'your niche'}</span> right now — viral formats, rising topics, platform-specific angles, and content gaps your competitors are missing.
            </div>
          </div>

          {/* No manual button — trends are triggered automatically on Brief submission */}
          {!trendsResults && !trendsLoading && !trendsError && (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
              <span className="text-3xl opacity-40">📈</span>
              <div className="text-sm font-bold text-white/25">Submit your Brief to generate Trend Intelligence</div>
            </div>
          )}

          {/* Loading */}
          {trendsLoading && (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-sky-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
                <span className="absolute inset-0 flex items-center justify-center text-lg">📡</span>
              </div>
              <div className="text-sm font-bold text-white/50">Researching trends across the internet…</div>
              <div className="text-xs text-white/25">Scanning viral content, search data & platform algorithms</div>
            </div>
          )}

          {/* Error */}
          {trendsError && trendsError !== 'upgrade_required' && !trendsLoading && (
            <div className="text-xs text-red-300 px-1">{trendsError}</div>
          )}
          {trendsError === 'upgrade_required' && !trendsLoading && (
            <div className="rounded-xl p-4 text-center space-y-2" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30` }}>
              <div className="text-sm font-bold" style={{ color: GOLD_L }}>Paid Plan Required</div>
              <p className="text-xs text-white/50">Trend Intelligence is available on Creator, Viral, and Agency plans.</p>
              <button onClick={onUpgrade} className="px-4 py-2 rounded-lg text-xs font-bold transition hover:brightness-110" style={{ background: `linear-gradient(135deg,${GOLD_D},${GOLD})`, color: '#000' }}>Upgrade to Unlock</button>
            </div>
          )}

          {/* Results */}
          {trendsResults && !trendsLoading && (
            <div className="space-y-5">
              {/* Niche overview */}
              {trendsResults.niche_overview && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
                  <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1.5">Niche Overview</div>
                  <p className="text-sm text-white/75 leading-relaxed">{trendsResults.niche_overview}</p>
                </div>
              )}

              {/* Trending topics */}
              {trendsResults.trending_topics?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2.5">🔥 Trending Topics Right Now</div>
                  <div className="space-y-2">
                    {trendsResults.trending_topics.map((t: any, i: number) => (
                      <div key={i} className="rounded-xl p-3.5 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: BORDER }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-sm font-bold text-white">{t.topic}</div>
                            {t.why && <div className="text-xs text-white/45 mt-0.5 leading-relaxed">{t.why}</div>}
                            {t.content_angle && (
                              <div className="mt-1.5 text-xs font-semibold" style={{ color: '#7dd3fc' }}>
                                💡 Angle: {t.content_angle}
                              </div>
                            )}
                          </div>
                          <button onClick={() => handleAdd(`trend-${i}`, t.topic, t.content_angle, 'idea', 'Trends')}
                            disabled={added.has(`trend-${i}`)}
                            className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border transition"
                            style={{ borderColor: added.has(`trend-${i}`) ? 'rgba(34,197,94,0.4)' : BORDER, color: added.has(`trend-${i}`) ? '#86efac' : 'rgba(255,255,255,0.4)', background: added.has(`trend-${i}`) ? 'rgba(34,197,94,0.08)' : 'transparent' }}>
                            {added.has(`trend-${i}`) ? '✓' : '+ Plan'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Viral formats */}
              {trendsResults.viral_formats?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2.5">🎬 Viral Content Formats</div>
                  <div className="grid grid-cols-1 gap-2">
                    {trendsResults.viral_formats.map((f: any, i: number) => (
                      <div key={i} className="rounded-xl p-3.5 border" style={{ background: 'rgba(168,85,247,0.05)', borderColor: 'rgba(168,85,247,0.18)' }}>
                        <div className="text-sm font-bold" style={{ color: '#c084fc' }}>{f.format}</div>
                        {f.description && <div className="text-xs text-white/50 mt-0.5 leading-relaxed">{f.description}</div>}
                        {f.example && <div className="text-xs mt-1.5 text-white/35 italic">e.g. "{f.example}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rising keywords */}
              {trendsResults.rising_keywords?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2.5">🔑 Rising Keywords & Phrases</div>
                  <div className="flex flex-wrap gap-2">
                    {trendsResults.rising_keywords.map((kw: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                        style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}25`, color: GOLD_L }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Platform trends */}
              {trendsResults.platform_trends?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2.5">📱 Platform-Specific Trends</div>
                  <div className="space-y-2">
                    {trendsResults.platform_trends.map((pt: any, i: number) => (
                      <div key={i} className="rounded-xl p-3.5 border flex gap-3" style={{ background: 'rgba(255,255,255,0.025)', borderColor: BORDER }}>
                        <div className="shrink-0 mt-0.5">
                          <PlatformIcon id={pt.platform?.toLowerCase()} size="sm" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white capitalize">{pt.platform}: <span className="text-white/70 font-semibold">{pt.trend}</span></div>
                          {pt.tip && <div className="text-xs text-white/40 mt-0.5 leading-relaxed">{pt.tip}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Competitor gaps */}
              {trendsResults.competitor_gaps?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2.5">🎯 Content Gaps to Own</div>
                  <div className="space-y-2">
                    {trendsResults.competitor_gaps.map((gap: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 border" style={{ background: 'rgba(251,146,60,0.05)', borderColor: 'rgba(251,146,60,0.15)' }}>
                        <span className="text-orange-400 mt-0.5 shrink-0">→</span>
                        <span className="text-sm text-white/70 leading-relaxed">{gap}</span>
                        <button onClick={() => handleAdd(`gap-${i}`, gap, undefined, 'idea', 'Trends Gap')}
                          disabled={added.has(`gap-${i}`)}
                          className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border ml-auto transition"
                          style={{ borderColor: added.has(`gap-${i}`) ? 'rgba(34,197,94,0.4)' : BORDER, color: added.has(`gap-${i}`) ? '#86efac' : 'rgba(255,255,255,0.4)', background: added.has(`gap-${i}`) ? 'rgba(34,197,94,0.08)' : 'transparent' }}>
                          {added.has(`gap-${i}`) ? '✓' : '+ Plan'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              {trendsResults.researched_at && (
                <div className="text-center text-[10px] text-white/15 pt-2">
                  Researched {new Date(trendsResults.researched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CALENDAR TAB ──────────────────────────────────────────────────── */}
      {tab === 'calendar' && (
        <div className="space-y-4">
          {!results ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <span className="text-3xl">📅</span>
              <div className="text-sm font-bold text-white/30">No strategy generated yet</div>
              <button onClick={() => setTab('brief')} className="px-4 py-2 rounded-xl text-xs font-bold transition hover:brightness-110" style={{ background: GOLD, color: '#000' }}>
                Fill in your brief →
              </button>
            </div>
          ) : (
            <>
              {/* Content Pillars */}
              {results.calendar?.content_pillars?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">Your Content Pillars</div>
                  <div className="grid grid-cols-2 gap-2">
                    {results.calendar.content_pillars.map((cp: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                        <div className="text-xs font-bold text-white">{cp.name}</div>
                        <div className="text-[10px] text-white/40 mt-0.5 leading-relaxed">{cp.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pillar ratio */}
              {results.strategy?.content_pillars_ratio && (
                <div className="rounded-xl border p-3" style={{ borderColor: BORDER }}>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">Recommended Mix</div>
                  <div className="flex gap-2">
                    {Object.entries(results.strategy.content_pillars_ratio).map(([k, v]: [string, any]) => (
                      <div key={k} className="flex-1 text-center p-2 rounded-lg" style={{ background: `${PILLAR_COLOR(k.charAt(0).toUpperCase()+k.slice(1))}15` }}>
                        <div className="text-lg font-black" style={{ color: PILLAR_COLOR(k.charAt(0).toUpperCase()+k.slice(1)) }}>{v}%</div>
                        <div className="text-[10px] text-white/40 capitalize font-bold">{k}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Week 1 Priority */}
              {results.calendar?.week1_priority && (
                <div className="rounded-xl p-3 border" style={{ borderColor: `${GOLD}40`, background: `${GOLD}08` }}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: GOLD }}>⭐ Week 1 Priority: Day {results.calendar.week1_priority.day}</div>
                  <div className="text-xs text-white/60 leading-relaxed">{results.calendar.week1_priority.reason}</div>
                </div>
              )}

              {/* 7-Day Calendar */}
              <div>
                <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">7-Day Calendar</div>
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {(results.calendar?.calendar || []).map((day: any, i: number) => {
                    const col = PILLAR_COLOR(day.pillar);
                    return (
                      <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                        <div className="w-8 shrink-0 text-center">
                          <div className="text-[10px] font-black" style={{ color: col }}>D{day.day}</div>
                          <div className="text-[9px] text-white/25">{day.best_time}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: `${col}20`, color: col }}>{day.pillar}</span>
                            <span className="text-[9px] text-white/30 font-semibold">{day.content_type}</span>
                            {day.platform && <PlatformIcon id={day.platform.toLowerCase()} size="sm" />}
                          </div>
                          <div className="text-xs font-bold text-white leading-snug">{day.topic}</div>
                          <div className="text-[10px] text-white/50 mt-1 leading-relaxed italic">"{day.hook}"</div>
                          <div className="text-[10px] text-white/30 mt-0.5">{day.goal}</div>
                        </div>
                        <button onClick={() => handleAdd(`cal-${i}`, day.topic, `Hook: ${day.hook}\nGoal: ${day.goal}\nFormat: ${day.content_type}`, 'idea', 'AI Calendar')}
                          className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold transition"
                          style={{ background: added.has(`cal-${i}`) ? 'rgba(34,197,94,0.15)' : `${GOLD}15`, color: added.has(`cal-${i}`) ? '#86efac' : GOLD_L }}>
                          {added.has(`cal-${i}`) ? '✓' : '+'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Evergreen Posts */}
              {results.calendar?.evergreen_posts?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">♻️ Evergreen Posts (reuse every 90 days)</div>
                  <div className="space-y-2">
                    {results.calendar.evergreen_posts.map((ep: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-xs font-bold text-white">{ep.topic}</div>
                            <div className="text-[10px] text-white/50 mt-0.5 italic">"{ep.hook}"</div>
                            <div className="text-[10px] text-white/30 mt-0.5">{ep.why_evergreen}</div>
                          </div>
                          <button onClick={() => handleAdd(`ev-${i}`, ep.topic, `Hook: ${ep.hook}`, 'idea', 'Evergreen')}
                            className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold transition"
                            style={{ background: added.has(`ev-${i}`) ? 'rgba(34,197,94,0.15)' : `${GOLD}15`, color: added.has(`ev-${i}`) ? '#86efac' : GOLD_L }}>
                            {added.has(`ev-${i}`) ? '✓ Added' : '+ Planner'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── STRATEGY TAB ──────────────────────────────────────────────────── */}
      {tab === 'strategy' && (
        <div className="space-y-4">
          {!results ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <span className="text-3xl">🎯</span>
              <div className="text-sm font-bold text-white/30">Generate your strategy first</div>
              <button onClick={() => setTab('brief')} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: GOLD, color: '#000' }}>Fill in your brief →</button>
            </div>
          ) : (
            <>
              {/* Quick Wins */}
              {results.strategy?.quick_wins?.length > 0 && (
                <div className="rounded-xl p-4 border" style={{ borderColor: `${GOLD}40`, background: `${GOLD}08` }}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: GOLD }}>⚡ Do This Week</div>
                  <div className="space-y-2">
                    {results.strategy.quick_wins.map((w: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5" style={{ background: `${GOLD}25`, color: GOLD }}>{i+1}</div>
                        <p className="text-xs text-white/70 leading-relaxed">{w}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Follower-to-Client System */}
              {results.strategy?.conversion_system && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">Follower → Client System</div>
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                    {results.strategy.conversion_system.post_types_that_generate_dms?.length > 0 && (
                      <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
                        <div className="text-[10px] font-bold text-white/30 uppercase mb-2">Posts That Generate DMs</div>
                        {results.strategy.conversion_system.post_types_that_generate_dms.map((pt: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
                            <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0" style={{ background: `${GOLD}25`, color: GOLD }}>{i+1}</div>
                            <p className="text-xs text-white/65">{pt}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {results.strategy.conversion_system.dm_opener && (
                      <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
                        <div className="text-[10px] font-bold text-white/30 uppercase mb-1.5">DM Opener</div>
                        <p className="text-xs text-white/70 italic leading-relaxed">"{results.strategy.conversion_system.dm_opener}"</p>
                      </div>
                    )}
                    {results.strategy.conversion_system.cta_language?.length > 0 && (
                      <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
                        <div className="text-[10px] font-bold text-white/30 uppercase mb-2">CTA Variations</div>
                        {results.strategy.conversion_system.cta_language.map((cta: string, i: number) => (
                          <div key={i} className="text-xs text-white/60 mb-1 italic">"{cta}"</div>
                        ))}
                      </div>
                    )}
                    {results.strategy.conversion_system.warming_sequence?.length > 0 && (
                      <div className="px-4 py-3">
                        <div className="text-[10px] font-bold text-white/30 uppercase mb-2">5-Post Warming Sequence</div>
                        {results.strategy.conversion_system.warming_sequence.map((step: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0" style={{ background: `${GOLD}20`, color: GOLD }}>{i+1}</div>
                            <p className="text-xs text-white/60 leading-relaxed">{typeof step === 'string' ? step : (step.description || step.role || JSON.stringify(step))}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── VIDEO REPURPOSE TAB ───────────────────────────────────────────── */}
      {tab === 'video' && (
        <div className="space-y-4">
          <div className="rounded-xl p-3" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}25` }}>
            <div className="text-xs font-bold text-white">🎬 Video Repurposer</div>
            <div className="text-[10px] text-white/45 mt-0.5 leading-relaxed">Upload a talking video and I'll extract every piece of content from it: clips, hooks, posts, blog angles, and series ideas.</div>
          </div>

          {!videoIdeas ? (
            <div className="space-y-3">
              {!videoFile ? (
                <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed cursor-pointer hover:bg-white/3 transition" style={{ borderColor: BORDER }}>
                  <Video className="w-8 h-8 text-white/20" />
                  <span className="text-sm font-bold text-white/35">Upload your talking video</span>
                  <span className="text-xs text-white/20">AI will transcribe and extract content strategy</span>
                  <input type="file" accept="video/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
                      setVideoFile(f); setVideoObjectUrl(URL.createObjectURL(f));
                    }
                  }} />
                </label>
              ) : (
                <VideoPreviewCard file={videoFile} objectUrl={videoObjectUrl!} uploadState={{ status: 'idle' }}
                  onRemove={() => { if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl); setVideoFile(null); setVideoObjectUrl(null); }} />
              )}
              <input value={videoTone} onChange={e => setVideoTone(e.target.value)}
                placeholder="Tone (optional): casual, Alex Hormozi, luxury…"
                className="w-full rounded-xl border bg-black/30 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
                style={{ borderColor: BORDER }} />
              {videoError && videoError === 'upgrade_required' ? (
                <div className="rounded-xl p-4 text-center space-y-2" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30` }}>
                  <div className="text-sm font-bold" style={{ color: GOLD_L }}>Viral & Agency Feature</div>
                  <p className="text-xs text-white/50">Video repurposing is available on Viral and Agency plans.</p>
                </div>
              ) : videoError ? (
                <div className="text-xs text-red-300">{videoError}</div>
              ) : null}
              <button onClick={handleVideoRepurpose} disabled={videoLoading || !videoFile}
                className="w-full flex flex-col items-center justify-center gap-0.5 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
                style={{ background: GOLD, color: '#000' }}>
                <span className="flex items-center gap-2">
                  {videoLoading ? <><Loader className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Sparkles className="w-4 h-4" /> Extract All AI Strategist</>}
                </span>
                {videoLoading && <span style={{ fontSize: 9, opacity: 0.6 }}>Transcribing + analyzing. Up to 5 minutes.</span>}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button onClick={() => { setVideoIdeas(null); setVideoFile(null); if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl); setVideoObjectUrl(null); }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border transition hover:bg-white/5"
                style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
                ↺ Analyze another video
              </button>

              {videoIdeas.short_clips?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">🎬 Short Clip Ideas</div>
                  <div className="space-y-2">
                    {videoIdeas.short_clips.map((clip: any, i: number) => {
                      const key = `vc-${i}`;
                      return (
                        <div key={i} className="p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-xs font-bold text-white">{clip.title}</div>
                              <div className="text-[10px] text-white/45 mt-0.5">{clip.angle}</div>
                              {clip.hook && <div className="text-[10px] text-white/35 mt-0.5 italic">Hook: "{clip.hook}"</div>}
                              <div className="text-[10px] font-semibold mt-1" style={{ color: GOLD }}>{clip.platform}</div>
                            </div>
                            <button onClick={() => handleAdd(key, clip.title, clip.angle, 'short_clip', 'Short Clip')}
                              className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold transition"
                              style={{ background: added.has(key) ? 'rgba(34,197,94,0.15)' : `${GOLD}15`, color: added.has(key) ? '#86efac' : GOLD_L }}>
                              {added.has(key) ? '✓' : '+ Planner'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {videoIdeas.social_hooks?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">🪝 Hooks</div>
                  <div className="space-y-1.5">
                    {videoIdeas.social_hooks.map((hook: string, i: number) => {
                      const key = `vh-${i}`;
                      return (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                          <p className="flex-1 text-xs text-white/65 leading-relaxed italic">"{hook}"</p>
                          <button onClick={() => handleAdd(key, hook, undefined, 'hook', 'Hook')}
                            className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold transition"
                            style={{ background: added.has(key) ? 'rgba(34,197,94,0.15)' : `${GOLD}15`, color: added.has(key) ? '#86efac' : GOLD_L }}>
                            {added.has(key) ? '✓' : '+'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {videoIdeas.text_posts?.twitter?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">✍️ Text Posts</div>
                  <div className="space-y-1.5">
                    {videoIdeas.text_posts.twitter.slice(0, 3).map((post: string, i: number) => {
                      const key = `vtp-${i}`;
                      return (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                          <p className="flex-1 text-xs text-white/65 leading-relaxed">{post}</p>
                          <button onClick={() => handleAdd(key, post, undefined, 'idea', 'Text Post')}
                            className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold transition"
                            style={{ background: added.has(key) ? 'rgba(34,197,94,0.15)' : `${GOLD}15`, color: added.has(key) ? '#86efac' : GOLD_L }}>
                            {added.has(key) ? '✓' : '+'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {videoIdeas.blog_angles?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">✍️ Blog Angles</div>
                  <div className="space-y-2">
                    {videoIdeas.blog_angles.map((b: any, i: number) => {
                      const key = `vb-${i}`;
                      return (
                        <div key={i} className="p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div><div className="text-xs font-bold text-white">{b.headline}</div><div className="text-[10px] text-white/40 mt-0.5">{b.angle}</div></div>
                            <button onClick={() => handleAdd(key, b.headline, b.angle, 'blog', 'Blog')}
                              className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold transition"
                              style={{ background: added.has(key) ? 'rgba(34,197,94,0.15)' : `${GOLD}15`, color: added.has(key) ? '#86efac' : GOLD_L }}>
                              {added.has(key) ? '✓' : '+ Planner'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {videoIdeas.series_ideas?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">📺 Series Strategies</div>
                  <div className="space-y-2">
                    {videoIdeas.series_ideas.map((s: any, i: number) => {
                      const key = `vs-${i}`;
                      return (
                        <div key={i} className="p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div><div className="text-xs font-bold text-white">{s.series_name}</div><div className="text-[10px] text-white/40 mt-0.5">{s.concept}</div></div>
                            <button onClick={() => handleAdd(key, s.series_name, s.concept, 'other', 'Series')}
                              className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold transition"
                              style={{ background: added.has(key) ? 'rgba(34,197,94,0.15)' : `${GOLD}15`, color: added.has(key) ? '#86efac' : GOLD_L }}>
                              {added.has(key) ? '✓' : '+ Planner'}
                            </button>
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
      )}
    </div>
  );
}

function AddPlannerItemModal({
  userId, initialDate, prefilled, onClose, onSaved, workspaceId,
}: {
  userId: string | null;
  initialDate: string;
  prefilled?: { title: string; notes?: string; category: string; sourceLabel: string };
  onClose: () => void;
  onSaved: () => void;
  workspaceId?: string | null;
}) {
  const [title, setTitle]         = useState(prefilled?.title ?? '');
  const [notes, setNotes]         = useState(prefilled?.notes ?? '');
  const [date, setDate]           = useState(initialDate);
  const [time, setTime]           = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (!date) { setError('Date is required'); return; }
    if (!userId) { setError('You must be signed in'); return; }
    setSaving(true); setError(null);
    try {
      const { error: dbErr } = await supabase.from('content_planner').insert({
        supabase_user_id: userId,
        title: title.trim(),
        notes: notes.trim() || null,
        planned_date: date,
        planned_time: time || null,
        category: prefilled?.category ?? 'idea',
        source_label: prefilled?.sourceLabel ?? 'Manual',
        workspace_id: workspaceId ?? null,
      });
      if (dbErr) throw dbErr;
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Failed to save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center md:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl border shadow-2xl"
        style={{ background: 'rgba(18,18,18,0.98)', borderColor: BORDER }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <div>
            <div className="text-sm font-black text-white">Add to Planner</div>
            {prefilled?.sourceLabel && (
              <div className="text-xs text-white/40 mt-0.5">From: {prefilled.sourceLabel}</div>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-1.5">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Content idea or post topic"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}` }}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Hook, angle, key points…"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-1.5">Date *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-1.5">Time (optional)</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, colorScheme: 'dark' }}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white/40 hover:text-white hover:bg-white/8 transition border" style={{ borderColor: BORDER }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-black transition hover:brightness-110 disabled:opacity-50"
            style={{ background: GOLD, color: '#000' }}>
            {saving ? 'Saving…' : 'Save to Planner'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlannerPanel({ userId, subscription, onUpgrade, workspaceId }: {
  userId: string | null;
  subscription: { plan: string; status: string; stripe_customer_id?: string; } | null;
  onUpgrade: () => void;
  workspaceId?: string | null;
}) {
  const [items, setItems]               = useState<PlannerItem[]>([]);
  const [loading, setLoading]           = useState(false);
  const [weekStart, setWeekStart]       = useState<Date>(() => {
    const d = new Date(); d.setHours(0,0,0,0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDate, setAddDate]           = useState('');
  const [repurposeOpen, setRepurposeOpen] = useState(false);
  const [pendingItem, setPendingItem]   = useState<{ title: string; notes?: string; category: string; sourceLabel: string } | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [tpLoadingId, setTpLoadingId]   = useState<string | null>(null);
  const [tpResults, setTpResults]       = useState<Record<string, string[]>>({});
  const [tpCollapsed, setTpCollapsed]   = useState<Set<string>>(new Set());
  const [tpErrors, setTpErrors]         = useState<Record<string, string>>({});

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekLabel = `${fmt(days[0])} – ${fmt(days[6])}, ${days[0].getFullYear()}`;
  const today = new Date(); today.setHours(0,0,0,0);

  const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  const goToday  = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); setWeekStart(d); };

  const loadItems = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const startStr = days[0].toISOString().split('T')[0];
      const endStr   = days[6].toISOString().split('T')[0];
      let q = supabase
        .from('content_planner')
        .select('*')
        .eq('supabase_user_id', userId)
        .gte('planned_date', startStr)
        .lte('planned_date', endStr);
      if (workspaceId) q = q.eq('workspace_id', workspaceId);
      else q = q.is('workspace_id', null);
      const { data, error } = await q;
      if (!error && data) {
        setItems(data.map((r: any) => ({
          id: r.id, title: r.title, notes: r.notes,
          plannedDate: r.planned_date, plannedTime: r.planned_time,
          category: r.category || 'idea', sourceLabel: r.source_label,
        })));
      }
    } catch (e) {}
    finally { setLoading(false); }
  }, [userId, weekStart, workspaceId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const itemsOnDay = (day: Date) => {
    const dateStr = day.toISOString().split('T')[0];
    return items.filter(it => it.plannedDate === dateStr)
      .sort((a, b) => (a.plannedTime || '23:59') < (b.plannedTime || '23:59') ? -1 : 1);
  };

  const daysWithItems = days.filter(d => itemsOnDay(d).length > 0);

  const deleteItem = async (id: string) => {
    await supabase.from('content_planner').delete().eq('id', id);
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const generateTalkingPoints = async (itemId: string, title: string) => {
    if (!userId) return;
    const isPromo = subscription?.stripe_customer_id?.startsWith('promo_');
    const isTrialing = subscription?.status === 'trialing' && !!subscription?.current_period_end && new Date(subscription.current_period_end) > new Date();
    const isActive = subscription?.status === 'active' || isPromo || isTrialing;
    const plan = isActive ? (subscription?.plan?.toLowerCase() ?? 'free') : 'free';
    if (!isActive || plan === 'starter') { onUpgrade(); return; }
    setTpLoadingId(itemId);
    setTpErrors(prev => { const n = { ...prev }; delete n[itemId]; return n; });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/content-strategist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ mode: 'talking_points', idea: title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      if (data.talking_points && Array.isArray(data.talking_points)) {
        setTpResults(prev => ({ ...prev, [itemId]: data.talking_points }));
      } else {
        throw new Error('No talking points returned');
      }
    } catch (e: any) {
      setTpErrors(prev => ({ ...prev, [itemId]: e?.message || 'Generation failed' }));
    } finally {
      setTpLoadingId(null);
    }
  };

  const pendingAddCallback = React.useRef<(() => void) | undefined>(undefined);
  const handleAddToPlanner = (item: { title: string; notes?: string; category: string; sourceLabel: string }, onSaved?: () => void) => {
    pendingAddCallback.current = onSaved;
    setPendingItem(item);
    setAddDate(today.toISOString().split('T')[0]);
    setRepurposeOpen(false);
    setAddModalOpen(true);
  };

  const toggleDay = (dateStr: string) => setExpandedDays(prev => {
    const next = new Set(prev);
    if (next.has(dateStr)) next.delete(dateStr); else next.add(dateStr);
    return next;
  });

  const CATEGORY_COLORS: Record<string, string> = {
    idea: GOLD, short_clip: '#a78bfa', hook: '#38bdf8', blog: '#86efac', other: '#fb923c',
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b shrink-0" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-1.5">
          <button onClick={prevWeek} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-white w-48 text-center">{weekLabel}</span>
          <button onClick={nextWeek} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-2 py-1 rounded-lg text-xs font-bold border hover:bg-white/8 transition" style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
            Today
          </button>
          {loading && <Loader className="w-4 h-4 animate-spin text-white/20" />}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setRepurposeOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition hover:bg-white/5"
            style={{ borderColor: `${GOLD}35`, color: GOLD }}>
            <Sparkles className="w-3.5 h-3.5" /> AI Strategies
          </button>
          <button onClick={() => { setAddDate(today.toISOString().split('T')[0]); setPendingItem(null); setAddModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition hover:brightness-110"
            style={{ background: GOLD, color: '#000' }}>
            <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">Add Strategy</span>
          </button>
        </div>
      </div>

      {/* Content: only days with items, or empty state */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-4 px-4 md:px-6 py-4 space-y-2">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center h-40 gap-2 text-white/25 text-sm">
            <Loader className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : daysWithItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <span className="text-4xl">📅</span>
            <div className="text-sm font-bold text-white/25">No strategies planned this week</div>
            <div className="text-xs text-white/20 max-w-xs">Add strategies manually or use AI to generate content strategy from your videos</div>
            <button onClick={() => setRepurposeOpen(true)}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition hover:bg-white/5"
              style={{ borderColor: `${GOLD}35`, color: GOLD }}>
              <Sparkles className="w-3.5 h-3.5" /> Generate AI Strategies
            </button>
          </div>
        ) : (
          daysWithItems.map(day => {
            const dateStr  = day.toISOString().split('T')[0];
            const dayItems = itemsOnDay(day);
            const isToday  = day.getTime() === today.getTime();
            const expanded = expandedDays.has(dateStr);
            const dayLabel = day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

            return (
              <div key={dateStr} className="rounded-2xl border overflow-hidden"
                style={{ borderColor: isToday ? `${GOLD}40` : BORDER, background: isToday ? `${GOLD}06` : 'rgba(255,255,255,0.02)' }}>
                {/* Day header */}
                <button
                  onClick={() => toggleDay(dateStr)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                      style={isToday ? { background: GOLD, color: '#000' } : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                      {day.getDate()}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">{dayLabel}</div>
                      <div className="text-xs text-white/35">{dayItems.length} strateg{dayItems.length !== 1 ? 'ies' : 'y'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); setAddDate(dateStr); setPendingItem(null); setAddModalOpen(true); }}
                      className="w-6 h-6 rounded-full flex items-center justify-center border hover:bg-white/10 transition"
                      style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.3)' }}>
                      <Plus className="w-3 h-3" />
                    </button>
                    {expanded
                      ? <ChevronUp className="w-4 h-4 text-white/30" />
                      : <ChevronDown className="w-4 h-4 text-white/30" />}
                  </div>
                </button>

                {/* Items — always visible, collapse on tap */}
                <div className={`${expanded === false ? 'hidden' : 'block'} border-t`} style={{ borderColor: BORDER }}>
                  {dayItems.map(item => {
                    const col = CATEGORY_COLORS[item.category] || GOLD;
                    const points = tpResults[item.id];
                    const isLoading = tpLoadingId === item.id;
                    const tpError = tpErrors[item.id];
                    return (
                      <div key={item.id} className="flex flex-col border-b last:border-0"
                        style={{ borderColor: BORDER }}>
                        <div className="flex items-start gap-3 px-4 py-3">
                          <div className="w-1 self-stretch rounded-full mt-1 shrink-0" style={{ background: col }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white leading-snug">{item.title}</span>
                              {item.sourceLabel && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                  style={{ background: `${col}18`, color: col }}>
                                  {item.sourceLabel}
                                </span>
                              )}
                            </div>
                            {item.notes && <p className="text-xs text-white/40 mt-1 leading-relaxed">{item.notes}</p>}
                            {item.plannedTime && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-white/25">
                                <Clock className="w-3 h-3" />{item.plannedTime.slice(0, 5)}
                              </div>
                            )}
                            <button
                              onClick={() => {
                                if (points) {
                                  // Toggle visibility without deleting — store in collapsed set
                                  setTpCollapsed(prev => { const n = new Set(prev); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; });
                                } else {
                                  generateTalkingPoints(item.id, item.title);
                                }
                              }}
                              disabled={isLoading}
                              className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition disabled:opacity-50"
                              style={{ background: points ? 'rgba(34,197,94,0.10)' : 'rgba(168,85,247,0.12)', color: points ? '#86efac' : '#c084fc', border: `1px solid ${points ? 'rgba(34,197,94,0.25)' : 'rgba(168,85,247,0.25)'}` }}>
                              {isLoading
                                ? <><Loader className="w-3 h-3 animate-spin" /> Generating…</>
                                : points
                                ? tpCollapsed.has(item.id) ? <><Sparkles className="w-3 h-3" /> Show Talking Points</> : <>✓ Hide Talking Points</>
                                : <><Sparkles className="w-3 h-3" /> 5 Viral Talking Points</>}
                            </button>
                          </div>
                          <button onClick={() => deleteItem(item.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/20 text-white/20 hover:text-red-400 transition shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {tpError && (
                          <div className="px-4 pb-3 ml-4">
                            <p className="text-[10px] text-red-300/70">{tpError}</p>
                          </div>
                        )}
                        {points && !tpCollapsed.has(item.id) && (
                          <div className="px-4 pb-3 ml-4 space-y-1.5">
                            {points.map((point, i) => (
                              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg text-xs text-white/70 leading-relaxed"
                                style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.15)' }}>
                                <span className="shrink-0 text-[10px] font-black mt-0.5" style={{ color: '#c084fc' }}>{i + 1}.</span>
                                {point}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {addModalOpen && (
        <AddPlannerItemModal
          userId={userId}
          initialDate={addDate}
          prefilled={pendingItem ?? undefined}
          workspaceId={workspaceId}
          onClose={() => { setAddModalOpen(false); setPendingItem(null); }}
          onSaved={() => { setAddModalOpen(false); setPendingItem(null); loadItems(); pendingAddCallback.current?.(); pendingAddCallback.current = undefined; }}
        />
      )}

      {repurposeOpen && (
        <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRepurposeOpen(false)} />
          <div className="relative w-full md:max-w-xl rounded-t-2xl md:rounded-2xl border overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            style={{ background: SURFACE, borderColor: BORDER }}>
            <div className="flex items-center justify-between px-6 py-5 border-b shrink-0" style={{ borderColor: BORDER }}>
              <div>
                <h2 className="text-base font-bold text-white">♻️ AI Strategist</h2>
                <p className="text-sm text-white/40 mt-0.5">Find new angles, add directly to your planner</p>
              </div>
              <button onClick={() => setRepurposeOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <InlineContentStrategist userId={userId} onAddToPlanner={handleAddToPlanner} onUpgrade={onUpgrade} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ReferralBanner ──────────────────────────────────────────────────────────

function ReferralBanner({ userId }: { userId: string | null }) {
  const [referralLink, setReferralLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(() => {
    try { return localStorage.getItem('mm_referral_banner_dismissed') === '1'; } catch { return false; }
  });

  React.useEffect(() => {
    if (!userId || dismissed) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/referral-stats`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.referralLink) setReferralLink(data.referralLink);
        }
      } catch {}
    })();
  }, [userId, dismissed]);

  const copy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const dismiss = () => {
    try { localStorage.setItem('mm_referral_banner_dismissed', '1'); } catch {}
    setDismissed(true);
  };

  if (dismissed || !referralLink) return null;

  return (
    <div className="mb-5 rounded-2xl border overflow-hidden" style={{ background: `linear-gradient(135deg, ${GOLD}12, rgba(0,0,0,0.3))`, borderColor: `${GOLD}40` }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${GOLD}20` }}>
          <Gift className="w-4 h-4" style={{ color: GOLD }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-black" style={{ color: GOLD_L }}>💸 Earn 20% per referral — forever</div>
          <div className="text-[10px] text-white/40 truncate mt-0.5">{referralLink}</div>
        </div>
        <button onClick={copy}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition hover:brightness-110"
          style={{ background: copied ? 'rgba(34,197,94,0.2)' : `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: copied ? '#86efac' : '#000' }}>
          {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
        </button>
        <button onClick={dismiss} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/10 text-white/20 hover:text-white/50 transition shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function ComposerPanel({ integrations, userId, initialVideoUrl, initialComposerMode, onVideoConsumed, onUpgrade, workspaceId }: {
  integrations: PostizIntegration[];
  userId: string | null;
  initialVideoUrl?: string | null;
  initialComposerMode?: 'media' | 'text' | 'saved';
  onVideoConsumed?: () => void;
  onUpgrade?: () => void;
}) {
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
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/ayrshare-scheduled?userId=${encodeURIComponent(userId)}&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}${workspaceId ? `&workspaceId=${encodeURIComponent(workspaceId)}` : ''}`);
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

  const pendingAddCallback = React.useRef<(() => void) | undefined>(undefined);
  const handleAddToPlanner = (item: { title: string; notes?: string; category: string; sourceLabel: string }, onSaved?: () => void) => {
    pendingAddCallback.current = onSaved;
    setPendingItem(item);
    setAddModalOpen(true);
  };

  const [composerPanelTab, setComposerPanelTab] = React.useState<'post' | 'strategist'>(
    initialComposerMode === 'text' || initialComposerMode === 'saved' || initialVideoUrl ? 'post' : 'post'
  );

  // Switch to post tab when a video handoff arrives
  React.useEffect(() => {
    if (initialVideoUrl) setComposerPanelTab('post');
  }, [initialVideoUrl]);

  return (
    <div className="flex flex-col flex-1 min-h-0">

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

      {/* ── Tab strip ── */}
      <div className="flex shrink-0 border-b" style={{ borderColor: BORDER }}>
        <button
          onClick={() => setComposerPanelTab('post')}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition border-b-2"
          style={{
            borderBottomColor: composerPanelTab === 'post' ? GOLD : 'transparent',
            color: composerPanelTab === 'post' ? GOLD_L : 'rgba(255,255,255,0.35)',
            background: composerPanelTab === 'post' ? `${GOLD}08` : 'transparent',
          }}>
          <Send className="w-4 h-4" /> Create a Post
        </button>
        <button
          onClick={() => setComposerPanelTab('strategist')}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition border-b-2"
          style={{
            borderBottomColor: composerPanelTab === 'strategist' ? '#38bdf8' : 'transparent',
            color: composerPanelTab === 'strategist' ? '#7dd3fc' : 'rgba(255,255,255,0.35)',
            background: composerPanelTab === 'strategist' ? 'rgba(56,189,248,0.06)' : 'transparent',
          }}>
          <Sparkles className="w-4 h-4" style={{ color: composerPanelTab === 'strategist' ? '#38bdf8' : 'inherit' }} /> AI Content Strategist
        </button>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">

        {/* Referral Banner — always visible regardless of tab */}
        <div className="px-4 md:px-8 pt-4">
          <ReferralBanner userId={userId} />
        </div>

        {composerPanelTab === 'post' && (
          <div className="px-4 md:px-8 py-6 w-full">
            <InlinePostComposer integrations={integrations} userId={userId} onSuccess={() => { loadPosts(); onVideoConsumed?.(); }} initialVideoUrl={initialVideoUrl} initialMode={initialComposerMode} workspaceId={workspaceId} />
          </div>
        )}

        {composerPanelTab === 'strategist' && (
          <div className="px-4 md:px-8 py-6 w-full">
            <InlineContentStrategist userId={userId} onAddToPlanner={handleAddToPlanner} onUpgrade={() => onUpgrade?.()} />
          </div>
        )}
      </div>

      {/* Modals */}
      <PostLogModal key={workspaceId ?? 'personal'} open={logOpen} onClose={() => setLogOpen(false)} userId={userId} initialFilter={logFilter} workspaceId={workspaceId} />

      {addModalOpen && (
        <AddPlannerItemModal
          userId={userId}
          initialDate={addDate}
          prefilled={pendingItem ?? undefined}
          workspaceId={workspaceId}
          onClose={() => { setAddModalOpen(false); setPendingItem(null); }}
          onSaved={() => { setAddModalOpen(false); setPendingItem(null); pendingAddCallback.current?.(); pendingAddCallback.current = undefined; }}
        />
      )}
    </div>
  );
}

// ─── CalendarView ─────────────────────────────────────────────────────────────

function CalendarView({ integrations, userId, workspaceId }: { integrations: PostizIntegration[]; userId: string | null; workspaceId?: string | null }) {
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
      const res   = await fetch(`${SUPABASE_URL}/functions/v1/ayrshare-scheduled?userId=${encodeURIComponent(userId)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}${workspaceId ? `&workspaceId=${encodeURIComponent(workspaceId)}` : ''}`);
      const data  = res.ok ? await res.json() : { posts: [] };
      const list  = Array.isArray(data?.posts) ? data.posts : [];
      setPosts(list.map((p: any) => {
        const scheduledAt = new Date(p.scheduledAt);
        return { id: p.id, content: p.content || '', platforms: Array.isArray(p.platforms) ? p.platforms : [], scheduledAt, status: resolveStatus(p.status || 'scheduled', scheduledAt) };
      }));
    } catch (e) {}
    finally { setLoading(false); }
  }, [userId, year, month, workspaceId]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const STATUS_COLOR = (s: string) => s === 'published' ? '#22c55e' : s === 'failed' ? '#ef4444' : GOLD;

  const postsOnDay = (day: number) =>
    posts.filter(p => {
      const d = p.scheduledAt;
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    }).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  return (
    <div className="flex flex-col flex-1 min-h-0">
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

      <div className="flex-1 overflow-y-auto pb-20 md:pb-0 grid grid-cols-7" style={{ gridAutoRows: 'minmax(72px, 1fr)' }}>
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
              <InlinePostComposer integrations={integrations} userId={userId} onSuccess={() => { loadPosts(); setComposerOpen(false); }} workspaceId={workspaceId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AffiliateDashboard ─────────────────────────────────────────────────────────

function AffiliateDashboard({ userId, userEmail, userName }: { userId: string | null; userEmail: string | null; userName?: string | null }) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [customCodeInput, setCustomCodeInput] = React.useState('');
  const [codeStatus, setCodeStatus] = React.useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [codeError, setCodeError] = React.useState('');
  const [showCodeEditor, setShowCodeEditor] = React.useState(false);

  // Payout state
  const [payoutData, setPayoutData] = React.useState<any>(null);
  const [payoutOpen, setPayoutOpen] = React.useState(false);
  const [payoutMethod, setPayoutMethod] = React.useState<'paypal' | 'bank_transfer'>('paypal');
  const [paypalEmail, setPaypalEmail] = React.useState('');
  const [bankName, setBankName] = React.useState('');
  const [bankAccountName, setBankAccountName] = React.useState('');
  const [bankAccountNumber, setBankAccountNumber] = React.useState('');
  const [bankRoutingNumber, setBankRoutingNumber] = React.useState('');
  const [payoutSubmitting, setPayoutSubmitting] = React.useState(false);
  const [payoutError, setPayoutError] = React.useState('');
  const [payoutSuccess, setPayoutSuccess] = React.useState('');

  const defaultCode = React.useMemo(() => {
    const raw = userName || (userEmail ? userEmail.split('@')[0] : '');
    return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16) || '';
  }, [userName, userEmail]);

  const fetchStats = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { Authorization: `Bearer ${session?.access_token}` };
      const [statsRes, payoutRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/functions/v1/referral-stats`, { headers }),
        fetch(`${SUPABASE_URL}/functions/v1/affiliate-payout`, { headers }),
      ]);
      if (statsRes.ok) {
        const json = await statsRes.json();
        setData(json);
        setCustomCodeInput(json.customCode ?? defaultCode);
      }
      if (payoutRes.ok) {
        setPayoutData(await payoutRes.json());
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  React.useEffect(() => { fetchStats(); }, [userId]);

  const copyLink = () => {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const saveCustomCode = async () => {
    const trimmed = customCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!trimmed || trimmed.length < 3) { setCodeError('Must be at least 3 characters'); return; }
    if (trimmed.length > 16) { setCodeError('Max 16 characters'); return; }
    setCodeStatus('saving'); setCodeError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/referral-stats`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ customCode: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) { setCodeError(json.error ?? 'Failed to save'); setCodeStatus('error'); return; }
      setCodeStatus('success'); setShowCodeEditor(false);
      await fetchStats();
      setTimeout(() => setCodeStatus('idle'), 2000);
    } catch (e: any) { setCodeError(e.message); setCodeStatus('error'); }
  };

  const handlePayoutSubmit = async () => {
    setPayoutError(''); setPayoutSuccess('');
    if (payoutMethod === 'paypal' && !paypalEmail.trim()) { setPayoutError('Enter your PayPal email.'); return; }
    if (payoutMethod === 'bank_transfer') {
      if (!bankAccountName.trim()) { setPayoutError('Enter account holder name.'); return; }
      if (!bankAccountNumber.trim()) { setPayoutError('Enter account number.'); return; }
      if (!bankRoutingNumber.trim()) { setPayoutError('Enter routing number.'); return; }
      if (!bankName.trim()) { setPayoutError('Enter bank name.'); return; }
    }
    setPayoutSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/affiliate-payout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: payoutMethod, paypalEmail, bankAccountName, bankAccountNumber, bankRoutingNumber, bankName }),
      });
      const json = await res.json();
      if (!res.ok) { setPayoutError(json.error || 'Failed to submit request.'); return; }
      setPayoutSuccess('Payout request submitted! We process payouts within 3-5 business days.');
      await fetchStats();
      setTimeout(() => { setPayoutOpen(false); setPayoutSuccess(''); }, 3000);
    } catch (e: any) { setPayoutError(e.message || 'Something went wrong.'); }
    finally { setPayoutSubmitting(false); }
  };

  if (!userId) return (
    <div className="flex-1 flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
      Sign in to access the Affiliate Program
    </div>
  );

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${GOLD}40`, borderTopColor: GOLD }} />
    </div>
  );

  const totalEarned     = ((data?.totalEarnedCents ?? 0) / 100).toFixed(2);
  const availablePayout = ((payoutData?.availableCents ?? 0) / 100).toFixed(2);
  const effectiveCode   = data?.referralCode ?? '';
  const canRequest      = payoutData?.canRequest ?? false;
  const pendingPayout   = payoutData?.pendingPayout ?? null;
  const minPayout       = ((payoutData?.minimumPayoutCents ?? 2500) / 100).toFixed(2);

  const STATUS_COLOR = (s: string) =>
    s === 'paid' ? 'rgb(74,222,128)' : s === 'processing' ? GOLD_L : s === 'rejected' ? '#fca5a5' : 'rgba(255,255,255,0.5)';
  const STATUS_BG = (s: string) =>
    s === 'paid' ? 'rgba(74,222,128,0.1)' : s === 'processing' ? `${GOLD}18` : s === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)';
  const STATUS_BORDER = (s: string) =>
    s === 'paid' ? 'rgba(74,222,128,0.25)' : s === 'processing' ? `${GOLD}40` : s === 'rejected' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)';

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-8 space-y-5" style={{ background: BG }}>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: GOLD }}><rect x="1" y="4" width="22" height="16" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M1 9h3M20 9h3M1 15h3M20 15h3"/></svg>
          <h2 className="text-lg font-black text-white">2 for 20 Affiliate Program</h2>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
          Share your link. Earn 20% recurring commission every month they stay subscribed, forever. They get 20% off their first month automatically.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Earned', value: `$${totalEarned}`, icon: <DollarSign className="w-4 h-4" /> },
          { label: 'Available', value: `$${availablePayout}`, icon: <TrendingUp className="w-4 h-4" /> },
          { label: 'Active Referrals', value: data?.activeReferrals ?? 0, icon: <Users className="w-4 h-4" /> },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 flex flex-col gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-1.5" style={{ color: GOLD }}>{s.icon}</div>
            <div className="text-xl font-black text-white">{s.value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Payout Request Card */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: `linear-gradient(135deg, ${GOLD}10, rgba(255,255,255,0.02))`, border: `1px solid ${GOLD}30` }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-black text-white">Request Payout</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Minimum ${minPayout} · Processed within 3-5 business days
            </div>
          </div>
          {pendingPayout ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: `${GOLD}18`, color: GOLD_L, border: `1px solid ${GOLD}40` }}>
              <Loader className="w-3 h-3 animate-spin" />
              ${(pendingPayout.amount_cents / 100).toFixed(2)} Pending
            </div>
          ) : canRequest ? (
            <button onClick={() => setPayoutOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000' }}>
              <DollarSign className="w-4 h-4" /> Request ${availablePayout}
            </button>
          ) : (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'right', maxWidth: 160 }}>
              {parseFloat(availablePayout) === 0
                ? 'No earnings yet'
                : `Need $${minPayout} minimum · $${availablePayout} available`}
            </div>
          )}
        </div>

        {/* Payout history */}
        {(payoutData?.payouts?.length ?? 0) > 0 && (
          <div className="space-y-2 pt-2 border-t" style={{ borderColor: `${GOLD}20` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Payout History</div>
            {payoutData.payouts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                  <div className="text-sm font-bold text-white">${(p.amount_cents / 100).toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    {p.method === 'paypal' ? `PayPal · ${p.paypal_email}` : `Bank Transfer · ${p.bank_name}`} · {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  {p.admin_notes && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{p.admin_notes}</div>}
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold capitalize"
                  style={{ background: STATUS_BG(p.status), color: STATUS_COLOR(p.status), border: `1px solid ${STATUS_BORDER(p.status)}` }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Referral link card */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-1">
          <span style={{ fontSize: 12, fontWeight: 700, color: GOLD_L, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Referral Link</span>
          <button onClick={() => setShowCodeEditor(!showCodeEditor)}
            className="text-xs px-2.5 py-1 rounded-lg transition"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {data?.customCode ? 'Edit Code' : 'Custom Code'}
          </button>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg px-3 py-2.5 text-xs font-mono truncate" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            {data?.referralLink ?? 'Generating...'}
          </div>
          <button onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold transition"
            style={{ background: copied ? 'rgba(74,222,128,0.15)' : `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: copied ? 'rgb(74,222,128)' : '#000', border: copied ? '1px solid rgba(74,222,128,0.3)' : 'none', whiteSpace: 'nowrap' }}>
            {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            Code: <span style={{ color: GOLD, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.1em' }}>{effectiveCode || '—'}</span>
          </p>
          {data?.customCode && (
            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: `${GOLD}20`, color: GOLD, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Custom</span>
          )}
        </div>
        {showCodeEditor && (
          <div className="rounded-lg p-3 space-y-2 mt-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Set a custom code (3-16 letters/numbers).</p>
            <div className="flex gap-2">
              <input value={customCodeInput} onChange={e => setCustomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder={data?.systemCode ?? 'e.g. JOHN20'} maxLength={16}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-mono"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${codeStatus === 'error' ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`, color: '#fff', outline: 'none' }} />
              <button onClick={saveCustomCode} disabled={codeStatus === 'saving'}
                className="px-4 py-2 rounded-lg text-xs font-bold"
                style={{ background: codeStatus === 'success' ? 'rgba(74,222,128,0.2)' : `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: codeStatus === 'success' ? 'rgb(74,222,128)' : '#000', opacity: codeStatus === 'saving' ? 0.6 : 1 }}>
                {codeStatus === 'saving' ? 'Saving...' : codeStatus === 'success' ? '✓ Saved' : 'Save'}
              </button>
            </div>
            {codeError && <p style={{ fontSize: 11, color: 'rgb(239,68,68)' }}>{codeError}</p>}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>How It Works</p>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Share your link. Anyone who clicks it gets tagged as your referral.' },
            { step: '2', text: 'They sign up and get 20% off their first month automatically at checkout.' },
            { step: '3', text: 'You earn 20% of every payment they make, every month, for as long as they stay subscribed.' },
            { step: '4', text: 'Request a payout once you hit $25. We process via PayPal or bank transfer within 3-5 business days.' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-black" style={{ background: `${GOLD}25`, color: GOLD }}>{s.step}</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referrals table */}
      {(data?.referrals?.length ?? 0) > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Referrals ({data.referrals.length})</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {data.referrals.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{r.referred_email ?? 'Unknown'}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background: r.status === 'active' ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.06)', color: r.status === 'active' ? 'rgb(74,222,128)' : 'rgba(255,255,255,0.35)', border: `1px solid ${r.status === 'active' ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.1)'}` }}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commission history */}
      {(data?.commissions?.length ?? 0) > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Commission History</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {data.commissions.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>${(c.amount_cents / 100).toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{c.period_start ? new Date(c.period_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : new Date(c.created_at).toLocaleDateString()}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background: c.status === 'paid' ? 'rgba(74,222,128,0.1)' : `${GOLD}15`, color: c.status === 'paid' ? 'rgb(74,222,128)' : GOLD, border: `1px solid ${c.status === 'paid' ? 'rgba(74,222,128,0.25)' : `${GOLD}30`}` }}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data?.referrals?.length ?? 0) === 0 && (
        <div className="rounded-xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Users className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>No referrals yet</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Share your link above to start earning</p>
        </div>
      )}

      {/* ── Payout Request Modal ── */}
      {payoutOpen && (
        <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setPayoutOpen(false); setPayoutError(''); setPayoutSuccess(''); }} />
          <div className="relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl border shadow-2xl flex flex-col"
            style={{ background: '#111', borderColor: `${GOLD}40`, maxHeight: '90dvh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div>
                <div className="text-base font-black text-white">Request Payout</div>
                <div className="text-xs mt-0.5" style={{ color: GOLD }}>
                  ${availablePayout} available
                </div>
              </div>
              <button onClick={() => { setPayoutOpen(false); setPayoutError(''); setPayoutSuccess(''); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Method selector */}
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-2">Payout Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['paypal', '💳 PayPal'], ['bank_transfer', '🏦 Bank Transfer']] as const).map(([m, label]) => (
                    <button key={m} onClick={() => setPayoutMethod(m)}
                      className="py-2.5 rounded-xl text-sm font-bold border transition"
                      style={{ borderColor: payoutMethod === m ? GOLD : 'rgba(255,255,255,0.1)', background: payoutMethod === m ? `${GOLD}18` : 'transparent', color: payoutMethod === m ? GOLD_L : 'rgba(255,255,255,0.4)' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {payoutMethod === 'paypal' && (
                <div>
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-1.5">PayPal Email *</label>
                  <input value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)} type="email"
                    placeholder="your@paypal.com"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.12)` }} />
                </div>
              )}

              {payoutMethod === 'bank_transfer' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-1.5">Account Holder Name *</label>
                    <input value={bankAccountName} onChange={e => setBankAccountName(e.target.value)}
                      placeholder="Full name on account"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-1.5">Bank Name *</label>
                    <input value={bankName} onChange={e => setBankName(e.target.value)}
                      placeholder="e.g. Chase, Bank of America"
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-1.5">Account Number *</label>
                      <input value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)}
                        placeholder="••••••••••"
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-1.5">Routing Number *</label>
                      <input value={bankRoutingNumber} onChange={e => setBankRoutingNumber(e.target.value)}
                        placeholder="••••••••••"
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }} />
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                💡 Your full available balance of <strong style={{ color: GOLD }}>${availablePayout}</strong> will be paid out. Processed within 3-5 business days. You'll receive a confirmation once sent.
              </div>

              {payoutError && <p className="text-xs text-red-400">{payoutError}</p>}
              {payoutSuccess && <p className="text-xs text-green-400 font-bold">{payoutSuccess}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setPayoutOpen(false); setPayoutError(''); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white/40 hover:text-white hover:bg-white/8 transition border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  Cancel
                </button>
                <button onClick={handlePayoutSubmit} disabled={payoutSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000' }}>
                  {payoutSubmitting ? 'Submitting…' : `Request $${availablePayout}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── AIVideoStudio ───────────────────────────────────────────────────────────

type VideoStudioStep = 'brief' | 'prompts' | 'frames' | 'video' | 'done';
type VideoPrompt = { id: string; text: string; selected: boolean; };
type GeneratedFrame = { id: string; promptText: string; imageUrl: string | null; taskId: string | null; status: 'idle'|'generating'|'done'|'error'; error?: string; };
type GeneratedVideo = { id: string; frameUrl: string; promptText: string; videoUrl: string | null; taskId: string | null; status: 'idle'|'generating'|'polling'|'done'|'error'; error?: string; };
type VideoHistoryItem = { id: string; createdAt: string; brief: string; videoUrl: string; thumbnailUrl?: string; };

function AIVideoStudio({ userId, onUseVideo, subscription, onUpgrade }: {
  userId: string | null;
  onUseVideo?: (videoUrl: string) => void;
  subscription: { plan: string; status: string; stripe_customer_id?: string; } | null;
  onUpgrade: () => void;
}) {
  const [step, setStep]               = React.useState<VideoStudioStep>('brief');
  // Single combined frame mode for start + end
  const [frameMode, setFrameMode] = React.useState<'none' | 'manual' | 'ai'>('none');
  const [startFrameUrl, setStartFrameUrl] = React.useState<string | null>(null);
  const [endFrameUrl, setEndFrameUrl]     = React.useState<string | null>(null);
  const startFrameRef = React.useRef<HTMLInputElement>(null);
  const endFrameRef   = React.useRef<HTMLInputElement>(null);
  // AI-generated frames (shown in review step)
  const [generatedStartFrameUrl, setGeneratedStartFrameUrl] = React.useState<string | null>(null);
  const [generatedEndFrameUrl, setGeneratedEndFrameUrl]     = React.useState<string | null>(null);
  const [midFrame1Url, setMidFrame1Url] = React.useState<string | null>(null);
  const [midFrame2Url, setMidFrame2Url] = React.useState<string | null>(null);
  const midFrame1Ref = React.useRef<HTMLInputElement>(null);
  const midFrame2Ref = React.useRef<HTMLInputElement>(null);
  // Transcript mode: manual paste | AI generated from brief | none
  const [transcriptMode, setTranscriptMode] = React.useState<'manual' | 'ai' | 'none'>('none');
  const [manualTranscript, setManualTranscript] = React.useState('');
  const [videoTranscript, setVideoTranscript]   = React.useState<string | null>(null);
  const [generatingAssets, setGeneratingAssets] = React.useState(false);
  const [editablePrompt, setEditablePrompt]     = React.useState('');
  const [editableTranscript, setEditableTranscript] = React.useState('');
  const [brief, setBrief]             = React.useState('');
  const [style, setStyle]             = React.useState('cinematic');
  const [aspectRatio, setAspectRatio] = React.useState('16:9');
  const [duration, setDuration]       = React.useState('5');
  const [prompts, setPrompts]         = React.useState<VideoPrompt[]>([]);
  const [frames, setFrames]           = React.useState<GeneratedFrame[]>([]);
  const [videos, setVideos]           = React.useState<GeneratedVideo[]>([]);
  const [history, setHistory]         = React.useState<VideoHistoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('mm_video_history') || '[]'); } catch { return []; }
  });
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [generatingPrompts, setGeneratingPrompts] = React.useState(false);
  const [textOnScreen, setTextOnScreen]           = React.useState(false);
  const [textOnScreenContent, setTextOnScreenContent] = React.useState('');
  const [fontColor, setFontColor]                 = React.useState('#FFFFFF');
  const pollTimers = React.useRef<Record<string, ReturnType<typeof setInterval>>>({});

  React.useEffect(() => { return () => { Object.values(pollTimers.current).forEach(clearInterval); }; }, []);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const addToHistory = (brief: string, videoUrl: string, thumbnailUrl?: string) => {
    const item: VideoHistoryItem = { id: Date.now().toString(), createdAt: new Date().toISOString(), brief, videoUrl, thumbnailUrl };
    setHistory(prev => {
      const next = [item, ...prev].slice(0, 20);
      try { localStorage.setItem('mm_video_history', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const pollFrameTask = (frameId: string, taskId: string) => {
    let attempts = 0;
    const iv = setInterval(async () => {
      attempts++;
      if (attempts > 60) {
        clearInterval(iv); delete pollTimers.current[frameId];
        setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'error', error: 'Timed out' } : f));
        return;
      }
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/fal-poll`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ taskId, type: 'image' }),
        });
        const data = await res.json();
        if (data.status === 'succeed' && data.imageUrl) {
          clearInterval(iv); delete pollTimers.current[frameId];
          setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'done', imageUrl: data.imageUrl } : f));
        } else if (data.status === 'failed') {
          clearInterval(iv); delete pollTimers.current[frameId];
          setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'error', error: data.error || 'Failed' } : f));
        }
      } catch {}
    }, 3000);
    pollTimers.current[frameId] = iv;
  };

  const pollVideoTask = (videoId: string, taskId: string, brief: string, thumbnailUrl?: string) => {
    let attempts = 0;
    const iv = setInterval(async () => {
      attempts++;
      if (attempts > 120) {
        clearInterval(iv); delete pollTimers.current[videoId];
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'error', error: 'Timed out' } : v));
        return;
      }
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/fal-poll`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ taskId, type: 'video' }),
        });
        const data = await res.json();
        if (data.status === 'succeed' && data.videoUrl) {
          clearInterval(iv); delete pollTimers.current[videoId];
          setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'done', videoUrl: data.videoUrl } : v));
          addToHistory(brief, data.videoUrl, thumbnailUrl);
          setStep('done');
        } else if (data.status === 'failed') {
          clearInterval(iv); delete pollTimers.current[videoId];
          setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'error', error: data.error || 'Failed' } : v));
        }
      } catch {}
    }, 5000);
    pollTimers.current[videoId] = iv;
  };

  const handleGeneratePrompts = async () => {
    if (!brief.trim()) { setGlobalError('Enter a video brief first'); return; }
    if (!userId) { setGlobalError('Sign in to generate AI video'); return; }
    const isPromo = subscription?.stripe_customer_id?.startsWith('promo_');
    const isTrialing = subscription?.status === 'trialing' && !!subscription?.current_period_end && new Date(subscription.current_period_end) > new Date();
    const isActive = subscription?.status === 'active' || isPromo || isTrialing;
    if (!isActive) { onUpgrade(); return; }
    setGeneratingPrompts(true); setGeneratingAssets(false); setGlobalError(null);

    // Resolve manual transcript immediately (no async needed)
    if (transcriptMode === 'manual' && manualTranscript.trim()) {
      setVideoTranscript(manualTranscript.trim());
    }

    const hasAiAssets = transcriptMode === 'ai' || frameMode === 'ai';

    try {
      const headers = await getAuthHeaders();

      // 1. Always enhance the brief into a high-quality cinematic video prompt via Claude
      const promptRes = await fetch(`${SUPABASE_URL}/functions/v1/kling-generate-prompts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ brief, style, aspectRatio, duration, textOnScreen, textOnScreenContent: textOnScreen ? textOnScreenContent : undefined, fontColor: textOnScreen ? fontColor : undefined }),
      });
      const promptData = await promptRes.json();
      if (!promptRes.ok) throw new Error(promptData.error || 'Failed to enhance brief');
      const enhancedPrompt: string = (promptData.prompts || [])[0] ?? brief;
      setPrompts([{ id: 'p0', text: enhancedPrompt, selected: true }]);
      setEditablePrompt(enhancedPrompt);

      if (!hasAiAssets) {
        // No AI assets requested — skip review step, go straight to confirm + generate
        setStep('prompts');
        return;
      }

      // 2. Run AI asset generation in parallel
      setGeneratingAssets(true);

      const aiTasks: Promise<void>[] = [];

      // AI Transcript: generate a video script from the brief using Claude
      if (transcriptMode === 'ai') {
        aiTasks.push((async () => {
          try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-captions`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify({ mode: 'video_script', description: brief, tone: style }),
            });
            const data = await res.json();
            // Accept script from various response shapes
            const script: string =
              data.script || data.transcript ||
              data.captions?.script || data.captions?.instagram ||
              (typeof data.captions === 'object' ? Object.values(data.captions)[0] : null) ||
              enhancedPrompt;
            const resolved = typeof script === 'string' ? script : enhancedPrompt;
            setVideoTranscript(resolved);
            setEditableTranscript(resolved);
          } catch {
            // Fallback: use the enhanced prompt as the script
            setVideoTranscript(enhancedPrompt);
            setEditableTranscript(enhancedPrompt);
          }
        })());
      }

      // AI Frames: generate start AND end frame images in parallel
      if (frameMode === 'ai') {
        const startPrompt = `${enhancedPrompt} — opening frame, establishing shot`;
        const endPrompt   = `${enhancedPrompt} — closing frame, final shot`;

        aiTasks.push((async () => {
          try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/kling-generate-image`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify({ prompt: startPrompt, aspectRatio }),
            });
            const data = await res.json();
            if (data.imageUrl) setGeneratedStartFrameUrl(data.imageUrl);
            else if (data.taskId) {
              // Poll for the image
              await new Promise<void>((resolve) => {
                let attempts = 0;
                const iv = setInterval(async () => {
                  attempts++;
                  if (attempts > 40) { clearInterval(iv); resolve(); return; }
                  try {
                    const pr = await fetch(`${SUPABASE_URL}/functions/v1/fal-poll`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
                      body: JSON.stringify({ taskId: data.taskId, type: 'image' }),
                    });
                    const pd = await pr.json();
                    if (pd.status === 'succeed' && pd.imageUrl) { clearInterval(iv); setGeneratedStartFrameUrl(pd.imageUrl); resolve(); }
                    else if (pd.status === 'failed') { clearInterval(iv); resolve(); }
                  } catch { clearInterval(iv); resolve(); }
                }, 3000);
              });
            }
          } catch { /* non-fatal */ }
        })());

        aiTasks.push((async () => {
          try {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/kling-generate-image`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify({ prompt: endPrompt, aspectRatio }),
            });
            const data = await res.json();
            if (data.imageUrl) setGeneratedEndFrameUrl(data.imageUrl);
            else if (data.taskId) {
              await new Promise<void>((resolve) => {
                let attempts = 0;
                const iv = setInterval(async () => {
                  attempts++;
                  if (attempts > 40) { clearInterval(iv); resolve(); return; }
                  try {
                    const pr = await fetch(`${SUPABASE_URL}/functions/v1/fal-poll`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
                      body: JSON.stringify({ taskId: data.taskId, type: 'image' }),
                    });
                    const pd = await pr.json();
                    if (pd.status === 'succeed' && pd.imageUrl) { clearInterval(iv); setGeneratedEndFrameUrl(pd.imageUrl); resolve(); }
                    else if (pd.status === 'failed') { clearInterval(iv); resolve(); }
                  } catch { clearInterval(iv); resolve(); }
                }, 3000);
              });
            }
          } catch { /* non-fatal */ }
        })());
      }

      await Promise.all(aiTasks);
      setStep('prompts');
    } catch (e: any) { setGlobalError(e.message); setStep('brief'); }
    finally { setGeneratingPrompts(false); setGeneratingAssets(false); }
  };

  const handleConfirmAndGenerate = async () => {
    const promptText = editablePrompt.trim() || (prompts[0]?.text ?? brief);
    if (!promptText) { setGlobalError('No prompt to generate from'); return; }
    // Commit edited transcript
    const finalTranscript = transcriptMode === 'manual'
      ? (manualTranscript.trim() || null)
      : (editableTranscript.trim() || videoTranscript || null);
    setVideoTranscript(finalTranscript);
    setGlobalError(null);
    const headers = await getAuthHeaders();

    // Resolve the best start/end frame URLs
    const resolvedStartUrl = frameMode === 'ai'
      ? (generatedStartFrameUrl || null)
      : (frameMode === 'manual' ? startFrameUrl : null);
    const resolvedEndUrl = frameMode === 'ai'
      ? (generatedEndFrameUrl || null)
      : (frameMode === 'manual' ? endFrameUrl : null);

    // Build enriched prompt mentioning middle frames for better coherence
    const midFrameNote = [midFrame1Url, midFrame2Url].filter(Boolean).length > 0
      ? ` Smoothly transition through ${[midFrame1Url, midFrame2Url].filter(Boolean).length} intermediate scene(s) maintaining visual continuity.`
      : '';
    const enrichedPrompt = promptText + midFrameNote;

    if (resolvedStartUrl) {
      const frameId = `f${Date.now()}-p0`;
      setFrames([{ id: frameId, promptText: enrichedPrompt, imageUrl: resolvedStartUrl, taskId: null, status: 'done' }]);
      setStep('frames');
      await autoGenerateVideo(frameId, resolvedStartUrl, enrichedPrompt, headers, null, resolvedEndUrl);
    } else {
      // No start frame — text-to-video
      setStep('video');
      const vidId = `v${Date.now()}-noframe`;
      setVideos([{ id: vidId, frameUrl: '', promptText, videoUrl: null, taskId: null, status: 'generating' }]);
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/fal-generate-video`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ prompt: promptText, duration, aspectRatio, quality: 'high', textToVideo: true }),
        });
        const data = await res.json();
        if (data.error === 'upgrade_required') { setVideos(prev => prev.map(v => v.id === vidId ? { ...v, status: 'error', error: 'Plan required' } : v)); setStep('brief'); onUpgrade(); return; }
        if (data.error === 'limit_reached') { setVideos(prev => prev.map(v => v.id === vidId ? { ...v, status: 'error', error: data.message || 'Video limit reached' } : v)); setStep('brief'); setGlobalError(data.message || 'Video limit reached this month. Add more seconds or upgrade your plan.'); return; }
        if (!res.ok) throw new Error(data.error || 'Failed to generate video');
        if (data.requestId) {
          setVideos(prev => prev.map(v => v.id === vidId ? { ...v, taskId: data.requestId, status: 'polling' } : v));
          pollFalVideoTask(vidId, data.requestId, data.model, promptText, '', headers, data.statusUrl, data.responseUrl);
        }
      } catch (e: any) {
        setVideos(prev => prev.map(v => v.id === vidId ? { ...v, status: 'error', error: e.message } : v));
        setGlobalError(e.message);
      }
    }
  };

  const autoGenerateVideo = async (frameId: string, imageUrl: string, promptText: string, headers: Record<string, string>, overrideStartUrl?: string | null, tailUrl?: string | null) => {
    const effectiveImageUrl = overrideStartUrl || imageUrl;
    setStep('video');
    const vidId = `v${Date.now()}-${frameId}`;
    const newVideo: GeneratedVideo = { id: vidId, frameUrl: effectiveImageUrl, promptText, videoUrl: null, taskId: null, status: 'generating' };
    setVideos([newVideo]);
    try {
      const falBody: Record<string, unknown> = { imageUrl: effectiveImageUrl, prompt: promptText, duration, aspectRatio, quality: 'high' };
      if (tailUrl) falBody.tailImageUrl = tailUrl;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/fal-generate-video`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(falBody),
      });
      const data = await res.json();
      if (data.error === 'upgrade_required') { setVideos(prev => prev.map(v => v.id === vidId ? { ...v, status: 'error', error: 'Plan required' } : v)); setStep('brief'); onUpgrade(); return; }
      if (data.error === 'limit_reached') { setVideos(prev => prev.map(v => v.id === vidId ? { ...v, status: 'error', error: data.message || 'Video limit reached' } : v)); setStep('brief'); setGlobalError(data.message || 'Video limit reached this month.'); return; }
      if (!res.ok) throw new Error(data.error || 'Failed to generate video');
      if (data.requestId) {
        setVideos(prev => prev.map(v => v.id === vidId ? { ...v, taskId: data.requestId, status: 'polling' } : v));
        pollFalVideoTask(vidId, data.requestId, data.model, promptText, imageUrl, headers, data.statusUrl, data.responseUrl);
      }
    } catch (e: any) {
      setVideos(prev => prev.map(v => v.id === vidId ? { ...v, status: 'error', error: e.message } : v));
      setGlobalError(e.message);
    }
  };

  const autoGenerateAudio = async (vidId: string, videoUrl: string, briefText: string, frameUrl: string, headers: Record<string, string>) => {
    setStep('done'); // show done step while audio generates in background
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/kling-generate-audio`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ videoUrl }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        // Audio failed - still save the silent video, don't block the user
        console.warn('Audio generation failed:', data.error);
        addToHistory(briefText, videoUrl, frameUrl);
        return;
      }
      if (data.taskId) {
        // Poll for audio completion
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          if (attempts > 60) {
            clearInterval(interval);
            // Timed out - save silent video anyway
            addToHistory(briefText, videoUrl, frameUrl);
            return;
          }
          try {
            const pr = await fetch(`${SUPABASE_URL}/functions/v1/fal-poll`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify({ taskId: data.taskId, type: 'audio' }),
            });
            const pd = await pr.json();
            if (pd.status === 'succeed' && pd.videoUrl) {
              clearInterval(interval);
              // Replace silent video with audio version
              setVideos(prev => prev.map(v => v.id === vidId ? { ...v, videoUrl: pd.videoUrl } : v));
              addToHistory(briefText, pd.videoUrl, frameUrl);
            } else if (pd.status === 'failed') {
              clearInterval(interval);
              // Audio failed - save silent video
              addToHistory(briefText, videoUrl, frameUrl);
            }
          } catch {}
        }, 3000);
      }
    } catch (e) {
      // Audio error - save silent video anyway
      addToHistory(briefText, videoUrl, frameUrl);
    }
  };

  const pollFrameTaskAuto = (frameId: string, taskId: string, promptText: string, headers: Record<string, string>) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 60) {
        clearInterval(interval);
        setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'error', error: 'Timed out' } : f));
        setGlobalError('Frame generation timed out');
        return;
      }
      try {
        const pr = await fetch(`${SUPABASE_URL}/functions/v1/fal-poll`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ taskId, type: 'image' }),
        });
        const pd = await pr.json();
        if (pd.status === 'succeed' && pd.imageUrl) {
          clearInterval(interval);
          setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'done', imageUrl: pd.imageUrl } : f));
          await autoGenerateVideo(frameId, pd.imageUrl, promptText, headers);
        } else if (pd.status === 'failed') {
          clearInterval(interval);
          setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'error', error: 'Generation failed' } : f));
          setGlobalError('Frame generation failed');
        }
      } catch {}
    }, 3000);
    pollTimers.current[frameId] = interval;
  };

  const handleGenerateFrames = async () => {
    const selected = prompts.filter(p => p.selected);
    if (!selected.length) { setGlobalError('Select at least one prompt'); return; }
    setGlobalError(null);
    const newFrames: GeneratedFrame[] = selected.map(p => ({ id: `f${Date.now()}-${p.id}`, promptText: p.text, imageUrl: null, taskId: null, status: 'generating' }));
    setFrames(newFrames); setStep('frames');
    const headers = await getAuthHeaders();
    for (const frame of newFrames) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/kling-generate-image`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ prompt: frame.promptText, aspectRatio }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        if (data.imageUrl) {
          setFrames(prev => prev.map(f => f.id === frame.id ? { ...f, status: 'done', imageUrl: data.imageUrl } : f));
        } else if (data.taskId) {
          setFrames(prev => prev.map(f => f.id === frame.id ? { ...f, taskId: data.taskId } : f));
          pollFrameTask(frame.id, data.taskId);
        }
      } catch (e: any) {
        setFrames(prev => prev.map(f => f.id === frame.id ? { ...f, status: 'error', error: e.message } : f));
      }
    }
  };

  const handleGenerateVideos = async () => {
    const doneFr = frames.filter(f => f.status === 'done' && f.imageUrl);
    if (!doneFr.length) { setGlobalError('No completed frames'); return; }
    setGlobalError(null);
    const newVideos: GeneratedVideo[] = doneFr.map(f => ({ id: `v${Date.now()}-${f.id}`, frameUrl: f.imageUrl!, promptText: f.promptText, videoUrl: null, taskId: null, status: 'generating' }));
    setVideos(newVideos); setStep('video');
    const headers = await getAuthHeaders();
    for (const vid of newVideos) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/fal-generate-video`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ imageUrl: vid.frameUrl, prompt: vid.promptText, duration, aspectRatio, quality: 'high' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        if (data.requestId) {
          setVideos(prev => prev.map(v => v.id === vid.id ? { ...v, taskId: data.requestId, status: 'polling' } : v));
          pollFalVideoTask(vid.id, data.requestId, data.model, vid.promptText, vid.frameUrl, await getAuthHeaders(), data.statusUrl, data.responseUrl);
        }
      } catch (e: any) {
        setVideos(prev => prev.map(v => v.id === vid.id ? { ...v, status: 'error', error: e.message } : v));
      }
    }
  };

  const pollFalVideoTask = (vidId: string, requestId: string, modelEndpoint: string, promptText: string, frameUrl: string, headers: Record<string, string>, statusUrl?: string, responseUrl?: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 120) {
        clearInterval(interval);
        setVideos(prev => prev.map(v => v.id === vidId ? { ...v, status: 'error', error: 'Timed out' } : v));
        setGlobalError('Video generation timed out');
        return;
      }
      try {
        const pr = await fetch(`${SUPABASE_URL}/functions/v1/fal-poll`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ requestId, modelEndpoint, statusUrl, responseUrl }),
        });
        const pd = await pr.json();
        if (pd.status === 'succeed' && pd.videoUrl) {
          clearInterval(interval);
          setVideos(prev => prev.map(v => v.id === vidId ? { ...v, status: 'done', videoUrl: pd.videoUrl } : v));
          addToHistory(brief, pd.videoUrl, frameUrl);
          setStep('done'); // Audio already baked into video by Kling 3.0 Pro
        } else if (pd.status === 'failed') {
          clearInterval(interval);
          setVideos(prev => prev.map(v => v.id === vidId ? { ...v, status: 'error', error: pd.error || 'Failed' } : v));
          setGlobalError(pd.error || 'Video generation failed');
        }
      } catch {}
    }, 5000);
    pollTimers.current[vidId] = interval;
  };

    const handleFrameUpload = (type: 'start' | 'end' | 'mid1' | 'mid2', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (type === 'start') setStartFrameUrl(dataUrl);
      else if (type === 'end') setEndFrameUrl(dataUrl);
      else if (type === 'mid1') setMidFrame1Url(dataUrl);
      else setMidFrame2Url(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const resetStudio = () => {
    Object.values(pollTimers.current).forEach(clearInterval);
    pollTimers.current = {};
    setStep('brief'); setBrief(''); setPrompts([]); setFrames([]); setVideos([]); setGlobalError(null);
    setFrameMode('none'); setStartFrameUrl(null); setEndFrameUrl(null);
    setGeneratedStartFrameUrl(null); setGeneratedEndFrameUrl(null);
    setMidFrame1Url(null); setMidFrame2Url(null);
    setTranscriptMode('none'); setManualTranscript('');
    setVideoTranscript(null); setEditablePrompt(''); setEditableTranscript(''); setGeneratingAssets(false);
  };

  const handleDownloadVideo = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `ai-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch {
      window.open(url, '_blank');
    }
  };

  const STYLES = ['cinematic','documentary','commercial','anime','realistic','voiceover'];
  const allFramesDone = frames.length > 0 && frames.every(f => f.status === 'done' || f.status === 'error');

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto space-y-6">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Film className="w-5 h-5" style={{ color: GOLD }} /> AI Video Studio
              </h2>
              <p className="text-xs text-white/40 mt-0.5">Turn a brief into AI-generated videos in minutes</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setHistoryOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition hover:bg-white/5"
                style={{ borderColor: BORDER, color: historyOpen ? GOLD_L : 'rgba(255,255,255,0.4)' }}>
                <Clock className="w-3.5 h-3.5" /> History ({history.length})
              </button>
              {step !== 'brief' && (
                <button onClick={resetStudio}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition hover:bg-white/5"
                  style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
                  <RefreshCcw className="w-3.5 h-3.5" /> Reset
                </button>
              )}
            </div>
          </div>

          {step !== 'brief' && step !== 'done' && (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full animate-pulse" style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_L})`, width: step === 'prompts' ? '25%' : step === 'frames' ? '55%' : '85%', transition: 'width 0.8s ease' }} />
              </div>
              <p className="text-[10px] text-white/30 text-center">
                {step === 'prompts' ? 'Crafting your scene…' : step === 'frames' ? 'Generating image frame…' : 'Rendering your video…'}
              </p>
            </div>
          )}

          {globalError && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-xs text-red-300 border border-red-400/20 bg-red-400/5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {globalError}
              <button onClick={() => setGlobalError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {step === 'brief' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white/30 uppercase tracking-wider">Video Brief</label>
                <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={4}
                  placeholder="Describe the video you want. E.g. 'A cinematic shot of a lone wolf running through a misty forest at dawn…'"
                  className="mt-1.5 w-full rounded-xl border bg-black/30 px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                  style={{ borderColor: BORDER }} />
              </div>
              <div>
                <label className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2 block">Style</label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <button key={s} onClick={() => setStyle(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border transition capitalize"
                      style={{ borderColor: style === s ? GOLD : BORDER, background: style === s ? `${GOLD}18` : 'transparent', color: style === s ? GOLD_L : 'rgba(255,255,255,0.4)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2 block">Aspect Ratio</label>
                  <div className="flex gap-2">
                    {['16:9','9:16','1:1'].map(r => (
                      <button key={r} onClick={() => setAspectRatio(r)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold border transition"
                        style={{ borderColor: aspectRatio === r ? GOLD : BORDER, background: aspectRatio === r ? `${GOLD}18` : 'transparent', color: aspectRatio === r ? GOLD_L : 'rgba(255,255,255,0.4)' }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2 block">Duration</label>
                  <div className="flex gap-2">
                    {['5','10','15'].map(d => (
                      <button key={d} onClick={() => setDuration(d)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold border transition"
                        style={{ borderColor: duration === d ? GOLD : BORDER, background: duration === d ? `${GOLD}18` : 'transparent', color: duration === d ? GOLD_L : 'rgba(255,255,255,0.4)' }}>
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Transcript */}
              <div>
                <label className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2 block">Transcript / Script</label>
                <div className="flex gap-2 mb-2">
                  {(['none', 'manual', 'ai'] as const).map(m => (
                    <button key={m} onClick={() => setTranscriptMode(m)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold border transition"
                      style={{ borderColor: transcriptMode === m ? GOLD : BORDER, background: transcriptMode === m ? `${GOLD}18` : 'transparent', color: transcriptMode === m ? GOLD_L : 'rgba(255,255,255,0.4)' }}>
                      {m === 'ai' ? 'AI Generated' : m === 'manual' ? 'Manual' : 'None'}
                    </button>
                  ))}
                </div>
                {transcriptMode === 'manual' && (
                  <textarea value={manualTranscript} onChange={e => setManualTranscript(e.target.value)} rows={3}
                    placeholder="Paste your script or transcript here…"
                    className="w-full rounded-xl border bg-black/30 px-3 py-2 text-xs text-white placeholder-white/20 outline-none resize-none"
                    style={{ borderColor: BORDER }} />
                )}
                {transcriptMode === 'ai' && (
                  <p className="text-[10px] text-white/30 px-1">Claude will write a video script from your brief. You can edit it before processing.</p>
                )}
              </div>

              {/* Reference Frames (combined start + end) */}
              <div>
                <label className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2 block">Reference Frames</label>
                <div className="flex gap-2 mb-2">
                  {(['none', 'manual', 'ai'] as const).map(m => (
                    <button key={m} onClick={() => setFrameMode(m)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold border transition"
                      style={{ borderColor: frameMode === m ? GOLD : BORDER, background: frameMode === m ? `${GOLD}18` : 'transparent', color: frameMode === m ? GOLD_L : 'rgba(255,255,255,0.4)' }}>
                      {m === 'ai' ? 'AI Generated' : m === 'manual' ? 'Manual' : 'None'}
                    </button>
                  ))}
                </div>
                {frameMode === 'manual' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Start Frame */}
                      <div>
                        <p className="text-[10px] text-white/25 mb-1.5 font-semibold">🎬 Start Frame</p>
                        <input ref={startFrameRef} type="file" accept="image/*" className="hidden"
                          onChange={e => e.target.files?.[0] && handleFrameUpload('start', e.target.files[0])} />
                        <button onClick={() => startFrameRef.current?.click()}
                          className="w-full rounded-xl border overflow-hidden transition hover:border-white/20"
                          style={{ borderColor: startFrameUrl ? GOLD + '60' : BORDER, aspectRatio: '4/3', background: 'rgba(0,0,0,0.3)' }}>
                          {startFrameUrl
                            ? <img src={startFrameUrl} className="w-full h-full object-cover" alt="Start" />
                            : <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                                <Upload className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
                                <span className="text-[10px] text-white/20">Upload image</span>
                              </div>
                          }
                        </button>
                        {startFrameUrl && <button onClick={() => setStartFrameUrl(null)} className="mt-1 text-[10px] text-white/20 hover:text-white/45 w-full text-center">remove</button>}
                      </div>
                      {/* Mid Frame 1 */}
                      <div>
                        <p className="text-[10px] text-white/25 mb-1.5 font-semibold">🖼 Middle Frame 1 <span className="text-white/15 font-normal">(optional)</span></p>
                        <input ref={midFrame1Ref} type="file" accept="image/*" className="hidden"
                          onChange={e => e.target.files?.[0] && handleFrameUpload('mid1', e.target.files[0])} />
                        <button onClick={() => midFrame1Ref.current?.click()}
                          className="w-full rounded-xl border overflow-hidden transition hover:border-white/20"
                          style={{ borderColor: midFrame1Url ? GOLD + '60' : BORDER, aspectRatio: '4/3', background: 'rgba(0,0,0,0.3)' }}>
                          {midFrame1Url
                            ? <img src={midFrame1Url} className="w-full h-full object-cover" alt="Mid 1" />
                            : <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                                <Upload className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
                                <span className="text-[10px] text-white/20">Upload image</span>
                              </div>
                          }
                        </button>
                        {midFrame1Url && <button onClick={() => setMidFrame1Url(null)} className="mt-1 text-[10px] text-white/20 hover:text-white/45 w-full text-center">remove</button>}
                      </div>
                      {/* Mid Frame 2 */}
                      <div>
                        <p className="text-[10px] text-white/25 mb-1.5 font-semibold">🖼 Middle Frame 2 <span className="text-white/15 font-normal">(optional)</span></p>
                        <input ref={midFrame2Ref} type="file" accept="image/*" className="hidden"
                          onChange={e => e.target.files?.[0] && handleFrameUpload('mid2', e.target.files[0])} />
                        <button onClick={() => midFrame2Ref.current?.click()}
                          className="w-full rounded-xl border overflow-hidden transition hover:border-white/20"
                          style={{ borderColor: midFrame2Url ? GOLD + '60' : BORDER, aspectRatio: '4/3', background: 'rgba(0,0,0,0.3)' }}>
                          {midFrame2Url
                            ? <img src={midFrame2Url} className="w-full h-full object-cover" alt="Mid 2" />
                            : <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                                <Upload className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
                                <span className="text-[10px] text-white/20">Upload image</span>
                              </div>
                          }
                        </button>
                        {midFrame2Url && <button onClick={() => setMidFrame2Url(null)} className="mt-1 text-[10px] text-white/20 hover:text-white/45 w-full text-center">remove</button>}
                      </div>
                      {/* End Frame */}
                      <div>
                        <p className="text-[10px] text-white/25 mb-1.5 font-semibold">🎬 End Frame</p>
                        <input ref={endFrameRef} type="file" accept="image/*" className="hidden"
                          onChange={e => e.target.files?.[0] && handleFrameUpload('end', e.target.files[0])} />
                        <button onClick={() => endFrameRef.current?.click()}
                          className="w-full rounded-xl border overflow-hidden transition hover:border-white/20"
                          style={{ borderColor: endFrameUrl ? GOLD + '60' : BORDER, aspectRatio: '4/3', background: 'rgba(0,0,0,0.3)' }}>
                          {endFrameUrl
                            ? <img src={endFrameUrl} className="w-full h-full object-cover" alt="End" />
                            : <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                                <Upload className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
                                <span className="text-[10px] text-white/20">Upload image</span>
                              </div>
                          }
                        </button>
                        {endFrameUrl && <button onClick={() => setEndFrameUrl(null)} className="mt-1 text-[10px] text-white/20 hover:text-white/45 w-full text-center">remove</button>}
                      </div>
                    </div>
                    {(midFrame1Url || midFrame2Url) && (
                      <p className="text-[10px] text-white/25 px-1">Middle frames guide the AI on visual transitions. The more frames you provide, the more coherent the motion will be.</p>
                    )}
                  </div>
                )}
                {frameMode === 'ai' && (
                  <p className="text-[10px] text-white/30 px-1">AI will generate opening and closing frame images from your brief. Review them before processing.</p>
                )}
              </div>

              {/* Text on Screen */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-white/30 uppercase tracking-wider">Text on Screen</label>
                  <button
                    onClick={() => setTextOnScreen(v => !v)}
                    className="relative w-10 h-5 rounded-full transition"
                    style={{ background: textOnScreen ? GOLD : 'rgba(255,255,255,0.12)' }}>
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow"
                      style={{ transform: textOnScreen ? 'translateX(20px)' : 'translateX(0)' }} />
                  </button>
                </div>
                {textOnScreen && (
                  <div className="space-y-2">
                    <input
                      value={textOnScreenContent}
                      onChange={e => setTextOnScreenContent(e.target.value)}
                      placeholder="Text to overlay on the video…"
                      className="w-full rounded-xl border bg-black/30 px-3 py-2 text-sm text-white placeholder-white/20 outline-none"
                      style={{ borderColor: BORDER }}
                    />
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-white/30 shrink-0">Font Color</label>
                      <div className="flex items-center gap-2">
                        {['#FFFFFF','#000000','#FFD700','#FF4444','#44AAFF','#44FF88'].map(c => (
                          <button key={c} onClick={() => setFontColor(c)}
                            className="w-6 h-6 rounded-full border-2 transition"
                            style={{ background: c, borderColor: fontColor === c ? 'white' : 'transparent' }} />
                        ))}
                        <input type="color" value={fontColor} onChange={e => setFontColor(e.target.value)}
                          className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent"
                          title="Custom color" />
                      </div>
                      <span className="text-xs font-mono text-white/30">{fontColor}</span>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleGeneratePrompts} disabled={generatingPrompts || !brief.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold disabled:opacity-50 transition"
                style={{ background: GOLD, color: '#000' }}>
                {generatingPrompts
                  ? <><Loader className="w-4 h-4 animate-spin" /> {generatingAssets ? 'Generating AI assets…' : 'Enhancing brief…'}</>
                  : <><Wand2 className="w-4 h-4" /> Generate Video Brief</>}
              </button>
            </div>
          )}

          {step === 'prompts' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/30 uppercase tracking-wider">Review & Confirm</span>
                <button onClick={() => setStep('brief')} className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>← Back</button>
              </div>

              {/* Brief summary (no editable prompt shown to user) */}
              <div className="p-3 rounded-xl border" style={{ borderColor: `${GOLD}25`, background: `${GOLD}08` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: GOLD }}>Your Brief</p>
                <p className="text-xs text-white/60 leading-relaxed">{brief}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize" style={{ background: `${GOLD}18`, color: GOLD_L }}>{style}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{aspectRatio}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{duration}s</span>
                  {textOnScreen && textOnScreenContent && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>Text: "{textOnScreenContent}"</span>
                  )}
                </div>
              </div>

              {/* AI-generated transcript — only if transcriptMode === 'ai' */}
              {transcriptMode === 'ai' && (
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1.5">AI-Generated Script</p>
                  {editableTranscript
                    ? <textarea
                        value={editableTranscript}
                        onChange={e => setEditableTranscript(e.target.value)}
                        rows={5}
                        className="w-full rounded-xl border bg-black/30 px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                        style={{ borderColor: 'rgba(74,222,128,0.3)' }}
                      />
                    : <div className="flex items-center gap-2 p-3 rounded-xl border text-xs text-white/30" style={{ borderColor: BORDER }}>
                        <Loader className="w-3.5 h-3.5 animate-spin" /> Generating script…
                      </div>
                  }
                </div>
              )}

              {/* AI-generated frames — only if frameMode === 'ai' */}
              {frameMode === 'ai' && (
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">AI-Generated Frames</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-white/25 mb-1.5 font-semibold">Start Frame</p>
                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: generatedStartFrameUrl ? `${GOLD}50` : BORDER, aspectRatio: '4/3', background: 'rgba(0,0,0,0.3)' }}>
                        {generatedStartFrameUrl
                          ? <img src={generatedStartFrameUrl} className="w-full h-full object-cover" alt="Start" />
                          : <div className="w-full h-full flex items-center justify-center"><Loader className="w-5 h-5 animate-spin" style={{ color: GOLD }} /></div>
                        }
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/25 mb-1.5 font-semibold">End Frame</p>
                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: generatedEndFrameUrl ? `${GOLD}50` : BORDER, aspectRatio: '4/3', background: 'rgba(0,0,0,0.3)' }}>
                        {generatedEndFrameUrl
                          ? <img src={generatedEndFrameUrl} className="w-full h-full object-cover" alt="End" />
                          : <div className="w-full h-full flex items-center justify-center"><Loader className="w-5 h-5 animate-spin" style={{ color: GOLD }} /></div>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={handleConfirmAndGenerate} disabled={!editablePrompt.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold disabled:opacity-50 transition"
                style={{ background: GOLD, color: '#000' }}>
                <CheckCircle2 className="w-4 h-4" /> Confirm & Start Processing
              </button>
            </div>
          )}

          {step === 'frames' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-white/30 uppercase tracking-wider block">Generated Frames</span>
              <div className="grid grid-cols-2 gap-3">
                {frames.map(frame => (
                  <div key={frame.id} className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                    <div className="relative bg-black/40" style={{ aspectRatio: '16/9' }}>
                      {frame.status === 'done' && frame.imageUrl
                        ? <img src={frame.imageUrl} className="w-full h-full object-cover" alt="" />
                        : frame.status === 'error'
                        ? <div className="absolute inset-0 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-red-400" /></div>
                        : <div className="absolute inset-0 flex items-center justify-center"><Loader className="w-5 h-5 animate-spin" style={{ color: GOLD }} /></div>
                      }
                    </div>
                    <div className="p-2">
                      <p className="text-[10px] text-white/40 line-clamp-2">{frame.promptText}</p>
                      {frame.status === 'done' && frame.imageUrl && (
                        <a href={frame.imageUrl} download target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-[10px] font-bold" style={{ color: GOLD }}>
                          <Download className="w-3 h-3" /> Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {allFramesDone && (
                <button onClick={handleGenerateVideos} disabled={frames.filter(f => f.status === 'done').length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold disabled:opacity-50 transition"
                  style={{ background: GOLD, color: '#000' }}>
                  <Film className="w-4 h-4" /> Generate Videos
                </button>
              )}
            </div>
          )}

          {(step === 'video' || step === 'done') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/30 uppercase tracking-wider">
                  {step === 'done' ? '✅ Videos Ready' : '⏳ Generating Videos…'}
                </span>
                {step === 'done' && (
                  <button onClick={resetStudio} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition" style={{ background: GOLD, color: '#000' }}>
                    <Plus className="w-3.5 h-3.5" /> New Video
                  </button>
                )}
              </div>
              {step === 'video' && (
                <div className="p-3 rounded-xl text-xs text-amber-300/80 border border-amber-400/20 bg-amber-400/5 flex items-center gap-2">
                  <Loader className="w-3.5 h-3.5 animate-spin shrink-0" />
                  AI video generation takes 2–5 minutes. Page will update automatically.
                </div>
              )}
              <div className="space-y-4">
                {videos.map(vid => (
                  <div key={vid.id} className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                    <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
                      {vid.status === 'done' && vid.videoUrl
                        ? <video src={vid.videoUrl} controls poster={vid.frameUrl} className="w-full h-full object-contain" playsInline />
                        : vid.status === 'error'
                        ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"><AlertCircle className="w-5 h-5 text-red-400" /><span className="text-xs text-red-300">{vid.error}</span></div>
                        : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
                            <Loader className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
                            <span className="text-xs text-white/40">{vid.status === 'polling' ? 'Processing…' : 'Submitting…'}</span>
                            {editablePrompt && (
                              <p className="absolute bottom-3 left-3 right-3 text-[9px] text-white/20 text-center leading-relaxed line-clamp-2 italic">{editablePrompt}</p>
                            )}
                          </div>
                      }
                    </div>
                    {vid.status === 'done' && vid.videoUrl && (
                      <div className="p-3 space-y-2">
                        {/* Action buttons */}
                        <div className={`grid gap-2 ${videoTranscript ? 'grid-cols-3' : 'grid-cols-1'}`}>
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(vid.videoUrl!);
                                const blob = await res.blob();
                                const blobUrl = URL.createObjectURL(blob);
                                onUseVideo?.(blobUrl);
                              } catch {
                                onUseVideo?.(vid.videoUrl!);
                              }
                            }}
                            className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-bold transition hover:brightness-110"
                            style={{ background: GOLD, color: '#000' }}>
                            <Send className="w-3.5 h-3.5" />
                            Post to Social
                          </button>
                          {videoTranscript && (
                            <>
                              <button
                                onClick={() => onUseVideo?.('repurpose:' + vid.videoUrl!)}
                                className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-bold transition hover:bg-white/8"
                                style={{ border: `1px solid ${GOLD}40`, color: GOLD_L }}>
                                <Sparkles className="w-3.5 h-3.5" />
                                Text Posts
                              </button>
                              <button
                                onClick={() => onUseVideo?.('ideas:' + vid.videoUrl!)}
                                className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[10px] font-bold transition hover:bg-white/8"
                                style={{ border: `1px solid rgba(167,139,250,0.4)`, color: '#a78bfa' }}>
                                <Wand2 className="w-3.5 h-3.5" />
                                AI Strategist
                              </button>
                            </>
                          )}
                        </div>
                        {!videoTranscript && (
                          <p className="text-[10px] text-white/25 text-center px-2">Add a transcript in the brief step to unlock text post & strategy repurposing.</p>
                        )}
                        <button
                          onClick={() => handleDownloadVideo(vid.videoUrl!)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition hover:bg-white/8"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}>
                          <Download className="w-3.5 h-3.5" /> Download to Device
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>


      {historyOpen && (
        <div className="hidden lg:flex w-64 shrink-0 flex-col border-l" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: BORDER }}>
            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">History</span>
            <button onClick={() => { setHistory([]); try { localStorage.removeItem('mm_video_history'); } catch {} }} className="text-xs text-red-400/60 hover:text-red-400">Clear</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {history.length === 0
              ? <div className="flex items-center justify-center h-32 text-xs text-white/25">No history yet</div>
              : history.map(item => (
                <div key={item.id} className="p-3 border-b" style={{ borderColor: BORDER }}>
                  {item.thumbnailUrl && <img src={item.thumbnailUrl} className="w-full rounded-lg mb-2 object-cover" style={{ aspectRatio: '16/9' }} alt="" />}
                  <p className="text-xs text-white/50 line-clamp-2 mb-1">{item.brief}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/25">{new Date(item.createdAt).toLocaleDateString()}</span>
                    <button onClick={() => handleDownloadVideo(item.videoUrl)} className="flex items-center gap-1 text-[10px] font-bold" style={{ color: GOLD }}>
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── WorkspacesPanel ──────────────────────────────────────────────────────────

function WorkspacesPanel({
  userId,
  subscription,
  onUpgrade,
  workspaces,
  onWorkspacesChanged,
  activeWorkspaceId,
  onSetActive,
  integrations,
  wsChannelCounts,
}: {
  userId: string | null;
  subscription: { plan: string; status: string; stripe_customer_id?: string; } | null;
  onUpgrade: () => void;
  workspaces: Workspace[];
  onWorkspacesChanged: () => void;
  activeWorkspaceId: string | null;
  onSetActive: (id: string | null) => void;
  integrations: PostizIntegration[];
  wsChannelCounts?: Record<string, number>;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName]       = useState('');
  const [newColor, setNewColor]     = useState('#D6B25E');
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [assignLoading, setAssignLoading] = useState<string | null>(null);

  const COLOR_PRESETS = ['#D6B25E', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#f97316'];

  const isAgency = subscription?.plan === 'agency' || (
    subscription?.status === 'trialing' &&
    !!subscription?.current_period_end &&
    new Date(subscription.current_period_end) > new Date() &&
    subscription?.plan === 'agency'
  );

  const handleCreate = async () => {
    if (!userId || !newName.trim()) return;
    setSaving(true); setSaveError(null);
    try {
      const { error } = await supabase.from('workspaces').insert({
        owner_user_id: userId,
        name: newName.trim(),
        color: newColor,
        assigned_channel_ids: [],
      });
      if (error) { setSaveError(error.message); return; }
      setNewName(''); setNewColor('#D6B25E'); setCreateOpen(false);
      onWorkspacesChanged();
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to create');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    setDeleting(id);
    try {
      await supabase.from('workspaces').delete().eq('id', id).eq('owner_user_id', userId);
      if (activeWorkspaceId === id) onSetActive(null);
      onWorkspacesChanged();
    } finally { setDeleting(null); }
  };

  const handleToggleChannel = async (workspace: Workspace, channelId: string) => {
    if (!userId) return;
    const current = workspace.assignedChannelIds;
    const updated = current.includes(channelId)
      ? current.filter(c => c !== channelId)
      : [...current, channelId];
    setAssignLoading(workspace.id + ':' + channelId);
    try {
      await supabase.from('workspaces').update({ assigned_channel_ids: updated }).eq('id', workspace.id).eq('owner_user_id', userId);
      onWorkspacesChanged();
    } finally { setAssignLoading(null); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ color: 'white' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-white">Client Workspaces</h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Group channels by client or brand. Up to 4 workspaces per account.
            </p>
          </div>
          {isAgency && workspaces.length < 4 && (
            <button
              onClick={() => setCreateOpen(v => !v)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition"
              style={{ background: `${GOLD}20`, color: GOLD_L, border: `1px solid ${GOLD}40` }}>
              + Create Workspace
            </button>
          )}
        </div>

        {!isAgency && (
          <div className="rounded-2xl border p-6 mb-6 text-center" style={{ background: SURFACE, borderColor: BORDER }}>
            <div className="text-4xl mb-3">🏢</div>
            <h3 className="text-base font-black text-white mb-2">Agency Plan Required</h3>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Client Workspaces are available on the Agency plan. Manage multiple brands and clients from one dashboard.
            </p>
            <button
              onClick={onUpgrade}
              className="px-6 py-2.5 rounded-xl text-sm font-black transition"
              style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_L})`, color: '#000' }}>
              Upgrade to Agency
            </button>
          </div>
        )}

        {isAgency && createOpen && (
          <div className="rounded-2xl border p-5 mb-6" style={{ background: SURFACE, borderColor: `${GOLD}30` }}>
            <h3 className="text-sm font-black text-white mb-4">New Workspace</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Name</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`, color: 'white' }}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className="w-7 h-7 rounded-full border-2 transition"
                      style={{ background: c, borderColor: newColor === c ? 'white' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
              {saveError && <p className="text-xs text-red-400">{saveError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={saving || !newName.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-black transition disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD_L})`, color: '#000' }}>
                  {saving ? 'Creating…' : 'Create'}
                </button>
                <button
                  onClick={() => { setCreateOpen(false); setNewName(''); setSaveError(null); }}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isAgency && workspaces.length === 0 && !createOpen && (
          <div className="rounded-2xl border p-8 text-center" style={{ background: SURFACE, borderColor: BORDER }}>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>No workspaces yet. Create your first one above.</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Personal account card */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: !activeWorkspaceId ? `${GOLD}50` : BORDER }}>
            <div className="flex items-center gap-3 p-4">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: GOLD }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-white truncate">Personal</div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {integrations.length} channel{integrations.length !== 1 ? 's' : ''} connected
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!activeWorkspaceId ? (
                  <button
                    onClick={() => onSetActive(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black"
                    style={{ background: `${GOLD}25`, color: GOLD_L, border: `1px solid ${GOLD}50` }}>
                    Active
                  </button>
                ) : (
                  <button
                    onClick={() => onSetActive(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition hover:bg-white/10"
                    style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Set Active
                  </button>
                )}
              </div>
            </div>
          </div>

          {workspaces.map(ws => (
            <div key={ws.id} className="rounded-2xl border overflow-hidden" style={{ background: SURFACE, borderColor: activeWorkspaceId === ws.id ? `${ws.color}50` : BORDER }}>
              <div className="flex items-center gap-3 p-4">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: ws.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black text-white truncate">{ws.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {wsChannelCounts?.[ws.id] ?? 0} channel{(wsChannelCounts?.[ws.id] ?? 0) !== 1 ? 's' : ''} connected
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeWorkspaceId === ws.id ? (
                    <button
                      onClick={() => onSetActive(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-black"
                      style={{ background: `${ws.color}25`, color: ws.color, border: `1px solid ${ws.color}50` }}>
                      Active
                    </button>
                  ) : (
                    <button
                      onClick={() => onSetActive(ws.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition hover:bg-white/10"
                      style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      Set Active
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(ws.id)}
                    disabled={deleting === ws.id}
                    className="p-1.5 rounded-lg transition hover:bg-red-500/15 text-red-400/50 hover:text-red-400 disabled:opacity-40">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>


            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ view, setView, integrations, onOpenConnect, workspaces, activeWorkspaceId, onSwitchWorkspace, onManageWorkspaces }: {
  view: ViewMode; setView: (v: ViewMode) => void;
  integrations: PostizIntegration[]; onOpenConnect: () => void;
  workspaces: Workspace[]; activeWorkspaceId: string | null;
  onSwitchWorkspace: (id: string | null) => void; onManageWorkspaces: () => void;
}) {
  const [wsSwitcherOpen, setWsSwitcherOpen] = useState(false);
  const navItems = [
    { id: 'composer' as ViewMode, label: 'Posts',      icon: <Edit3 className="w-5 h-5" /> },
    { id: 'calendar' as ViewMode, label: 'Calendar',   icon: <Calendar className="w-5 h-5" /> },
    { id: 'planner'  as ViewMode, label: 'Planner',    icon: <BookOpen className="w-5 h-5" /> },
    { id: 'video'    as ViewMode, label: 'AI Video',   icon: <Film className="w-5 h-5" /> },
    { id: 'partner'  as ViewMode, label: 'Earn',       icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { id: 'workspaces' as ViewMode, label: 'Workspaces', icon: <Users className="w-5 h-5" /> },
  ];

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId) ?? null;

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
              <div className="text-xs font-black text-white">INFINITE</div>
              <div className="text-xs font-bold mt-0.5" style={{ color: GOLD }}>MEDIA</div>
            </div>
          </div>
        </div>
        {workspaces.length > 0 && (
          <div className="px-3 pt-3 relative">
            <button
              onClick={() => setWsSwitcherOpen(v => !v)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition hover:bg-white/5"
              style={{ border: `1px solid ${activeWs ? activeWs.color + '40' : BORDER}`, color: activeWs ? activeWs.color : 'rgba(255,255,255,0.3)', background: activeWs ? `${activeWs.color}0d` : 'transparent' }}>
              {activeWs && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: activeWs.color }} />}
              <span className="truncate flex-1 text-left">{activeWs ? activeWs.name : 'Personal'}</span>
              <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
            </button>
            {wsSwitcherOpen && (
              <div className="absolute left-3 right-3 top-full mt-1 rounded-xl border z-50 overflow-hidden shadow-xl"
                style={{ background: '#1a1a1f', borderColor: BORDER }}>
                <button
                  onClick={() => { onSwitchWorkspace(null); setWsSwitcherOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-bold transition hover:bg-white/5"
                  style={{ color: !activeWorkspaceId ? GOLD_L : 'rgba(255,255,255,0.5)' }}>
                  Personal
                </button>
                {workspaces.map(ws => (
                  <button key={ws.id}
                    onClick={() => { onSwitchWorkspace(ws.id); setWsSwitcherOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-bold transition hover:bg-white/5 flex items-center gap-2"
                    style={{ color: activeWorkspaceId === ws.id ? GOLD_L : 'rgba(255,255,255,0.5)' }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ws.color }} />
                    <span className="truncate">{ws.name}</span>
                  </button>
                ))}
                <div className="border-t" style={{ borderColor: BORDER }}>
                  <button
                    onClick={() => { onManageWorkspaces(); setWsSwitcherOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold transition hover:bg-white/5"
                    style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Manage workspaces…
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
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
                  <PlatformIcon id={int.profile || int.identifier} size="sm" picture={int.picture} />
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
        {(() => { const _tbPromo = subscription?.stripe_customer_id?.startsWith('promo_'); const _tbTrial = subscription?.status === 'trialing' && !!subscription?.current_period_end && new Date(subscription.current_period_end) > new Date(); const _tbActive = subscription?.status === 'active' || _tbPromo || _tbTrial; return _tbActive ? (
          <button onClick={onManagePlan} title={_tbTrial ? 'Free trial active' : 'Manage subscription'}
            style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000', letterSpacing: '0.06em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            {subscription!.plan}{_tbTrial ? ' trial' : ''}
          </button>
        ) : user ? (
          <button onClick={onManagePlan} title="Upgrade plan"
            style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', flexShrink: 0 }}>
            upgrade
          </button>
        ) : null; })()}
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
          <span className="text-xs font-black tracking-widest text-white">INFINITE <span style={{ color: GOLD }}>MEDIA</span></span>
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

// ─── Credits Widget ───────────────────────────────────────────────────────────

function CreditsWidget({
  usage, subscription, open, onOpen, onClose, onUpgrade, onAddon, onManage,
}: {
  usage: { plan: string; isActive: boolean; captions: { used: number; limit: number }; video: { used: number; limit: number }; strategies: { used: number; limit: number }; posts: { used: number; limit: number }; textPosts: { used: number; limit: number } } | null;
  subscription: { plan: string; status: string; stripe_customer_id?: string; } | null;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onUpgrade: () => void;
  onAddon: (key: string) => void;
  onManage: () => void;
}) {
  const isPromo = subscription?.stripe_customer_id?.startsWith('promo_');
  const isTrialing = subscription?.status === 'trialing' && !!subscription?.current_period_end && new Date(subscription.current_period_end) > new Date();
  const trialExpired = subscription?.status === 'trialing' && !!subscription?.current_period_end && new Date(subscription.current_period_end) <= new Date();
  const isActive = subscription?.status === 'active' || isPromo || isTrialing;
  const trialDaysLeft = isTrialing && subscription?.current_period_end
    ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const planLabel = trialExpired ? 'Trial Expired' : isTrialing ? `${subscription?.plan ?? ''} Trial` : isActive ? (subscription?.plan ?? 'free') : 'No plan';

  const Bar = ({ used, limit, color = GOLD }: { used: number; limit: number; color?: string }) => {
    const pct = limit <= 0 ? 0 : limit === -1 ? 100 : Math.min(100, Math.round((used / limit) * 100));
    const isUnlimited = limit === -1;
    const isFull = !isUnlimited && pct >= 100;
    return (
      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: isUnlimited ? '100%' : `${pct}%`, background: isFull ? '#ef4444' : color }} />
      </div>
    );
  };

  const Row = ({ label, used, limit, addonKey, addonLabel }: { label: string; used: number; limit: number; addonKey?: string; addonLabel?: string }) => {
    const isUnlimited = limit === -1;
    const isFull = !isUnlimited && limit > 0 && used >= limit;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/50">{label}</span>
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isFull ? 'text-red-400' : 'text-white/80'}`}>
              {isUnlimited ? `${used} / ∞` : limit === 0 ? 'Not included' : `${used} / ${limit}`}
            </span>
            {addonKey && isActive && !isUnlimited && limit > 0 && (
              <button onClick={() => onAddon(addonKey)}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: `${GOLD}18`, color: GOLD_L }}>
                +More
              </button>
            )}
          </div>
        </div>
        {limit !== 0 && <Bar used={used} limit={limit} />}
      </div>
    );
  };

  return (
    <>
      {/* Floating button */}
      <button onClick={onOpen}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold shadow-lg transition hover:brightness-110"
        style={{ background: GOLD, color: '#000' }}>
        <DollarSign className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Credits</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center md:p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
          <div className="w-full md:max-w-sm rounded-t-2xl md:rounded-2xl border flex flex-col"
            style={{ background: '#111', borderColor: 'rgba(255,255,255,0.1)', maxHeight: '90dvh', overflowY: 'auto' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div>
                <div className="text-sm font-black text-white">Your Credits</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                    style={{ background: isActive ? `${GOLD}20` : 'rgba(255,255,255,0.06)', color: isActive ? GOLD_L : 'rgba(255,255,255,0.4)', border: `1px solid ${isActive ? GOLD + '40' : 'rgba(255,255,255,0.1)'}` }}>
                    {planLabel} plan
                  </span>
                  {isTrialing && trialDaysLeft !== null && <span className="text-[10px] text-amber-400/80">● {trialDaysLeft}d left</span>}
                  {!isTrialing && isActive && <span className="text-[10px] text-green-400/70">● Active</span>}
                  {trialExpired && <span className="text-[10px] text-red-400/80">● Expired</span>}
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Usage rows */}
            <div className="px-5 py-4 space-y-4">
              {trialExpired ? (
                <div className="text-center py-4 space-y-3">
                  <div className="text-2xl">⏰</div>
                  <p className="text-sm font-bold text-red-400">Your free trial has ended</p>
                  <p className="text-xs text-white/30">Subscribe to keep your AI captions, video generation, content strategy, and more.</p>
                  <button onClick={() => { onClose(); onUpgrade(); }}
                    className="w-full py-2.5 rounded-xl text-sm font-black transition hover:brightness-110"
                    style={{ background: `linear-gradient(135deg,${GOLD_D},${GOLD})`, color: '#000' }}>
                    Subscribe Now
                  </button>
                </div>
              ) : !isActive ? (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-white/50">You don't have an active plan.</p>
                  <p className="text-xs text-white/30">Subscribe to unlock AI captions, video generation, content strategy, and more.</p>
                  <button onClick={() => { onClose(); onUpgrade(); }}
                    className="w-full py-2.5 rounded-xl text-sm font-black transition hover:brightness-110"
                    style={{ background: GOLD, color: '#000' }}>
                    View Plans
                  </button>
                </div>
              ) : (
                <>
                  <Row label="AI Captions" used={usage?.captions.used ?? 0} limit={usage?.captions.limit ?? 0} addonKey="captions_25" addonLabel="+25 Captions" />
                  <Row label="AI Video" used={usage?.video.used ?? 0} limit={usage?.video.limit ?? 0} addonKey="video_60s" addonLabel="+60s Video" />
                  <Row label="Content Strategies" used={usage?.strategies.used ?? 0} limit={usage?.strategies.limit ?? 0} />
                  <Row label="Posts Scheduled" used={usage?.posts.used ?? 0} limit={usage?.posts.limit ?? 0} />
                  <Row label="Text Posts" used={usage?.textPosts.used ?? 0} limit={usage?.textPosts.limit ?? 0} />
                  <p className="text-[10px] text-white/25 text-center">Resets at the start of each billing period</p>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { onClose(); onUpgrade(); }}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition hover:brightness-110"
                      style={{ background: GOLD, color: '#000' }}>
                      Upgrade Plan
                    </button>
                    <button onClick={() => { onClose(); onManage(); }}
                      className="flex-1 py-2 rounded-xl text-xs font-bold border transition hover:bg-white/5"
                      style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>
                      Manage Billing
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MediaDistributionPage() {
  const [view, setView]                         = useState<ViewMode>('composer');
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [videoHandoff, setVideoHandoff]         = useState<{ url: string; mode: 'media' | 'text' | 'saved' } | null>(null);
  const [oauthLoading, setOauthLoading]         = useState(false);
  const [oauthError, setOauthError]             = useState<string | null>(null);
  const [subscription, setSubscription]         = useState<{ plan: string; status: string; current_period_end: string; stripe_customer_id?: string; } | null>(null);
  const [trialLoading, setTrialLoading]         = useState<string | null>(null);
  const [globalUsage, setGlobalUsage]           = useState<{ plan: string; isActive: boolean; captions: { used: number; limit: number }; video: { used: number; limit: number }; strategies: { used: number; limit: number }; posts: { used: number; limit: number } } | null>(null);
  const [creditsOpen, setCreditsOpen]           = useState(false);
  const [upsellShown, setUpsellShown]           = useState(false);
  const [checkoutLoading, setCheckoutLoading]   = useState<string | null>(null);
  const [portalLoading, setPortalLoading]       = useState(false);
  const [cancelModalOpen, setCancelModalOpen]   = useState(false);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [retentionSuccess, setRetentionSuccess] = useState(false);
  const [retentionError, setRetentionError]     = useState<string | null>(null);
  const [offerEligible, setOfferEligible]       = useState(false);
  const portalUrlRef = React.useRef<string>('');
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [addonFeature, setAddonFeature] = useState('captions');
  const [addonUsed, setAddonUsed] = useState(0);
  const [addonLimit, setAddonLimit] = useState(0);
  const [pricingOpen, setPricingOpen]           = useState(false);
  const [promoCode, setPromoCode]               = useState('');
  const [promoLoading, setPromoLoading]         = useState(false);
  const [promoError, setPromoError]             = useState('');
  const [promoSuccess, setPromoSuccess]         = useState('');
  const [integrations, setIntegrations]         = useState<PostizIntegration[]>([]);
  const [workspaceIntegrations, setWorkspaceIntegrations] = useState<PostizIntegration[]>([]);
  const [wsChannelCounts, setWsChannelCounts] = useState<Record<string, number>>({});
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [workspaces, setWorkspaces]             = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => localStorage.getItem('mm_active_workspace') || null);
  const [authModalOpen, setAuthModalOpen]       = useState(false);
  const { user: authUser, signOut, loading: authLoading } = useAuth();
  const currentUser = authUser ? { id: authUser.id, email: authUser.email ?? '' } : null;

  useEffect(() => {
    if (window.location.hash.includes('access_token')) {
      // Let Supabase parse the hash token before removing it
      setTimeout(() => window.history.replaceState(null, '', window.location.pathname), 1000);
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
    // Load subscription + global usage
    (async () => {
      try {
        const { data } = await supabase.from('subscriptions').select('plan,status,current_period_end,stripe_customer_id').eq('supabase_user_id', currentUserId).maybeSingle();
        if (data) setSubscription(data);
      } catch (_) {}
      // Load workspaces
      try {
        const { data: ws } = await supabase.from('workspaces').select('*').eq('owner_user_id', currentUserId).order('created_at');
        if (ws) {
              setWorkspaces(ws.map((w: any) => ({ id: w.id, name: w.name, color: w.color, assignedChannelIds: Array.isArray(w.assigned_channel_ids) ? w.assigned_channel_ids : [], createdAt: w.created_at })));
              const counts: Record<string, number> = {};
              ws.forEach((w: any) => { counts[w.id] = Array.isArray(w.cached_channels) ? w.cached_channels.length : 0; });
              setWsChannelCounts(counts);
            }
      } catch (_) {}
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/check-usage`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (res.ok) {
          const d = await res.json();
          const _usage = {
            plan: d.plan ?? 'free',
            isActive: d.isActive ?? false,
            captions:  { used: d.usage?.ai_captions_used ?? 0, limit: d.limits?.ai_captions_per_month ?? 0 },
            video:     { used: d.usage?.video_seconds_used ?? 0, limit: d.limits?.video_seconds_per_month ?? 0 },
            strategies:{ used: d.usage?.strategies_used ?? 0, limit: d.limits?.strategies_per_month ?? 0 },
            posts:     { used: d.usage?.posts_scheduled ?? 0, limit: d.limits?.posts_per_month ?? 0 },
            textPosts: { used: d.usage?.posts_scheduled ?? 0, limit: d.limits?.text_posts_per_month ?? d.limits?.posts_per_month ?? 0 },
          };
          setGlobalUsage(_usage);
          // Trigger upsell at 80% caption usage — only once per session
          if (_usage.isActive && _usage.captions.limit > 0 && _usage.captions.limit !== -1) {
            const pct = _usage.captions.used / _usage.captions.limit;
            if (pct >= 0.8) {
              setUpsellShown(prev => { if (!prev) { setTimeout(() => setPricingOpen(true), 1500); return true; } return prev; });
            }
          }
          // REMOVE the old setGlobalUsage line below — replaced above
          if (false) setGlobalUsage({
            plan: d.plan ?? 'free',
            isActive: d.isActive ?? false,
            captions:  { used: d.usage?.ai_captions_used ?? 0, limit: d.limits?.ai_captions_per_month ?? 0 },
            video:     { used: d.usage?.video_seconds_used ?? 0, limit: d.limits?.video_seconds_per_month ?? 0 },
            strategies:{ used: d.usage?.strategies_used ?? 0, limit: d.limits?.strategies_per_month ?? 0 },
            posts:     { used: d.usage?.posts_scheduled ?? 0, limit: d.limits?.posts_per_month ?? 0 },
            textPosts: { used: d.usage?.posts_scheduled ?? 0, limit: d.limits?.text_posts_per_month ?? d.limits?.posts_per_month ?? 0 },
          });
        }
      } catch (_) {}
    })();
    // Handle ?checkout=success or ?addon_success= return — refresh subscription + usage
    const params = new URLSearchParams(window.location.search);
    const refreshAfterPurchase = async () => {
      const { data } = await supabase.from('subscriptions').select('plan,status,current_period_end,stripe_customer_id').eq('supabase_user_id', currentUserId).maybeSingle();
      if (data) setSubscription(data);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/check-usage`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
        if (res.ok) {
          const d = await res.json();
          setGlobalUsage({ plan: d.plan ?? 'free', isActive: d.isActive ?? false, captions: { used: d.usage?.ai_captions_used ?? 0, limit: d.limits?.ai_captions_per_month ?? 0 }, video: { used: d.usage?.video_seconds_used ?? 0, limit: d.limits?.video_seconds_per_month ?? 0 }, strategies: { used: d.usage?.strategies_used ?? 0, limit: d.limits?.strategies_per_month ?? 0 }, posts: { used: d.usage?.posts_scheduled ?? 0, limit: d.limits?.posts_per_month ?? 0 }, textPosts: { used: d.usage?.posts_scheduled ?? 0, limit: d.limits?.text_posts_per_month ?? 0 } });
        }
      } catch {}
    };
    if (params.get('checkout') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(refreshAfterPurchase, 2500);
    }
    if (params.get('addon_success')) {
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(refreshAfterPurchase, 3000);
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

  useEffect(() => {
    if (activeWorkspaceId) localStorage.setItem('mm_active_workspace', activeWorkspaceId);
    else localStorage.removeItem('mm_active_workspace');
  }, [activeWorkspaceId]);

  // ── Social account return detection ──────────────────────────────────────
  // Three signals, any one is enough: URL ?connected=1, localStorage flag, visibilitychange.
  // On mobile the page fully reloads after OAuth so visibilitychange never fires —
  // the URL param is the only reliable signal in that case.
  // We poll with retries because Late can take a few seconds to register the connection.
  const pollForChannels = useCallback(async () => {
    if (!currentUserId) return;
    setIntegrationsLoading(true);
    let found = false;
    // Attempt 1: immediate (no delay) — catches cases where Late already has the account
    try {
      const channels = await fetchChannels(currentUserId, true);
      setIntegrations(channels);
      if (channels.length > 0) found = true;
    } catch { /* keep going */ }

    // If first attempt returned empty, poll with retries
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

  // Load workspace-scoped channels when active workspace changes
  useEffect(() => {
    if (!currentUserId || !activeWorkspaceId) { setWorkspaceIntegrations([]); return; }
    setIntegrationsLoading(true);
    fetchChannels(currentUserId, false, activeWorkspaceId)
      .then(setWorkspaceIntegrations)
      .catch(() => setWorkspaceIntegrations([]))
      .finally(() => setIntegrationsLoading(false));
  }, [currentUserId, activeWorkspaceId]);

  const activeIntegrations = activeWorkspaceId ? workspaceIntegrations : integrations;

  const xInteg       = activeIntegrations.find(i => ['x','twitter'].includes((i.profile||i.identifier||'').toLowerCase()));
  const liInteg      = activeIntegrations.find(i => (i.profile||i.identifier||'').toLowerCase().startsWith('linkedin'));
  const threadsInteg = activeIntegrations.find(i => (i.profile||i.identifier||'').toLowerCase().startsWith('threads'));

  // Signal 1: URL param ?connected=1 — works after full page reload (mobile)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === '1') {
      // Clean the URL immediately so refresh doesn't re-trigger
      window.history.replaceState({}, '', window.location.pathname);
      try { localStorage.removeItem(LS_SOCIAL_RETURN_KEY); } catch {}
      setConnectModalOpen(false);
      pollForChannels();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Signal 2: localStorage flag — works when popup closes or tab regains focus on desktop
  useEffect(() => {
    const isSocialReturn = (() => {
      try { return localStorage.getItem(LS_SOCIAL_RETURN_KEY) === '1' || !!localStorage.getItem('late_connected'); }
      catch { return false; }
    })();
    if (isSocialReturn) {
      try { localStorage.removeItem(LS_SOCIAL_RETURN_KEY); localStorage.removeItem('late_connected'); } catch {}
      window.history.replaceState({}, '', window.location.pathname);
      setConnectModalOpen(false);
      pollForChannels();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Signal 3: visibilitychange — works on desktop when popup tab closes
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
    // Optimistic: remove from UI immediately
    setIntegrations(prev => prev.filter(i => (i.profile || i.id) !== platformId));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ayrshare-disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ platform: platformId, ...(activeWorkspaceId ? { workspaceId: activeWorkspaceId } : {}) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        loadIntegrations(true);
        if (activeWorkspaceId) fetchChannels(currentUser?.id ?? '', true, activeWorkspaceId).then(setWorkspaceIntegrations);
        throw new Error(err.error || 'Failed to disconnect');
      }
      // Reload workspace integrations after successful disconnect
      if (activeWorkspaceId) fetchChannels(currentUser?.id ?? '', true, activeWorkspaceId).then(setWorkspaceIntegrations);
    } catch (err) {
      loadIntegrations(true);
      throw err;
    }
  };

  const handleStartTrial = async (planKey: string) => {
    if (!currentUser) { setAuthModalOpen(true); return; }
    setTrialLoading(planKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/start-trial`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.error === 'trial_already_used') alert('You have already used your free trial. Please subscribe to continue.');
        else if (d.error === 'already_subscribed') alert('You already have an active subscription.');
        else alert(d.message || 'Could not start trial. Please try again.');
        return;
      }
      const { data } = await supabase.from('subscriptions').select('plan,status,current_period_end,stripe_customer_id').eq('supabase_user_id', currentUser.id).maybeSingle();
      if (data) setSubscription(data);
      // Refresh usage so CreditsWidget reflects the new active trial
      try {
        const { data: { session: s2 } } = await supabase.auth.getSession();
        const ur = await fetch(`${SUPABASE_URL}/functions/v1/check-usage`, { headers: { Authorization: `Bearer ${s2?.access_token}` } });
        if (ur.ok) {
          const ud = await ur.json();
          setGlobalUsage({ plan: ud.plan ?? 'free', isActive: ud.isActive ?? false, captions: { used: ud.usage?.ai_captions_used ?? 0, limit: ud.limits?.ai_captions_per_month ?? 0 }, video: { used: ud.usage?.video_seconds_used ?? 0, limit: ud.limits?.video_seconds_per_month ?? 0 }, strategies: { used: ud.usage?.strategies_used ?? 0, limit: ud.limits?.strategies_per_month ?? 0 }, posts: { used: ud.usage?.posts_scheduled ?? 0, limit: ud.limits?.posts_per_month ?? 0 }, textPosts: { used: ud.usage?.posts_scheduled ?? 0, limit: ud.limits?.text_posts_per_month ?? ud.limits?.posts_per_month ?? 0 } });
        }
      } catch (_) {}
      setPricingOpen(false);
    } catch { alert('Something went wrong. Please try again.'); }
    finally { setTrialLoading(null); }
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
    // Show cancellation modal with retention offer before going to Stripe
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
      // Store portal URL for use after modal
      if (data.url) {
        setOfferEligible(data.offerEligible ?? false);
        setRetentionSuccess(false);
        setRetentionError(null);
        setCancelModalOpen(true);
        // Store portal URL in a ref so modal can use it
        portalUrlRef.current = data.url;
      } else throw new Error(data.error || 'Portal failed');
    } catch (e: any) { setOauthError(e.message); }
    finally { setPortalLoading(false); }
  };

  const handleRetentionOffer = async () => {
    setRetentionLoading(true);
    setRetentionError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch(`${SUPABASE_URL}/functions/v1/apply-retention-discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to apply discount');
      setRetentionSuccess(true);
      setOfferEligible(false);
    } catch (e: any) { setRetentionError(e.message); }
    finally { setRetentionLoading(false); }
  };

  const handleProceedToCancel = () => {
    setCancelModalOpen(false);
    if (portalUrlRef.current) window.location.href = portalUrlRef.current;
  };

  const handleAddonCheckout = async (addonKey) => {
    if (!currentUser) { setAuthModalOpen(true); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ addon: addonKey, successUrl: window.location.href + '?addon_success=' + addonKey, cancelUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Checkout failed');
    } catch (e) { setOauthError(e.message); }
  };

  const handlePromoRedeem = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    setPromoSuccess('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/redeem-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setPromoError(data.error || 'Invalid promo code'); return; }
      setPromoSuccess('🎉 Promo applied! Unlocking your account...');
      setTimeout(async () => {
        // Reload subscription from DB
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
        .mm-hero-layout { display: flex; flex-direction: column; align-items: center; width: 100%; height: 100%; padding: clamp(28px,5vw,48px) clamp(16px,4vw,48px); }
        @media (min-width: 900px) {
          .mm-hero-layout { flex-direction: row; align-items: stretch; gap: 60px; justify-content: center; }
          .mm-hero-left  { flex: 0 0 460px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; text-align: left; }
          .mm-hero-right { flex: 1; max-width: 560px; display: flex; flex-direction: column; justify-content: center; }
          .mm-hero-left .mm-hero-badge, .mm-hero-left .mm-hero-headline, .mm-hero-left .mm-hero-tagline { text-align: left !important; }
          .mm-hero-left .mm-hero-badge { justify-content: flex-start !important; }
        }
        @media (max-width: 899px) {
          .mm-hero-left  { display: flex; flex-direction: column; align-items: center; text-align: center; width: 100%; }
          .mm-hero-right { width: 100%; }
        }
        @media (min-width: 640px) {
          .mm-pricing-backdrop { align-items: center !important; padding: 16px !important; }
          .mm-pricing-sheet { border-radius: 24px !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; max-height: 90vh !important; }
        }
        .mm-gold-shimmer { background-image: linear-gradient(110deg, #b9892b 0%, #f7dc8a 20%, #ffffff 30%, #f1d27b 40%, #b9892b 60%, #f7dc8a 80%, #ffffff 90%, #b9892b 100%); background-size: 240% 100%; background-position: 0% 50%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: goldShimmerSweep 4.8s ease-in-out infinite; }
        .lg\:divide-x > * + * { border-left-width: 1px; border-color: rgba(255,255,255,0.08); }
        /* Platform icon strip visibility */
        .mm-icons-mobile  { display: block; }
        .mm-icons-desktop { display: none;  }
        @media (min-width: 900px) {
          .mm-icons-mobile  { display: none;  }
          .mm-icons-desktop { display: block; }
        }

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
        integrations={activeIntegrations} integrationsLoading={integrationsLoading}
        onConnect={handleConnect} onDisconnect={handleDisconnect}
        onRefresh={(force) => loadIntegrations(force)}
        onOpenConnect={() => { const _p = subscription?.stripe_customer_id?.startsWith('promo_'); const _t = subscription?.status === 'trialing' && !!subscription?.current_period_end && new Date(subscription.current_period_end) > new Date(); (subscription?.status === 'active' || _p || _t) ? setConnectModalOpen(true) : setPricingOpen(true); }}
        user={currentUser}
        onSignOut={handleSignOut}
        onSignIn={() => setAuthModalOpen(true)}
        subscription={subscription}
        onManagePlan={currentUser ? (subscription?.status === 'active' ? handlePortal : () => setPricingOpen(true)) : () => setAuthModalOpen(true)}
      />

      {/* ── STATE 1: Auth loading / Logged out — hero ── */}
      {authLoading ? (
        <div className="flex-1 flex items-center justify-center" style={{ background: BG }}>
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `rgba(214,178,94,0.3)`, borderTopColor: '#D6B25E' }} />
        </div>
      ) : !currentUser ? (
        <div className="flex-1" style={{ position: 'relative', display: 'flex', alignItems: 'stretch', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
          {/* Background glows */}
          <div style={{ position: 'absolute', width: 640, height: 640, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}07 0%, transparent 65%)`, top: '50%', left: '30%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', animation: 'mmPulse 6s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}05 0%, transparent 65%)`, top: '10%', right: '8%', pointerEvents: 'none', animation: 'mmPulse 9s ease-in-out 2s infinite' }} />

          <div className="mm-hero-layout relative" style={{ animation: 'mmFadeUp 0.5s ease both', width: '100%' }}>

            {/* ── Left: branding + CTAs ── */}
            <div className="mm-hero-left">
              {/* Logo */}
              <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: `0 12px 40px ${GOLD}40`, flexShrink: 0 }}>
                <Send size={22} color="#000" />
              </div>

              {/* Badge */}
              <div className="mm-hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${GOLD}10`, border: `1px solid ${GOLD}22`, borderRadius: 999, padding: '4px 12px', marginBottom: 16 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, display: 'inline-block', animation: 'mmPulse 2s ease-in-out infinite' }} />
                <span style={{ color: GOLD, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>AI-Powered Content Engine</span>
              </div>

              {/* Headline */}
              <span className="mm-gold-shimmer mm-hero-headline" style={{ display: 'block', fontSize: 'clamp(28px, 4.5vw, 64px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 8 }}>Infinite Media</span>
              <span style={{ display: 'block', fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', marginBottom: 14 }}>By Infinite Wealth Solutions AI</span>

              {/* Tagline */}
              <p className="mm-hero-tagline" style={{ fontSize: 'clamp(15px, 2.2vw, 22px)', color: 'rgba(255,255,255,0.85)', marginBottom: 20, lineHeight: 1.5, fontWeight: 800, letterSpacing: '-0.02em', maxWidth: 400 }}>
                An entire marketing department on one platform.
              </p>


              {/* Stats */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', width: '100%', maxWidth: 400 }}>
                {[{ v: '12', l: 'Platforms' }, { v: '24/7', l: 'Content Strategist' }, { v: '6-in-1', l: 'AI Tools' }].map((s, i) => (
                  <div key={s.l} style={{ flex: 1, padding: '14px 8px', textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div style={{ color: GOLD, fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' }}>{s.v}</div>
                    <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, marginTop: 3 }}>{s.l}</div>
                  </div>
                ))}
              </div>



              {/* Platform icons — MOBILE ONLY (hidden on desktop, desktop shows in right col) */}
              <div className="mm-icons-mobile" style={{ marginBottom: 16, width: '100%', maxWidth: 400 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Publish to 12 platforms</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['instagram','facebook','tiktok','youtube','x','linkedin','threads','bluesky','pinterest','gmb','reddit','telegram'].map(pid => (
                    <div key={pid} title={pid.charAt(0).toUpperCase()+pid.slice(1)} style={{ opacity: 0.85, transition: 'opacity 0.15s', cursor: 'default' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'}>
                      <PlatformIcon id={pid} size="sm" />
                    </div>
                  ))}
                </div>
              </div>

              {/* CTAs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, width: '100%', maxWidth: 400, marginBottom: 20 }}>
                <button
                  onClick={() => setAuthModalOpen(true)}
                  style={{ width: '100%', padding: '16px 0', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})`, color: '#000', border: 'none', boxShadow: `0 8px 28px ${GOLD}40`, letterSpacing: '-0.01em', transition: 'filter 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'}
                >
                  Start Multiplying Your Content
                </button>
                <button
                  onClick={() => setAuthModalOpen(true)}
                  style={{ width: '100%', padding: '14px 0', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)', transition: 'border-color 0.15s, color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.22)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; }}
                >
                  Already have an account? Sign In
                </button>
              </div>

              {/* Referral nudge */}
              <div style={{ padding: '12px 16px', borderRadius: 12, background: `${GOLD}07`, border: `1px solid ${GOLD}18`, maxWidth: 300, width: '100%' }}>
                <div style={{ fontSize: 11, color: GOLD_L, fontWeight: 700, marginBottom: 4 }}>💸 2-for-20 Affiliate Program</div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', margin: 0, lineHeight: 1.6 }}>
                  Earn 20% recurring commission for every referral. Your audience gets 20% off their first month.
                </p>
              </div>
            </div>

            {/* ── Right: feature cards ── */}
            <div className="mm-hero-right" style={{ marginTop: '32px' }}>

              {/* Platform icons — DESKTOP ONLY (hidden on mobile, mobile shows in left col) */}
              <div className="mm-icons-desktop" style={{ marginBottom: 20, width: '100%' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Publish to 12 platforms</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['instagram','facebook','tiktok','youtube','x','linkedin','threads','bluesky','pinterest','gmb','reddit','telegram'].map(pid => (
                    <div key={pid} title={pid.charAt(0).toUpperCase()+pid.slice(1)} style={{ opacity: 0.85, transition: 'opacity 0.15s', cursor: 'default' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'}>
                      <PlatformIcon id={pid} size="sm" />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, width: '100%' }}>
                {[
                  { icon: <Video size={15} />,      title: 'AI Video Generation',       desc: 'Cinematic AI video from a single image. No editing required.' },
                  { icon: <Sparkles size={15} />,   title: 'AI Caption Generator',      desc: 'Platform-specific captions engineered to stop the scroll.' },
                  { icon: <Calendar size={15} />,   title: 'AI Content Strategist',     desc: '7-day content calendars with viral hooks and trend research for your niche.' },
                  { icon: <TrendingUp size={15} />, title: 'Multi-Platform Publishing',  desc: 'Auto-publish to Instagram, TikTok, LinkedIn, YouTube and more.' },
                  { icon: <Film size={15} />,       title: 'Content Repurposing',        desc: 'Extract clips, tweets, blogs and threads from any video.' },
                  { icon: <Users size={15} />,      title: 'AI Voice Agents',            desc: '24/7 automated conversations that qualify and close leads.' },
                ].map(f => (
                  <div
                    key={f.title}
                    style={{ padding: '20px', borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 12, transition: 'border-color 0.2s, background 0.2s', cursor: 'default' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}35`; (e.currentTarget as HTMLElement).style.background = `${GOLD}07`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)'; }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${GOLD}14`, border: `1px solid ${GOLD}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD }}>
                      {f.icon}
                    </div>
                    <div>
                      <div style={{ color: 'white', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{f.title}</div>
                      <div style={{ color: 'rgba(255,255,255,0.32)', fontSize: 12, lineHeight: 1.6 }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      ) : (
        /* ── STATES 2 & 3: Logged in — always show dashboard ── */
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Upgrade / trial banner */}
          {(() => {
            const _isPromo = subscription?.stripe_customer_id?.startsWith('promo_');
            const _isTrialing = subscription?.status === 'trialing' && !!subscription?.current_period_end && new Date(subscription.current_period_end) > new Date();
            const _trialExpired = subscription?.status === 'trialing' && !!subscription?.current_period_end && new Date(subscription.current_period_end) <= new Date();
            const _isActive = subscription?.status === 'active' || _isPromo || _isTrialing;
            const _daysLeft = _isTrialing && subscription?.current_period_end
              ? Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : null;
            if (_trialExpired) return (
              <div style={{ background: 'linear-gradient(90deg,rgba(239,68,68,0.18),rgba(239,68,68,0.08),rgba(239,68,68,0.18))', borderBottom: '1px solid rgba(239,68,68,0.3)', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: 'rgba(239,68,68,0.9)', fontWeight: 700 }}>⏰ Your free trial has ended.</span>
                <button onClick={() => setPricingOpen(true)} style={{ fontSize: 12, fontWeight: 800, color: GOLD_L, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 0 }}>
                  Subscribe to keep access →
                </button>
              </div>
            );
            if (_isTrialing) return (
              <div style={{ background: `linear-gradient(90deg,${GOLD_D}22,${GOLD}18,${GOLD_D}22)`, borderBottom: `1px solid ${GOLD}30`, padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>🎉 Free trial active</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${GOLD}25`, color: GOLD_L, border: `1px solid ${GOLD}40`, textTransform: 'capitalize' }}>{subscription?.plan} Plan</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: GOLD, color: '#000' }}>
                    {_daysLeft}d left
                  </span>
                  <button onClick={() => setPricingOpen(true)} style={{ fontSize: 11, fontWeight: 700, color: GOLD_L, background: 'none', border: `1px solid ${GOLD}50`, borderRadius: 8, cursor: 'pointer', padding: '3px 8px', whiteSpace: 'nowrap' }}>
                    Subscribe →
                  </button>
                </div>
              </div>
            );
            if (!_isActive) return (
              <div style={{ background: `linear-gradient(90deg, ${GOLD_D}22, ${GOLD}18, ${GOLD_D}22)`, borderBottom: `1px solid ${GOLD}30`, padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500, whiteSpace: 'nowrap' }}>✨ Free preview</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', display: 'inline' }}>—</span>
                <button onClick={() => setPricingOpen(true)} style={{ fontSize: 12, fontWeight: 800, color: GOLD_L, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, padding: 0, whiteSpace: 'nowrap' }}>
                  Upgrade to unlock AI video, scheduling & content repurposing
                </button>
              </div>
            );
            return null;
          })()}
          {/* H — compute filtered integrations based on active workspace */}
          {(() => { return null; })()}
          <div className="flex flex-1 overflow-hidden min-h-0">
          {/* I — Sidebar with workspace props */}
          <Sidebar view={view} setView={setView}
            integrations={activeIntegrations}
            onOpenConnect={() => setConnectModalOpen(true)}
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSwitchWorkspace={(id) => setActiveWorkspaceId(id)}
            onManageWorkspaces={() => setView('workspaces')} />
          <main className="flex-1 flex flex-col min-h-0 overflow-x-hidden" style={{ position: 'relative' }}>
            {/* K — pass activeIntegrations to ComposerPanel */}
            {view === 'composer' && <ComposerPanel key={activeWorkspaceId ?? 'personal'} integrations={activeIntegrations} userId={currentUser?.id ?? null} initialVideoUrl={videoHandoff?.url} initialComposerMode={videoHandoff?.mode} onVideoConsumed={() => setVideoHandoff(null)} onUpgrade={() => setPricingOpen(true)} workspaceId={activeWorkspaceId} />}
            {view === 'calendar' && <CalendarView key={activeWorkspaceId ?? 'personal'}  integrations={activeIntegrations} userId={currentUser?.id ?? null} workspaceId={activeWorkspaceId} />}
            {view === 'planner'  && <PlannerPanel key={activeWorkspaceId ?? 'personal'}  userId={currentUser?.id ?? null} subscription={subscription} onUpgrade={() => setPricingOpen(true)} workspaceId={activeWorkspaceId} />}
            {view === 'video' && <AIVideoStudio userId={currentUser?.id ?? null} subscription={subscription} onUpgrade={() => setPricingOpen(true)} onUseVideo={(url) => {
              if (url.startsWith('repurpose:')) {
                setVideoHandoff({ url: url.replace('repurpose:', ''), mode: 'text' });
              } else if (url.startsWith('ideas:')) {
                setVideoHandoff({ url: url.replace('ideas:', ''), mode: 'media' });
              } else {
                setVideoHandoff({ url, mode: 'media' });
              }
              setView('composer');
            }} />}
            {view === 'partner'  && <AffiliateDashboard userId={currentUser?.id ?? null} userEmail={currentUser?.email ?? null} userName={authUser?.user_metadata?.full_name ?? authUser?.user_metadata?.name ?? null} />}
            {/* J — WorkspacesPanel view */}
            {view === 'workspaces' && <WorkspacesPanel userId={currentUser?.id ?? null} subscription={subscription} onUpgrade={() => setPricingOpen(true)} workspaces={workspaces} onWorkspacesChanged={async () => { const { data: ws } = await supabase.from('workspaces').select('*').eq('owner_user_id', currentUser!.id).order('created_at'); if (ws) setWorkspaces(ws.map((w: any) => ({ id: w.id, name: w.name, color: w.color, assignedChannelIds: Array.isArray(w.assigned_channel_ids) ? w.assigned_channel_ids : [], createdAt: w.created_at }))); }} activeWorkspaceId={activeWorkspaceId} onSetActive={(id) => setActiveWorkspaceId(id)} integrations={integrations} wsChannelCounts={wsChannelCounts} />}
          </main>
          </div>

          {/* Credits Widget — only shown when logged in */}
          <CreditsWidget
            usage={globalUsage}
            subscription={subscription}
            open={creditsOpen}
            onOpen={() => setCreditsOpen(true)}
            onClose={() => setCreditsOpen(false)}
            onUpgrade={() => { setCreditsOpen(false); setPricingOpen(true); }}
            onAddon={handleAddonCheckout}
            onManage={handlePortal}
          />
        </div>
      )}

      {/* ── Pricing Modal ── */}
                        {pricingOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
          style={{background:"rgba(0,0,0,0.92)",backdropFilter:"blur(10px)"}}
          onClick={e=>{if(e.target===e.currentTarget)setPricingOpen(false);}}>
          <div className="w-full md:max-w-4xl rounded-t-2xl md:rounded-2xl border flex flex-col"
            style={{background:"#0f0f0f",borderColor:"rgba(255,255,255,0.1)",maxHeight:"95dvh",overflowY:"auto"}}>
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{borderColor:"rgba(255,255,255,0.07)"}}>
              <div>
                <div className="text-base font-black text-white">Choose Your Plan</div>
                <div className="text-xs text-white/40 mt-0.5">Try Creator or Viral free for 7 days — no card required</div>
              </div>
              <button onClick={()=>setPricingOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition"><X className="w-4 h-4"/></button>
            </div>
            {(()=>{
              const _pricingIsPromo=subscription?.stripe_customer_id?.startsWith('promo_');
              const _pricingIsTrialing=subscription?.status==='trialing'&&!!subscription?.current_period_end&&new Date(subscription.current_period_end)>new Date();
              const _pricingTrialUsed=subscription?.status==='trialing';
              const _pricingIsActive=subscription?.status==='active'||_pricingIsPromo||_pricingIsTrialing;
              return(<>
            <div className="md:hidden px-4 py-4 space-y-3">
              {([
                {key:"starter",name:"Creator",price:"$47",highlight:false,features:["30 posts/mo","15 AI captions/mo","3 social accounts","60s AI video/mo","Content calendar"],trialEligible:true},
                {key:"viral",name:"Viral",price:"$97",highlight:true,features:["100 media posts/mo","200 text posts/mo","100 AI captions/mo","All social accounts","180s AI video/mo","Content repurposing","4 Content Strategies/mo"],trialEligible:true},
                {key:"agency",name:"Agency",price:"$297",highlight:false,features:["Unlimited media posts","Unlimited text posts","Unlimited AI captions","All social accounts","540s AI video/mo","Everything in Viral","12 Content Strategies/mo","3 client workspaces","Priority support + call"],trialEligible:false},
              ] as const).map(plan=>{
                const isCurrent=_pricingIsActive&&subscription?.plan===plan.key;
                const isTrialingThis=_pricingIsTrialing&&subscription?.plan===plan.key;
                const showTrial=plan.trialEligible&&!_pricingIsActive&&!_pricingIsTrialing&&!_pricingTrialUsed;
                const isLoading=checkoutLoading===plan.key;
                const isTLoading=trialLoading===plan.key;
                return(
                  <div key={plan.key} className="rounded-2xl border p-4 relative" style={{borderColor:plan.highlight?`${GOLD}60`:"rgba(255,255,255,0.1)",background:plan.highlight?`linear-gradient(160deg,${GOLD}12,rgba(0,0,0,0.4))`:"rgba(255,255,255,0.03)"}}>
                    {plan.highlight&&<div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{background:`linear-gradient(90deg,transparent,${GOLD},transparent)`}}/>}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-white">{plan.name}</span>
                        {plan.highlight&&<span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase" style={{background:GOLD,color:"#000"}}>Popular</span>}
                        {isCurrent&&<span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase" style={{background:"rgba(34,197,94,0.2)",color:"#86efac",border:"1px solid rgba(34,197,94,0.3)"}}>Current</span>}
                        {isTrialingThis&&<span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase" style={{background:"rgba(251,191,36,0.2)",color:"#fbbf24",border:"1px solid rgba(251,191,36,0.3)"}}>Trial</span>}
                      </div>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-black text-white">{plan.price}</span>
                        <span className="text-xs text-white/35">/mo</span>
                      </div>
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.map(f=>(
                        <li key={f} className="flex items-center gap-2 text-xs" style={{color:"rgba(255,255,255,0.6)"}}>
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{color:plan.highlight?GOLD:"rgba(255,255,255,0.3)"}}/>
                          {f}
                        </li>
                      ))}
                    </ul>
                    {showTrial&&<button onClick={()=>handleStartTrial(plan.key)} disabled={isTLoading} className="w-full py-2.5 rounded-xl text-sm font-black transition disabled:opacity-50 mb-2" style={{background:`linear-gradient(135deg,${GOLD_D}cc,${GOLD}cc)`,color:"#000",border:`1px solid ${GOLD}60`}}>
                      {isTLoading?"Starting...":"🎉 Start 7-Day Free Trial"}
                    </button>}
                    <button onClick={()=>isCurrent||isTrialingThis?handlePortal():handleCheckout(plan.key)} disabled={isLoading||portalLoading}
                      className="w-full py-2.5 rounded-xl text-sm font-black transition disabled:opacity-50"
                      style={{background:isCurrent?"rgba(34,197,94,0.15)":isTrialingThis?"rgba(251,191,36,0.15)":plan.highlight?`linear-gradient(135deg,${GOLD_D},${GOLD})`:"rgba(255,255,255,0.08)",color:isCurrent?"#86efac":isTrialingThis?"#fbbf24":plan.highlight?"#000":"rgba(255,255,255,0.7)",border:isCurrent?"1px solid rgba(34,197,94,0.3)":isTrialingThis?"1px solid rgba(251,191,36,0.3)":"none"}}>
                      {isLoading?"Loading...":isCurrent?"✓ Current Plan":isTrialingThis?"Manage Trial →":"Subscribe"}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <div className="grid grid-cols-4 min-w-[580px]">
                <div className="px-5 py-5 border-b border-r" style={{borderColor:"rgba(255,255,255,0.07)"}}/>
                {([{key:"starter",name:"Creator",price:"$47",highlight:false,trialEligible:true},{key:"viral",name:"Viral",price:"$97",highlight:true,trialEligible:true},{key:"agency",name:"Agency",price:"$297",highlight:false,trialEligible:false}] as const).map((plan,i)=>{
                  const isCurrent=_pricingIsActive&&subscription?.plan===plan.key;
                  const isTrialingThis=_pricingIsTrialing&&subscription?.plan===plan.key;
                  const showTrial=plan.trialEligible&&!_pricingIsActive&&!_pricingIsTrialing&&!_pricingTrialUsed;
                  const isLoading=checkoutLoading===plan.key;
                  const isTLoading=trialLoading===plan.key;
                  return(
                    <div key={plan.key} className={`px-5 py-5 border-b ${i<2?"border-r":""} relative`} style={{borderColor:"rgba(255,255,255,0.07)",background:plan.highlight?`linear-gradient(160deg,${GOLD}0d,transparent)`:"transparent"}}>
                      {plan.highlight&&<div className="absolute top-0 left-0 right-0 h-0.5" style={{background:`linear-gradient(90deg,transparent,${GOLD},transparent)`}}/>}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-black text-white">{plan.name}</span>
                        {plan.highlight&&<span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase" style={{background:GOLD,color:"#000"}}>Popular</span>}
                        {isCurrent&&<span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase" style={{background:"rgba(34,197,94,0.2)",color:"#86efac",border:"1px solid rgba(34,197,94,0.3)"}}>Current</span>}
                        {isTrialingThis&&<span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase" style={{background:"rgba(251,191,36,0.2)",color:"#fbbf24",border:"1px solid rgba(251,191,36,0.3)"}}>Trial</span>}
                      </div>
                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-2xl font-black text-white">{plan.price}</span>
                        <span className="text-xs text-white/35">/mo</span>
                      </div>
                      {showTrial&&<button onClick={()=>handleStartTrial(plan.key)} disabled={isTLoading} className="w-full py-1.5 rounded-lg text-[11px] font-black transition disabled:opacity-50 mb-1.5 hover:brightness-110" style={{background:`linear-gradient(135deg,${GOLD_D}cc,${GOLD}cc)`,color:"#000",border:`1px solid ${GOLD}50`}}>
                        {isTLoading?"Starting...":"🎉 Free Trial"}
                      </button>}
                      <button onClick={()=>isCurrent||isTrialingThis?handlePortal():handleCheckout(plan.key)} disabled={isLoading||portalLoading}
                        className="w-full py-2 rounded-lg text-xs font-black transition disabled:opacity-50 hover:brightness-110"
                        style={{background:isCurrent?"rgba(34,197,94,0.15)":isTrialingThis?"rgba(251,191,36,0.15)":plan.highlight?`linear-gradient(135deg,${GOLD_D},${GOLD})`:"rgba(255,255,255,0.08)",color:isCurrent?"#86efac":isTrialingThis?"#fbbf24":plan.highlight?"#000":"rgba(255,255,255,0.7)",border:isCurrent?"1px solid rgba(34,197,94,0.3)":isTrialingThis?"1px solid rgba(251,191,36,0.3)":"none"}}>
                        {isLoading?"Loading...":isCurrent?"✓ Current Plan":isTrialingThis?"Manage →":"Subscribe"}
                      </button>
                    </div>
                  );
                })}
              </div>
              {([
                ["AI Captions / mo",["15","100","Unlimited"]],
                ["Scheduled Media Posts",["30","100","Unlimited"]],
                ["Text Posts / mo",["60","200","Unlimited"]],
                ["Social Media Accounts",["3","All","All"]],
                ["AI Video / mo",["60s","180s","540s"]],
                ["Content Repurposing",[false,true,true]],
                ["AI Strategist / mo",["—","4","12"]],
                ["Client Workspaces",["1","1","3 (+$49/ea)"]],
                ["Priority Support",[false,false,true]],
                ["Onboarding Call",[false,false,true]],
              ] as const).map(([feature,vals],rowIdx)=>(
                <div key={String(feature)} className="grid grid-cols-4 min-w-[580px]" style={{background:rowIdx%2===0?"transparent":"rgba(255,255,255,0.018)"}}>
                  <div className="px-5 py-3 text-sm text-white/55 font-medium border-r flex items-center" style={{borderColor:"rgba(255,255,255,0.07)"}}>{feature}</div>
                  {([{key:"starter",highlight:false},{key:"viral",highlight:true},{key:"agency",highlight:false}] as const).map((plan,i)=>{
                    const val=vals[i];
                    return(
                      <div key={plan.key} className={`px-5 py-3 flex items-center justify-center ${i<2?"border-r":""}`} style={{borderColor:"rgba(255,255,255,0.07)",background:plan.highlight?`${GOLD}05`:"transparent"}}>
                        {typeof val==="boolean"?val?<CheckCircle2 className="w-4 h-4 text-green-400"/>:<span className="text-white/15 text-base font-bold">—</span>:<span className="text-sm font-semibold" style={{color:plan.highlight?GOLD_L:"rgba(255,255,255,0.7)"}}>{val}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            </>)})()}
            <div className="px-4 md:px-6 py-4 border-t" style={{borderColor:"rgba(255,255,255,0.07)"}}>
              <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">💳 Add-On Credits: One-Time Purchase</div>
              <div className="grid grid-cols-2 gap-2">
                {([{key:"video_60s",label:"+ 60 Video Seconds",price:"$18"},{key:"video_180s",label:"+ 180 Video Seconds",price:"$54"},{key:"captions_25",label:"+ 25 AI Captions",price:"$7"},{key:"strategies_4",label:"+ 4 Content Strategies",price:"$20"}] as const).map(addon=>(
                  <button key={addon.key} onClick={()=>handleAddonCheckout(addon.key)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl border transition hover:brightness-110"
                    style={{background:`${GOLD}0a`,borderColor:`${GOLD}30`}}>
                    <span className="text-xs font-bold text-white/60">{addon.label}</span>
                    <span className="text-sm font-black ml-2" style={{color:GOLD}}>{addon.price}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-white/20 mt-2">Credits added instantly after purchase.</p>
            </div>
            <div className="px-4 md:px-6 pb-6 border-t pt-4" style={{borderColor:"rgba(255,255,255,0.07)"}}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-white/25">Have a promo code?</span>
                <div className="flex gap-2">
                  <input type="text" value={promoCode} onChange={e=>{setPromoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""));setPromoError("");setPromoSuccess("");}}
                    onKeyDown={e=>e.key==="Enter"&&handlePromoRedeem()} placeholder="Enter code"
                    className="rounded-lg px-3 py-1.5 text-xs font-bold font-mono outline-none"
                    style={{width:110,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#fff"}}/>
                  <button onClick={handlePromoRedeem} disabled={promoLoading||!promoCode.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50"
                    style={{background:`linear-gradient(135deg,${GOLD_D},${GOLD})`,color:"#000"}}>
                    {promoLoading?"...":"Apply"}
                  </button>
                </div>
                {promoError&&<div style={{fontSize:11,color:"#f87171"}}>{promoError}</div>}
                {promoSuccess&&<div style={{fontSize:11,color:"rgb(74,222,128)"}}>{promoSuccess}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
      {addonModalOpen&&(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={()=>setAddonModalOpen(false)}/>
          <div className="relative w-full max-w-sm rounded-2xl border overflow-hidden shadow-2xl" style={{background:"linear-gradient(160deg,#1a1a1a,#111)",borderColor:"rgba(255,255,255,0.1)"}}>
            <div className="px-6 pt-6 pb-4 text-center border-b" style={{borderColor:"rgba(255,255,255,0.07)"}}>
              <div className="text-3xl mb-3">{addonFeature==="video_seconds"?"🎬":addonFeature==="captions"?"✨":"📅"}</div>
              <div className="text-base font-black text-white mb-1">{addonFeature==="video_seconds"?"Video Seconds Limit Reached":addonFeature==="captions"?"AI Caption Limit Reached":"Post Limit Reached"}</div>
              <div className="text-sm text-white/45">{addonFeature==="video_seconds"?`You have used ${addonUsed}s of your ${addonLimit}s monthly allowance.`:`You have used ${addonUsed} of ${addonLimit} this month.`}</div>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="text-xs font-bold text-white/30 uppercase tracking-wider">Get More: One-Time Purchase</div>
              {(addonFeature==="video_seconds"?[{key:"video_60s",label:"+ 60 Video Seconds",price:"$18"},{key:"video_180s",label:"+ 180 Video Seconds",price:"$54"}]:addonFeature==="captions"?[{key:"captions_25",label:"+ 25 AI Captions",price:"$7"},{key:"strategies_4",label:"+ 4 Content Strategies",price:"$20"}]:[]).map(addon=>(
                <button key={addon.key} onClick={()=>{setAddonModalOpen(false);handleAddonCheckout(addon.key);}}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition hover:brightness-110"
                  style={{background:`${GOLD}12`,borderColor:`${GOLD}40`}}>
                  <span className="text-sm font-bold" style={{color:GOLD_L}}>{addon.label}</span>
                  <span className="text-lg font-black" style={{color:GOLD}}>{addon.price}</span>
                </button>
              ))}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px" style={{background:"rgba(255,255,255,0.07)"}}/>
                <span className="text-xs text-white/25 font-semibold">OR</span>
                <div className="flex-1 h-px" style={{background:"rgba(255,255,255,0.07)"}}/>
              </div>
              <button onClick={()=>{setAddonModalOpen(false);setPricingOpen(true);}} className="w-full py-3 rounded-xl text-sm font-bold transition hover:brightness-110" style={{background:`linear-gradient(135deg,${GOLD_D},${GOLD},${GOLD_L})`,color:"#000"}}>↑ Upgrade Your Plan for More</button>
              <button onClick={()=>setAddonModalOpen(false)} className="w-full py-2 rounded-xl text-xs text-white/25 hover:text-white/50 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancellation / Retention Modal ── */}
      {cancelModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 440, background: 'linear-gradient(170deg,#1a1a1a,#141414)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
            <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${GOLD_D} 15%, ${GOLD} 40%, ${GOLD_L} 55%, ${GOLD} 75%, transparent)` }} />
            <div style={{ padding: '28px 28px 32px' }}>
              {retentionSuccess ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                  <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 10 }}>You're all set!</h2>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                    Your <span style={{ color: GOLD_L, fontWeight: 700 }}>25% discount</span> has been applied to your next billing cycle. We're glad you're staying!
                  </p>
                  <button onClick={() => setCancelModalOpen(false)}
                    style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer', background: `linear-gradient(135deg,${GOLD_D},${GOLD} 50%,${GOLD_L})`, color: '#000' }}>
                    Continue Using Infinite Media
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>😢</div>
                    <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Before you go...</h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6 }}>
                      We'd hate to see you leave. Your account and all your content will be lost when you cancel.
                    </p>
                  </div>

                  {offerEligible && (
                    <div style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}40`, borderRadius: 14, padding: '18px 20px', marginBottom: 20, textAlign: 'center' }}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>🎁</div>
                      <p style={{ color: GOLD_L, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Special Offer — Just For You</p>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>
                        Stay and get <span style={{ color: GOLD_L, fontWeight: 700 }}>25% off your next month</span>. This one-time offer won't be available again.
                      </p>
                      {retentionError && (
                        <p style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>{retentionError}</p>
                      )}
                      <button onClick={handleRetentionOffer} disabled={retentionLoading}
                        style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 800, cursor: retentionLoading ? 'not-allowed' : 'pointer', background: `linear-gradient(135deg,${GOLD_D},${GOLD} 50%,${GOLD_L})`, color: '#000', opacity: retentionLoading ? 0.7 : 1 }}>
                        {retentionLoading ? 'Applying discount...' : 'Yes, give me 25% off!'}
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button onClick={() => setCancelModalOpen(false)}
                      style={{ width: '100%', padding: '12px 0', borderRadius: 12, border: `1px solid ${GOLD}40`, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.6)' }}>
                      Never mind, keep my account
                    </button>
                    <button onClick={handleProceedToCancel}
                      style={{ width: '100%', padding: '10px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.25)' }}>
                      Continue to cancel anyway
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConnectAccountsModal
        open={connectModalOpen} onClose={() => setConnectModalOpen(false)}
        integrations={activeIntegrations} onConnectPostiz={handleConnect}
        integrationsLoading={integrationsLoading}
        onRefresh={(force) => {
          if (activeWorkspaceId && currentUserId) {
            setIntegrationsLoading(true);
            fetchChannels(currentUserId, force, activeWorkspaceId)
              .then(setWorkspaceIntegrations).catch(() => {}).finally(() => setIntegrationsLoading(false));
          } else { loadIntegrations(force); }
        }}
        onDisconnectPlatform={handleDisconnectPlatform}
        currentUser={currentUser}
        workspaceId={activeWorkspaceId}
        isSubscriptionActive={!!(subscription?.status === 'active' || subscription?.stripe_customer_id?.startsWith('promo_') || (subscription?.status === 'trialing' && !!subscription?.current_period_end && new Date(subscription.current_period_end) > new Date()))}
        onNeedsPricing={() => setPricingOpen(true)}
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
