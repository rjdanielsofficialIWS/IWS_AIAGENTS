import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Loader, CheckCircle2, AlertCircle, Sparkles, X,
  Plus, ChevronLeft, ChevronRight, Calendar, Clock,
  Video, Link2, Link2Off, RefreshCw, Send, Edit3, Image,
  ChevronDown, ChevronUp, Play, Pause, Volume2, VolumeX, Maximize2, LogOut,
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

// Social media posting delegated to Ayrshare.
const ORG_ID              = '56bd14a6-07ab-4c57-bbfd-28d6d7d9eaa6';

const SUPABASE_URL = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

// LocalStorage keys
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

type ViewMode = 'composer' | 'calendar';

type ScheduledPost = {
  id: string; content: string; platforms: string[];
  scheduledAt: Date; status: 'scheduled' | 'published' | 'failed';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateState() {
  const a = new Uint8Array(16);
  window.crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

async function ayrsharePost(payload: {
  platforms: string[]; post: string; mediaUrls?: string[]; scheduleDate?: string;
}) {
  // Get live session JWT so the edge function can identify the user server-side
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';
  const res = await fetch('https://wcbkzebgcsfvrugibsjr.supabase.co/functions/v1/ayrshare-post', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Post failed (${res.status})`);
  }
  return res.json();
}

async function fetchChannels(userId: string, force = false): Promise<PostizIntegration[]> {
  if (!userId) return [];
  const url = `https://wcbkzebgcsfvrugibsjr.supabase.co/functions/v1/ayrshare-channels?userId=${encodeURIComponent(userId)}${force ? '&force=true' : ''}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const channels: PostizIntegration[] = Array.isArray(data?.channels) ? data.channels : [];
  // Normalise: if identifier is empty/missing, fall back to id (the platform slug)
  return channels.map(ch => ({ ...ch, identifier: ch.identifier || ch.id || '' }));
}

// Deletes a file from storage (Supabase or R2) by its public URL.
// Fire-and-forget — errors are logged but never surfaced to the user.
async function deleteMediaFromStorage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/delete-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch (e) {
    console.warn('[deleteMediaFromStorage] failed silently:', e);
  }
}

// Uploads a file to Supabase Storage via the upload-media edge function.
// Returns the full public URL of the uploaded file.
// For files >5MB: uses a signed upload URL (browser → Storage directly, no size limit).
// For files <5MB: direct binary POST through the edge function (legacy path).
async function uploadViaNativeXHR(
  file: File | Blob,
  kind: 'video' | 'image',
  onProgress?: (pct: number) => void
): Promise<string> {
  const ext = file instanceof File
    ? file.name.split('.').pop() || (kind === 'video' ? 'mp4' : 'jpg')
    : kind === 'video' ? 'mp4' : 'wav';
  const filePath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const contentType = file instanceof File ? file.type : (kind === 'video' ? 'video/mp4' : 'audio/wav');
  const fileSize = file instanceof File ? file.size : (file as Blob).size;
  const DIRECT_LIMIT = 4 * 1024 * 1024; // 4MB — stay safely under the 6MB edge fn limit

  // ── Large file: get signed URL, upload directly to Storage ────────────────
  if (fileSize > DIRECT_LIMIT) {
    // Step 1: ask edge function for a signed upload URL
    const signRes = await fetch(`${SUPABASE_URL}/functions/v1/upload-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sign', filePath, contentType, fileSize }),
    });
    if (!signRes.ok) {
      const err = await signRes.json().catch(() => ({}));
      throw new Error(err.error || `Failed to get upload URL (${signRes.status})`);
    }
    const { signedUrl, publicUrl, provider } = await signRes.json();

    // Step 2: PUT file directly to storage via the signed URL (no size limit)
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', contentType);
      // R2 presigned URLs require x-amz-content-sha256 set to UNSIGNED-PAYLOAD
      if (provider === 'r2') {
        xhr.setRequestHeader('x-amz-content-sha256', 'UNSIGNED-PAYLOAD');
      }
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(publicUrl);
        } else {
          reject(new Error(`Upload failed: ${xhr.status} — ${xhr.responseText}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });
  }

  // ── Small file: direct binary POST through edge function ─────────────────
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SUPABASE_URL}/functions/v1/upload-media`);
    xhr.setRequestHeader('x-file-path', filePath);
    xhr.setRequestHeader('content-type', contentType);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (!data.url) throw new Error('No URL in response');
          resolve(data.url);
        } catch {
          reject(new Error('Invalid response from upload function'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status} — ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
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
      // uploadViaNativeXHR now returns a full public URL from Supabase Storage
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
    snapchat: {
      bg: '#FFFC00',
      node: <svg width={iconPx} height={iconPx} viewBox="0 0 24 24" fill="black"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.479-.105l-.036-.69c-.098-1.626-.229-3.651.294-4.836C7.867 1.07 11.218.793 12.206.793z"/></svg>,
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
// Nango-powered OAuth — no developer apps needed from you.
// Nango's pre-approved OAuth apps handle Instagram, TikTok, LinkedIn, YouTube, X, Facebook.

function ConnectAccountsModal({
  open, onClose, integrations, onConnectPostiz, integrationsLoading, onRefresh, currentUser,
}: {
  open: boolean; onClose: () => void; integrations: PostizIntegration[];
  onConnectPostiz: () => void; integrationsLoading: boolean;
  onRefresh: (force?: boolean) => void;
  currentUser: { id: string; email: string } | null;
}) {
  const authUser = currentUser;
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveEmail, setLiveEmail] = useState<string>('');

  // Fetch live user email when modal opens — always reflects actual session
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
      // Step 1: Get the live session token — this is the JWT Supabase issued for whoever
      // is actually signed in right now. We send it to the edge function so the SERVER
      // can verify the real user, making it impossible to use a wrong/cached userId.
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();

      if (sessionErr || !session) {
        setConnecting(false);
        onConnectPostiz();
        return;
      }

      console.log('[ConnectModal] Calling edge function as:', session.user.email, 'id:', session.user.id);

      // Step 2: Call the edge function as a POST with the JWT in the Authorization header.
      // The server verifies the JWT and looks up the correct Ayrshare profile.
      // We get back a connectUrl (the Ayrshare OAuth URL for this specific user).
      const res = await fetch('https://wcbkzebgcsfvrugibsjr.supabase.co/functions/v1/ayrshare-connect', {
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

      // Step 3: Open the Ayrshare connect URL.
      // The edge function appends logout=true to the JWT URL, which forces Ayrshare to
      // clear any existing session before logging in as this profile's JWT.
      // This handles the case where a user (or the account owner) was previously logged
      // into profile.ayrshare.com — without logout=true, the existing cookie overrides the JWT.
      localStorage.setItem('postiz_social_return', '1');
      window.open(connectUrl, '_blank');
      setConnecting(false);
      // Note: channel refresh happens in the page-return useEffect (with force=true + 1.5s delay)
      // when the user comes back to this tab. No need to poll here.
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
          <div>
            <h2 className="text-base font-bold text-white">Connect Channels</h2>
            <p className="text-sm text-white/40 mt-0.5">
              {liveEmail ? `Account: ${liveEmail}` : 'Link your social accounts to start scheduling'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">

          {/* Connected accounts list */}
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

// ─── RepurposePostSelector ────────────────────────────────────────────────────

function RepurposePostSelector({ posts, onUsePost }: {
  posts: { twitter: string[]; linkedin: string[] };
  onUsePost: (text: string) => void;
}) {
  const [tab, setTab] = useState<'twitter' | 'linkedin'>('twitter');
  const [editedPosts, setEditedPosts] = useState<{ twitter: string[]; linkedin: string[] }>({
    twitter: [...(posts.twitter || [])],
    linkedin: [...(posts.linkedin || [])],
  });
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx]   = useState<number | null>(null);
  const currentList = editedPosts[tab];
  const handleSelect = (idx: number) => { setSelectedIdx(idx === selectedIdx ? null : idx); setEditingIdx(null); };
  const handleEdit   = (idx: number, val: string) => {
    setEditedPosts(prev => ({ ...prev, [tab]: prev[tab].map((p, i) => i === idx ? val : p) }));
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['twitter', 'linkedin'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setSelectedIdx(null); setEditingIdx(null); }}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold border transition"
            style={{ borderColor: tab === t ? GOLD : BORDER, background: tab === t ? `${GOLD}18` : 'transparent', color: tab === t ? GOLD_L : 'rgba(255,255,255,0.35)' }}>
            {t === 'twitter' ? '𝕏 Twitter/X (10)' : 'in LinkedIn (10)'}
          </button>
        ))}
      </div>
      <div className="text-xs text-white/30 px-0.5">Tap to select · tap again to edit · one post at a time</div>
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {currentList.map((post, idx) => {
          const isSelected = selectedIdx === idx;
          const isEditing  = editingIdx === idx;
          return (
            <div key={idx} className="rounded-xl border overflow-hidden transition-all"
              style={{ borderColor: isSelected ? GOLD : BORDER, background: isSelected ? `${GOLD}08` : 'rgba(0,0,0,0.2)' }}>
              <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
                <button onClick={() => handleSelect(idx)}
                  className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition"
                  style={{ borderColor: isSelected ? GOLD : 'rgba(255,255,255,0.2)', background: isSelected ? GOLD : 'transparent' }}>
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-black" />}
                </button>
                <span className="text-xs text-white/25 font-bold">#{idx + 1}</span>
                <div className="flex-1" />
                <button onClick={() => setEditingIdx(isEditing ? null : idx)}
                  className="text-xs px-2 py-0.5 rounded-md transition hover:bg-white/10"
                  style={{ color: isEditing ? GOLD : 'rgba(255,255,255,0.25)' }}>
                  {isEditing ? 'Done' : 'Edit'}
                </button>
              </div>
              {isEditing ? (
                <textarea value={post} onChange={e => handleEdit(idx, e.target.value)}
                  rows={tab === 'linkedin' ? 6 : 3}
                  className="w-full px-3 pb-3 bg-transparent text-xs text-white leading-relaxed outline-none resize-none" autoFocus />
              ) : (
                <button onClick={() => handleSelect(idx)} className="w-full text-left px-3 pb-3 text-xs leading-relaxed"
                  style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)' }}>
                  {post}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {selectedIdx !== null && (
        <button onClick={() => onUsePost(currentList[selectedIdx!])}
          className="w-full py-2.5 rounded-xl text-xs font-bold transition hover:brightness-110"
          style={{ background: GOLD, color: '#000' }}>
          ✓ Use Post #{selectedIdx + 1} in Composer
        </button>
      )}
    </div>
  );
}

// ─── RepurposeIdeasModal (Content Ideas) ─────────────────────────────────────

function RepurposeIdeasModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [captionMode, setCaptionMode] = useState<'from_video' | 'from_description'>('from_description');
  const [description, setDescription] = useState('');
  const [tone, setTone]               = useState('');
  const [videoFile, setVideoFile]     = useState<File | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [ideas, setIdeas]             = useState<any | null>(null);

  const handleGenerate = async () => {
    setLoading(true); setError(null); setIdeas(null);
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

  const reset = () => { setDescription(''); setTone(''); setVideoFile(null); setIdeas(null); setError(null); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-xl rounded-t-2xl md:rounded-2xl border overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: SURFACE, borderColor: BORDER }}>
        <div className="flex items-center justify-between px-6 py-5 border-b shrink-0" style={{ borderColor: BORDER }}>
          <div>
            <h2 className="text-base font-bold text-white">♻️ Content Ideas</h2>
            <p className="text-sm text-white/40 mt-0.5">Find new angles and formats from your existing video</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
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
            <button onClick={handleGenerate} disabled={loading}
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
                    {ideas.short_clips.map((clip: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                        <div className="text-sm font-bold text-white">{clip.title}</div>
                        <div className="text-xs text-white/45 mt-1">{clip.angle}</div>
                        <div className="text-xs font-semibold mt-1.5" style={{ color: GOLD }}>{clip.platform}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ideas.social_hooks?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">🪝 Hook Ideas</div>
                  <div className="space-y-1.5">
                    {ideas.social_hooks.map((hook: string, i: number) => (
                      <div key={i} className="p-3 rounded-xl border text-sm text-white/60 leading-relaxed" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>{hook}</div>
                    ))}
                  </div>
                </div>
              )}
              {ideas.blog_angles?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">✍️ Blog / Article Angles</div>
                  <div className="space-y-2">
                    {ideas.blog_angles.map((b: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                        <div className="text-sm font-bold text-white">{b.headline}</div>
                        <div className="text-xs text-white/45 mt-1">{b.angle}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ideas.other_formats?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">📦 Other Formats</div>
                  <div className="space-y-2">
                    {ideas.other_formats.map((f: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl border" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                        <div className="text-sm font-bold text-white">{f.format}</div>
                        <div className="text-xs text-white/45 mt-1">{f.concept}</div>
                      </div>
                    ))}
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

  const handleTimeUpdate    = () => setCurrentTime(videoRef.current?.currentTime ?? 0);
  const handleLoadedMetadata = () => setDuration(videoRef.current?.duration ?? 0);
  const handleEnded         = () => { setPlaying(false); };

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

// ─── PostComposerModal ────────────────────────────────────────────────────────
// Unified modal with a Post Type selector at the top:
//   📎 Media Post  → video/image + caption + AI captions (for all platforms)
//   ✍️ Text Post   → X & LinkedIn tabs, manual textarea + AI generator, schedule

function PostComposerModal({
  open, onClose, integrations, userId, defaultDate, onSuccess,
}: {
  open: boolean; onClose: () => void; integrations: PostizIntegration[];
  userId: string | null; defaultDate?: Date; onSuccess?: () => void;
}) {
  // ── Shared ────────────────────────────────────────────────────────────────
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

  // ── Media Post state ──────────────────────────────────────────────────────
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [content, setContent]           = useState('');
  const [videoFile, setVideoFile]       = useState<File | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [videoUpload, setVideoUpload]   = useState<UploadState>({ status: 'idle' });
  const [imageFiles, setImageFiles]     = useState<File[]>([]);
  const [imageUploads, setImageUploads] = useState<UploadState[]>([]);
  // Caption mode: 'manual' = single textarea, 'ai' = per-platform AI captions
  type CaptionType = 'manual' | 'ai';
  const [captionType, setCaptionType]   = useState<CaptionType>('manual');
  // AI caption state
  type CaptionMode = 'from_video' | 'from_description';
  const [captionMode, setCaptionMode]   = useState<CaptionMode>('from_video');
  const [aiTone, setAiTone]             = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiError, setAiError]           = useState<string | null>(null);
  const [transcript, setTranscript]     = useState<string | null>(null);
  // generatedCaptions: platform → caption text (editable)
  const [generatedCaptions, setGeneratedCaptions] = useState<Record<string, string> | null>(null);

  // ── Text Post state ───────────────────────────────────────────────────────
  const [textTab, setTextTab]           = useState<'twitter' | 'linkedin'>('twitter');
  const [xText, setXText]               = useState('');
  const [linkedinText, setLinkedinText] = useState('');
  // AI text-post state
  const [showTextAi, setShowTextAi]     = useState(false);
  const [textAiMode, setTextAiMode]     = useState<'from_video' | 'from_description'>('from_description');
  const [textAiDesc, setTextAiDesc]     = useState('');
  const [textAiTone, setTextAiTone]     = useState('');
  const [textAiVideo, setTextAiVideo]   = useState<File | null>(null);
  const [textAiLoading, setTextAiLoading] = useState(false);
  const [textAiError, setTextAiError]   = useState<string | null>(null);
  const [textAiPosts, setTextAiPosts]   = useState<{ twitter: string[]; linkedin: string[] } | null>(null);
  const [textAiSelected, setTextAiSelected] = useState<{ twitter: number | null; linkedin: number | null }>({ twitter: null, linkedin: null });

  // ── Derived ───────────────────────────────────────────────────────────────
  const xInteg    = integrations.find(i => ['x','twitter'].includes((i.profile||i.identifier||'').toLowerCase()));
  const liInteg   = integrations.find(i => (i.profile||i.identifier||'').toLowerCase().startsWith('linkedin'));
  const textCurrent = textTab === 'twitter' ? xText : linkedinText;
  const setTextCurrent = (v: string) => { if (textTab === 'twitter') setXText(v); else setLinkedinText(v); };
  const textHasConn   = textTab === 'twitter' ? !!xInteg : !!liInteg;

  // Only return the platforms actually selected — no fallback to all platforms
  const getSelectedPlatforms = () =>
    selectedIntegrations.map(id => integrations.find(i => i.id === id)?.identifier).filter(Boolean) as string[];

  // ── Reset ──────────────────────────────────────────────────────────────────
  const fullReset = (skipDelete = false) => {
    // Delete any uploaded media from storage before wiping state
    if (!skipDelete) {
      setVideoUpload(prev => {
        const url = (prev as any).url;
        if (url) deleteMediaFromStorage(url);
        return { status: 'idle' };
      });
      setImageUploads(prev => {
        prev.forEach(u => { const url = (u as any).url; if (url) deleteMediaFromStorage(url); });
        return [];
      });
    } else {
      setVideoUpload({ status: 'idle' });
      setImageUploads([]);
    }
    setPostType('media');
    setSelectedIntegrations([]); setContent('');
    setVideoFile(null);
    setVideoObjectUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setImageFiles([]);
    setSubmitOk(false); setSubmitError(null);
    setTranscript(null); setGeneratedCaptions(null);
    setAiError(null);
    setCaptionType('manual'); setAiDescription(''); setAiTone('');
    setXText(''); setLinkedinText(''); setTextTab('twitter');
    setShowTextAi(false); setTextAiDesc(''); setTextAiTone('');
    setTextAiVideo(null); setTextAiPosts(null); setTextAiError(null);
    setTextAiSelected({ twitter: null, linkedin: null });
  };

  useEffect(() => { if (!open) fullReset(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (defaultDate) {
      const d = new Date(defaultDate); d.setHours(10, 0, 0, 0);
      setScheduleDate(d.toISOString().slice(0, 16));
    }
  }, [defaultDate]);

  // ── Media upload ───────────────────────────────────────────────────────────
  const uploadFileForPost = async (file: File, kind: 'video' | 'image', setU: (s: UploadState) => void) => {
    setU({ status: 'uploading', progress: 0 });
    try {
      const url = await uploadViaNativeXHR(file, kind, pct => setU({ status: 'uploading', progress: pct }));
      setU({ status: 'done', path: '', url, fileName: file.name, mime: file.type, size: file.size });
    } catch (e: any) {
      setU({ status: 'error', message: e.message || 'Upload failed' });
    }
  };

  // ── AI caption generation (Media mode) ────────────────────────────────────
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
      if (data.captions) {
        setGeneratedCaptions(data.captions);
      }
    } catch (e: any) { setAiError(e.message || 'Something went wrong'); }
    finally { setAiLoading(false); }
  };

  // ── AI text-post generation (Text mode) ───────────────────────────────────
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
  };

  // ── Submit (Media mode) ───────────────────────────────────────────────────
  const handleMediaSubmit = async () => {
    if (!userId)                      { setSubmitError('Sign in to post.'); return; }
    if (!selectedIntegrations.length) { setSubmitError('Select at least one channel.'); return; }
    if (captionType === 'manual' && !content.trim()) { setSubmitError('Write a caption first.'); return; }
    if (captionType === 'ai' && !generatedCaptions)  { setSubmitError('Generate AI captions first.'); return; }
    if (videoUpload.status === 'uploading' || imageUploads.some(u => u.status === 'uploading')) {
      setSubmitError('Wait for media to finish uploading.'); return;
    }
    setSubmitting(true); setSubmitError(null);
    try {
      const mediaUrls: string[] = [];
      imageUploads.forEach(u => { if (u.status === 'done' && (u as any).url) mediaUrls.push((u as any).url); });
      if (videoUpload.status === 'done' && (videoUpload as any).url) mediaUrls.push((videoUpload as any).url);
      const sd = scheduleType === 'schedule' ? new Date(scheduleDateStr).toISOString() : undefined;

      if (captionType === 'manual') {
        // Single post to all selected platforms with one caption
        const platforms = selectedIntegrations
          .map(id => { const i = integrations.find(x => x.id === id); return i?.identifier || i?.id || ''; })
          .filter(Boolean);
        await ayrsharePost({ platforms, post: content, mediaUrls, scheduleDate: sd });
      } else {
        // Per-platform posts — each selected platform gets its own caption
        const postPromises = selectedIntegrations.map(async (integId) => {
          const integ = integrations.find(i => i.id === integId);
          if (!integ) return;
          const platformId = integ.identifier || integ.id || '';
          // Find caption: try exact match, then case-insensitive, fall back to first available
          const caption = generatedCaptions![platformId]
            ?? generatedCaptions![platformId.toLowerCase()]
            ?? Object.values(generatedCaptions!)[0]
            ?? '';
          if (!caption) return;
          await ayrsharePost({ platforms: [platformId], post: caption, mediaUrls, scheduleDate: sd });
        });
        await Promise.all(postPromises);
      }

      // Delete uploaded media from storage now that it's been posted
      const uploadedMediaUrls: string[] = [];
      imageUploads.forEach(u => { const url = (u as any).url; if (url) uploadedMediaUrls.push(url); });
      const videoUrl = (videoUpload as any).url;
      if (videoUrl) uploadedMediaUrls.push(videoUrl);
      uploadedMediaUrls.forEach(url => deleteMediaFromStorage(url));

      setSubmitOk(true);
      setTimeout(() => { onClose(); onSuccess?.(); }, 1600);
    } catch (e: any) { setSubmitError(e.message || 'Failed to post'); }
    finally { setSubmitting(false); }
  };

  // ── Submit (Text mode) ────────────────────────────────────────────────────
  const handleTextSubmit = async () => {
    const text = textTab === 'twitter' ? xText : linkedinText;
    if (!text.trim())    { setSubmitError('Write something first.'); return; }
    if (!textHasConn)    { setSubmitError(`No ${textTab === 'twitter' ? 'Twitter/X' : 'LinkedIn'} account connected.`); return; }
    setSubmitting(true); setSubmitError(null);
    try {
      const sd = scheduleType === 'schedule' ? new Date(scheduleDateStr).toISOString() : undefined;
      await ayrsharePost({ platforms: [textTab === 'twitter' ? 'x' : 'linkedin'], post: text, scheduleDate: sd });
      setSubmitOk(true);
      if (textTab === 'twitter') setXText(''); else setLinkedinText('');
      setTimeout(() => setSubmitOk(false), 3000);
    } catch (e: any) { setSubmitError(e.message || 'Post failed'); }
    finally { setSubmitting(false); }
  };

  if (!open) return null;

  // ── Shared schedule UI ─────────────────────────────────────────────────────
  const ScheduleSection = () => (
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
    <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-2xl flex flex-col border overflow-hidden shadow-2xl rounded-t-2xl md:rounded-2xl max-h-[92vh] md:max-h-[90vh]"
        style={{ background: SURFACE, borderColor: BORDER }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20 md:hidden" />
          <h2 className="text-base font-bold text-white">Create Post</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/30 hover:text-white transition"><X className="w-4 h-4" /></button>
        </div>

        {/* Post Type selector */}
        <div className="px-4 md:px-6 pt-4 pb-1 shrink-0">
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
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-5">

          {/* ════════════════ MEDIA POST ════════════════ */}
          {postType === 'media' && (
            <>
              {/* Channel selector */}
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
                            // Reset captions when channel selection changes
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

              {/* Media upload buttons */}
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

              {/* Media previews */}
              {(imageFiles.length > 0 || videoFile) && (
                <div className="space-y-3">
                  {videoFile && videoObjectUrl && (
                    <VideoPreviewCard file={videoFile} objectUrl={videoObjectUrl} uploadState={videoUpload}
                      onRemove={() => {
                        URL.revokeObjectURL(videoObjectUrl);
                        // Delete from storage if already uploaded
                        const url = (videoUpload as any).url;
                        if (url) deleteMediaFromStorage(url);
                        setVideoFile(null); setVideoObjectUrl(null); setVideoUpload({ status: 'idle' });
                      }} />
                  )}
                  {imageFiles.length === 1 && (
                    <ImagePreviewCard file={imageFiles[0]} uploadState={imageUploads[0] ?? { status: 'idle' }}
                      onRemove={() => {
                        const url = (imageUploads[0] as any)?.url;
                        if (url) deleteMediaFromStorage(url);
                        setImageFiles([]); setImageUploads([]);
                      }} />
                  )}
                  {imageFiles.length > 1 && (
                    <div className="grid grid-cols-2 gap-2">
                      {imageFiles.map((f, i) => (
                        <ImagePreviewCard key={i} file={f} uploadState={imageUploads[i] ?? { status: 'idle' }}
                          onRemove={() => {
                            const url = (imageUploads[i] as any)?.url;
                            if (url) deleteMediaFromStorage(url);
                            setImageFiles(prev => prev.filter((_, xi) => xi !== i));
                            setImageUploads(prev => prev.filter((_, xi) => xi !== i));
                          }} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Caption mode toggle */}
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

              {/* Manual caption */}
              {captionType === 'manual' && (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                  <textarea value={content} onChange={e => setContent(e.target.value)}
                    placeholder="Write your caption here…" rows={5}
                    className="w-full bg-transparent px-4 pt-4 pb-2 text-sm text-white placeholder-white/20 outline-none resize-none" />
                  <div className="flex items-center justify-end px-4 py-2 border-t" style={{ borderColor: BORDER }}>
                    <span className="text-xs" style={{ color: content.length > 280 ? '#f87171' : 'rgba(255,255,255,0.2)' }}>{content.length} chars</span>
                  </div>
                </div>
              )}

              {/* AI per-platform captions */}
              {captionType === 'ai' && (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${GOLD}30`, background: `${GOLD}05` }}>
                  <div className="px-4 pt-4 pb-3 space-y-3">
                    {/* Source toggle */}
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

                  {/* Per-platform caption cards — editable */}
                  {generatedCaptions && Object.keys(generatedCaptions).length > 0 && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: BORDER }}>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Captions generated — edit if needed, then post</span>
                      </div>
                      {Object.entries(generatedCaptions).map(([platform, caption]) => {
                        const integ = integrations.find(i => i.identifier === platform || i.identifier === platform.toLowerCase());
                        const p = PLATFORMS[platform as PlatformId];
                        return (
                          <div key={platform} className="rounded-xl border overflow-hidden" style={{ borderColor: p?.color ? `${p.color}30` : BORDER }}>
                            <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: p?.color ? `${p.color}20` : BORDER, background: p?.bg || 'rgba(0,0,0,0.2)' }}>
                              <PlatformIcon id={platform} size="sm" />
                              <span className="text-xs font-bold" style={{ color: p?.color || GOLD_L }}>{p?.label || integ?.name || platform}</span>
                              <span className="ml-auto text-[10px] text-white/25">{(caption as string).length} chars</span>
                            </div>
                            <textarea
                              value={caption as string}
                              onChange={e => setGeneratedCaptions(prev => prev ? { ...prev, [platform]: e.target.value } : prev)}
                              rows={4}
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

              <ScheduleSection />
            </>
          )}

          {/* ════════════════ TEXT POST ════════════════ */}
          {postType === 'text' && (
            <>
              {/* Platform tabs */}
              <div className="flex gap-2">
                {(['twitter', 'linkedin'] as const).map(p => {
                  const connected = p === 'twitter' ? !!xInteg : !!liInteg;
                  return (
                    <button key={p} onClick={() => { setTextTab(p); setSubmitError(null); setSubmitOk(false); }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2"
                      style={{ borderColor: textTab === p ? GOLD : BORDER, background: textTab === p ? `${GOLD}18` : 'transparent', color: textTab === p ? GOLD_L : 'rgba(255,255,255,0.35)' }}>
                      {p === 'twitter' ? '𝕏 Twitter/X' : 'in LinkedIn'}
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${connected ? 'bg-green-400' : 'bg-white/15'}`} />
                    </button>
                  );
                })}
              </div>

              {/* Text composer */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                <textarea
                  value={textCurrent}
                  onChange={e => setTextCurrent(e.target.value)}
                  placeholder={textTab === 'twitter' ? 'Write your X (Twitter) post here…' : 'Write your LinkedIn post here…'}
                  rows={textTab === 'linkedin' ? 7 : 5}
                  className="w-full bg-transparent px-4 pt-4 pb-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                />
                <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: BORDER }}>
                  <span className="text-xs text-white/20">{textCurrent.length} chars</span>
                  {textTab === 'twitter' && textCurrent.length > 280 && <span className="text-xs text-red-400 font-bold">Over 280 char limit</span>}
                </div>
              </div>

              {!textHasConn && (
                <div className="text-xs text-amber-400/70 flex items-center gap-1.5 px-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  No {textTab === 'twitter' ? 'Twitter/X' : 'LinkedIn'} account connected — add one in Channels.
                </div>
              )}

              {/* AI Generate (collapsible) */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${GOLD}30`, background: `${GOLD}05` }}>
                <button onClick={() => setShowTextAi(v => !v)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/4 transition">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: GOLD }}>AI Generate Posts</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform text-white/30 ${showTextAi ? 'rotate-90' : ''}`} />
                </button>
                {showTextAi && (
                  <div className="border-t px-4 pb-4 space-y-3" style={{ borderColor: BORDER }}>
                    <p className="text-xs text-white/35 pt-3">Generates 10 post ideas per platform. Click any to load it into the composer above.</p>
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
                      {textAiLoading ? <><Loader className="w-3.5 h-3.5 animate-spin" />{textAiMode === 'from_video' ? 'Transcribing…' : 'Generating…'}</> : <><Sparkles className="w-3.5 h-3.5" /> Generate 10 Posts Each</>}
                    </button>
                    {textAiPosts && (
                      <div className="space-y-2 pt-1">
                        <div className="flex gap-2">
                          {(['twitter', 'linkedin'] as const).map(p => (
                            <button key={p} onClick={() => setTextTab(p)}
                              className="flex-1 py-1.5 rounded-lg text-xs font-bold border transition"
                              style={{ borderColor: textTab === p ? GOLD : BORDER, background: textTab === p ? `${GOLD}15` : 'transparent', color: textTab === p ? GOLD_L : 'rgba(255,255,255,0.3)' }}>
                              {p === 'twitter' ? `𝕏 (${textAiPosts.twitter.length})` : `LinkedIn (${textAiPosts.linkedin.length})`}
                            </button>
                          ))}
                        </div>
                        <div className="text-xs text-white/25">Click any post to load it into the composer above ↑</div>
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {(textAiPosts[textTab] || []).map((post, idx) => {
                            const isSel = textAiSelected[textTab] === idx;
                            return (
                              <button key={idx} onClick={() => useTextAiPost(textTab, idx)}
                                className="w-full text-left px-3 py-2.5 rounded-xl border text-xs leading-relaxed transition"
                                style={{ borderColor: isSel ? GOLD : BORDER, background: isSel ? `${GOLD}10` : 'rgba(0,0,0,0.2)', color: isSel ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)' }}>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-white/20 font-bold">#{idx + 1}</span>
                                  <span className="text-white/15">{post.length}c</span>
                                  {isSel && <span className="ml-auto font-bold text-xs" style={{ color: GOLD }}>✓ In use</span>}
                                </div>
                                {post}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <ScheduleSection />
            </>
          )}

          {submitError && (
            <div className="flex items-start gap-2 p-3 rounded-xl border text-sm text-red-200" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t flex items-center justify-between gap-3 shrink-0" style={{ borderColor: BORDER }}>
          <span className="text-xs text-white/25">
            {postType === 'media'
              ? selectedIntegrations.length > 0
                  ? captionType === 'ai' && generatedCaptions
                    ? `${Object.keys(generatedCaptions).length} captions ready`
                    : `${selectedIntegrations.length} channel${selectedIntegrations.length !== 1 ? 's' : ''} selected`
                  : 'No channels selected'
              : textCurrent.length > 0 ? `${textCurrent.length} chars` : 'Nothing written yet'}
          </span>
          <button
            onClick={postType === 'media' ? handleMediaSubmit : handleTextSubmit}
            disabled={submitting || (postType === 'media' && submitOk)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
            style={{ background: submitOk ? '#22c55e' : GOLD, color: '#000' }}>
            {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Posting…</>
              : submitOk ? <><CheckCircle2 className="w-4 h-4" /> {scheduleType === 'schedule' ? 'Scheduled!' : 'Posted!'}</>
              : postType === 'media'
                ? <><Send className="w-4 h-4" /> {scheduleType === 'schedule' ? 'Schedule Post' : 'Post Now'}</>
                : <><Send className="w-4 h-4" /> {scheduleType === 'schedule' ? `Schedule to ${textTab === 'twitter' ? 'X' : 'LinkedIn'}` : `Post to ${textTab === 'twitter' ? 'X' : 'LinkedIn'}`}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CalendarPanel ────────────────────────────────────────────────────────────

function CalendarPanel({ userId, integrations }: { userId: string | null; integrations: PostizIntegration[] }) {
  const [currentDate, setCurrentDate]   = useState(new Date());
  const [posts, setPosts]               = useState<ScheduledPost[]>([]);
  const [loading, setLoading]           = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerDate, setComposerDate] = useState<Date | undefined>();
  const [repurposeOpen, setRepurposeOpen] = useState(false);

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
      const res  = await fetch(
        `https://wcbkzebgcsfvrugibsjr.supabase.co/functions/v1/ayrshare-scheduled?userId=${encodeURIComponent(userId)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      );
      const data = res.ok ? await res.json() : { posts: [] };
      const list = Array.isArray(data?.posts) ? data.posts : [];
      setPosts(list.map((p: any) => ({
        id:          p.id,
        content:     p.content || '',
        platforms:   Array.isArray(p.platforms) ? p.platforms : [],
        scheduledAt: new Date(p.scheduledAt),
        status:      p.status || 'scheduled',
      })));
    } catch (e) {}
    finally { setLoading(false); }
  }, [userId, year, month]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const postsOnDay = (day: number) => posts.filter(p => {
    const d = new Date(p.scheduledAt);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

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
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition hover:bg-white/5"
            style={{ borderColor: `${GOLD}35`, color: GOLD }}>
            <Sparkles className="w-4 h-4" /> Content Ideas
          </button>
          <button onClick={() => setRepurposeOpen(true)}
            className="sm:hidden w-9 h-9 rounded-xl flex items-center justify-center border transition hover:bg-white/5"
            style={{ borderColor: `${GOLD}35`, color: GOLD }}>
            <Sparkles className="w-4 h-4" />
          </button>
          <button onClick={() => { setComposerDate(undefined); setComposerOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold transition hover:brightness-110"
            style={{ background: GOLD, color: '#000' }}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Post</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b shrink-0" style={{ borderColor: BORDER }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2.5 text-center text-xs font-bold text-white/25 uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto grid grid-cols-7" style={{ gridAutoRows: 'minmax(60px,1fr)' }}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} className="border-r border-b" style={{ borderColor: BORDER, background: 'rgba(255,255,255,0.01)' }} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day      = i + 1;
          const dayPosts = postsOnDay(day);
          const isToday  = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          const isWeekend = [0, 6].includes(new Date(year, month, day).getDay());
          return (
            <div key={day}
              className="border-r border-b p-1 md:p-2 cursor-pointer hover:bg-white/3 transition group"
              style={{ borderColor: BORDER, background: isWeekend ? 'rgba(255,255,255,0.01)' : 'transparent' }}
              onClick={() => { setComposerDate(new Date(year, month, day, 10, 0)); setComposerOpen(true); }}>
              <div className="w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold mb-1"
                style={isToday ? { background: GOLD, color: '#000' } : { color: isWeekend ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)' }}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 2).map(post => (
                  <div key={post.id} className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] md:text-xs truncate"
                    style={{
                      background: post.status === 'published' ? 'rgba(34,197,94,0.15)' : post.status === 'failed' ? 'rgba(239,68,68,0.15)' : `${GOLD}18`,
                      color:      post.status === 'published' ? '#86efac'              : post.status === 'failed' ? '#fca5a5'              : GOLD_L,
                    }}>
                    <span className="hidden md:block shrink-0" style={{ width: 12, height: 12 }}><PlatformIcon id={post.platforms[0]} size="sm" /></span>
                    <span className="truncate hidden md:block">{post.content || '(Post)'}</span>
                    <span className="md:hidden w-1.5 h-1.5 rounded-full shrink-0" style={{
                      background: post.status === 'published' ? '#86efac' : post.status === 'failed' ? '#fca5a5' : GOLD,
                    }} />
                  </div>
                ))}
                {dayPosts.length > 2 && <div className="text-[9px] md:text-xs text-white/25 pl-1">+{dayPosts.length - 2}</div>}
              </div>
              {dayPosts.length === 0 && (
                <div className="opacity-0 group-hover:opacity-100 transition text-[9px] md:text-xs text-white/20 flex items-center gap-0.5 mt-1">
                  <Plus className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  <span className="hidden md:inline">Add</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <PostComposerModal open={composerOpen} onClose={() => setComposerOpen(false)}
        integrations={integrations} userId={userId} defaultDate={composerDate} onSuccess={loadPosts} />
      <RepurposeIdeasModal open={repurposeOpen} onClose={() => setRepurposeOpen(false)} />
    </div>
  );
}

// ─── ComposerPanel (posts list view) ─────────────────────────────────────────

function ComposerPanel({ integrations, userId }: { integrations: PostizIntegration[]; userId: string | null }) {
  const [composerOpen, setComposerOpen]   = useState(false);
  const [repurposeOpen, setRepurposeOpen] = useState(false);
  const [posts, setPosts]                 = useState<ScheduledPost[]>([]);
  const [loading, setLoading]             = useState(false);
  const [filter, setFilter]               = useState<'all' | 'scheduled' | 'published' | 'failed'>('all');

  const loadPosts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const end   = new Date(); end.setMonth(end.getMonth() + 3);
      const start = new Date(); start.setMonth(start.getMonth() - 1);
      const res  = await fetch(
        `https://wcbkzebgcsfvrugibsjr.supabase.co/functions/v1/ayrshare-scheduled?userId=${encodeURIComponent(userId)}&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`
      );
      const data = res.ok ? await res.json() : { posts: [] };
      const list = Array.isArray(data?.posts) ? data.posts : [];
      setPosts(list.map((p: any) => ({
        id:          p.id,
        content:     p.content || '',
        platforms:   Array.isArray(p.platforms) ? p.platforms : [],
        scheduledAt: new Date(p.scheduledAt),
        status:      p.status || 'scheduled',
      })).sort((a: ScheduledPost, b: ScheduledPost) => b.scheduledAt.getTime() - a.scheduledAt.getTime()));
    } catch (e) {}
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const filtered = posts.filter(p => filter === 'all' || p.status === filter);
  const counts = {
    all: posts.length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    published: posts.filter(p => p.status === 'published').length,
    failed:    posts.filter(p => p.status === 'failed').length,
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 border-b shrink-0" style={{ borderColor: BORDER }}>
        <div>
          <h1 className="text-lg md:text-xl font-black text-white">Posts</h1>
          <p className="text-xs md:text-sm text-white/30 mt-0.5">Schedule and manage your content</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setRepurposeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-xs md:text-sm font-bold border transition hover:bg-white/5"
            style={{ borderColor: `${GOLD}35`, color: GOLD }}>
            <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Content Ideas</span>
            <span className="sm:hidden">Ideas</span>
          </button>
          <button onClick={() => setComposerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-bold transition hover:brightness-110"
            style={{ background: GOLD, color: '#000' }}>
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Create Post</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 md:gap-4 px-4 md:px-8 py-3 md:py-5 border-b shrink-0" style={{ borderColor: BORDER }}>
        {[
          { key: 'scheduled', label: 'Scheduled', color: GOLD },
          { key: 'published', label: 'Published',  color: '#22c55e' },
          { key: 'failed',    label: 'Failed',     color: '#ef4444' },
        ].map(s => (
          <div key={s.key} className="rounded-xl border p-3 md:p-4 cursor-pointer transition hover:bg-white/4"
            style={{ borderColor: BORDER }} onClick={() => setFilter(s.key as any)}>
            <div className="text-xl md:text-2xl font-black" style={{ color: s.color }}>{counts[s.key as keyof typeof counts]}</div>
            <div className="text-[10px] md:text-xs font-semibold text-white/30 mt-0.5 md:mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 px-4 md:px-8 py-2 md:py-3 border-b shrink-0 overflow-x-auto" style={{ borderColor: BORDER }}>
        {(['all', 'scheduled', 'published', 'failed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize whitespace-nowrap shrink-0"
            style={{ background: filter === f ? `${GOLD}18` : 'transparent', color: filter === f ? GOLD_L : 'rgba(255,255,255,0.35)' }}>
            {f} {f !== 'all' && <span className="ml-1 opacity-60">{counts[f]}</span>}
          </button>
        ))}
        {loading && <Loader className="ml-auto w-4 h-4 animate-spin text-white/20 shrink-0" />}
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-5">
        {!userId ? (
          <div className="flex flex-col items-center justify-center h-56 text-center">
            <div className="w-16 h-16 rounded-2xl border mb-4 flex items-center justify-center" style={{ borderColor: BORDER }}><Link2Off className="w-7 h-7 text-white/15" /></div>
            <div className="text-sm font-bold text-white/30">Connect your accounts to get started</div>
          </div>
        ) : loading && posts.length === 0 ? (
          <div className="flex items-center justify-center h-40 gap-3 text-white/25"><Loader className="w-5 h-5 animate-spin" /> Loading posts…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center">
            <div className="w-14 h-14 rounded-2xl border mb-4 flex items-center justify-center" style={{ borderColor: BORDER }}><Edit3 className="w-6 h-6 text-white/15" /></div>
            <div className="text-sm font-bold text-white/30">No {filter === 'all' ? '' : filter} posts yet</div>
            {filter === 'all' && (
              <button onClick={() => setComposerOpen(true)} className="mt-4 px-4 py-2 rounded-xl text-sm font-bold hover:brightness-110 transition" style={{ background: GOLD, color: '#000' }}>
                Create your first post
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(post => (
              <div key={post.id} className="flex items-start gap-3 p-3 md:p-4 rounded-xl border hover:bg-white/3 transition cursor-pointer" style={{ borderColor: BORDER }}>
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
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-white/25 flex items-center gap-1.5">
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
            ))}
          </div>
        )}
      </div>
      <PostComposerModal open={composerOpen} onClose={() => setComposerOpen(false)} integrations={integrations} userId={userId} onSuccess={loadPosts} />
      <RepurposeIdeasModal open={repurposeOpen} onClose={() => setRepurposeOpen(false)} />
    </div>
  );
}

// ─── Sidebar + mobile nav ─────────────────────────────────────────────────────

function Sidebar({ view, setView, integrations, onOpenConnect }: {
  view: ViewMode; setView: (v: ViewMode) => void;
  integrations: PostizIntegration[]; onOpenConnect: () => void;
}) {
  const navItems = [
    { id: 'composer' as ViewMode, label: 'Posts',    icon: <Edit3 className="w-5 h-5" /> },
    { id: 'calendar' as ViewMode, label: 'Calendar', icon: <Calendar className="w-5 h-5" /> },
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

// ─── TopBar ───────────────────────────────────────────────────────────────────


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
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 4px 4px', borderRadius: 10, background: open ? 'rgba(255,255,255,0.08)' : 'transparent', border: `1px solid ${open ? 'rgba(214,178,94,0.3)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', transition: 'all 0.15s' }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; } }}
      >
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

  // Clean up OAuth hash from URL if present (cosmetic only)
  useEffect(() => {
    if (window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Use userId string (not the currentUser object) as the dep to avoid
  // re-creating loadIntegrations on every render due to object identity changes.
  const currentUserId = currentUser?.id ?? null;

  const loadIntegrations = useCallback(async (force = false) => {
    if (!currentUserId) return;
    setIntegrationsLoading(true);
    // Safety net: clear the loading spinner after 10s no matter what
    const safetyTimer = setTimeout(() => setIntegrationsLoading(false), 10000);
    try { setIntegrations(await fetchChannels(currentUserId, force)); }
    catch { setIntegrations([]); }
    finally { clearTimeout(safetyTimer); setIntegrationsLoading(false); }
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (currentUserId) loadIntegrations(); }, [currentUserId, loadIntegrations]);

  // When the user returns to this tab after connecting accounts in the Ayrshare popup,
  // force-refresh channels so newly connected platforms appear immediately.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        const isSocialReturn = (() => {
          try { return localStorage.getItem(LS_SOCIAL_RETURN_KEY) === '1'; }
          catch { return false; }
        })();
        if (isSocialReturn) {
          try { localStorage.removeItem(LS_SOCIAL_RETURN_KEY); } catch {}
          // Delay slightly to allow Ayrshare's backend to register the connection
          setTimeout(() => loadIntegrations(true), 1500);
          setConnectModalOpen(false);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadIntegrations]);

  useEffect(() => {
    // Handle return from Ayrshare OAuth tab. We force=true to bypass the 5-min
    // cache and fetch fresh channel data (otherwise new connections may not show).
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
      // Small delay to let Ayrshare's backend register the new connection
      // before we query for channels, then force-refresh the cache.
      setTimeout(() => loadIntegrations(true), 1500);
      setConnectModalOpen(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Called when user is authed and wants to open Postiz — now just opens the modal
  // which handles the iframe flow internally
  const openConnectModal = () => setConnectModalOpen(true);

  const handleConnect = () => {
    if (!currentUser) {
      setAuthModalOpen(true);
    } else {
      openConnectModal();
    }
  };

  const handleDisconnect = () => {
    try {
      localStorage.removeItem(LS_SOCIAL_RETURN_KEY);
    } catch {}
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
            onOpenConnect={() => setConnectModalOpen(true)}
/>
          <main className="flex-1 overflow-hidden pb-[60px] md:pb-0">
            {view === 'composer' && <ComposerPanel integrations={integrations} userId={currentUser?.id ?? null} />}
            {view === 'calendar' && <CalendarPanel integrations={integrations} userId={currentUser?.id ?? null} />}
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
