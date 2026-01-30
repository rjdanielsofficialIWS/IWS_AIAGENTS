/**
 * Content AI Edge Function
 *
 * Purpose:
 *  - Fetch an uploaded audio file (via URL)
 *  - Transcribe it with OpenAI Audio API
 *  - Generate tweet + caption ideas with OpenAI Responses API
 *
 * Environment variables required:
 *  - OPENAI_API_KEY
 *
 * Request (POST JSON):
 *  {
 *    "audioUrl": "https://...",
 *    "tone": "confident, punchy, value-first" (optional),
 *    "platforms": ["twitter","instagram","tiktok","facebook","youtube"] (optional)
 *  }
 */

import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

type InputBody = {
  audioUrl?: string;
  tone?: string;
  platforms?: Array<'twitter' | 'instagram' | 'tiktok' | 'facebook' | 'youtube'>;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const safeErr = (err: unknown) =>
  err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';

function guessFileName(contentType: string | null) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('mp3')) return 'audio.mp3';
  if (ct.includes('wav')) return 'audio.wav';
  if (ct.includes('m4a')) return 'audio.m4a';
  if (ct.includes('mp4')) return 'audio.mp4';
  if (ct.includes('webm')) return 'audio.webm';
  if (ct.includes('ogg')) return 'audio.ogg';
  return 'audio';
}

async function transcribeAudioFromUrl(audioUrl: string) {
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) {
    throw new Error(`Could not fetch audio (${audioRes.status}). Make sure the URL is accessible.`);
  }

  const contentType = audioRes.headers.get('content-type') || 'application/octet-stream';
  const buf = await audioRes.arrayBuffer();
  const blob = new Blob([buf], { type: contentType });
  const file = new File([blob], guessFileName(contentType), { type: contentType });

  const form = new FormData();
  form.append('file', file);
  // default: good quality/price balance
  form.append('model', 'gpt-4o-mini-transcribe');

  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (data as any)?.error?.message || `Transcription failed (${r.status}).`;
    throw new Error(msg);
  }

  const text = (data as any)?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Transcription succeeded but no text was returned.');
  }
  return text;
}

async function generateIdeasFromTranscript(
  transcript: string,
  tone?: string,
  platforms?: InputBody['platforms']
) {
  const desiredPlatforms = (platforms && platforms.length
    ? platforms
    : ['twitter', 'instagram', 'tiktok', 'facebook', 'youtube']
  ).filter(Boolean);

  const system = `You are a social media copywriting assistant.
Generate high-converting short-form social copy from a transcript.

Rules:
- Write like a modern creator: clear, punchy, no fluff.
- No hashtags unless explicitly requested.
- Keep tweets within ~280 chars.
- Captions should be skimmable: short lines, hooks, and a simple CTA.
- Use the user's requested tone if provided.

Return ONLY valid JSON matching the schema.`;

  const user = `Transcript:
"""
${transcript}
"""

Tone (optional): ${tone || 'Not specified'}

Platforms: ${desiredPlatforms.join(', ')}`;

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      transcriptSummary: { type: 'string' },
      tweets: {
        type: 'array',
        items: { type: 'string' },
        minItems: 10,
        maxItems: 20,
      },
      captions: {
        type: 'object',
        additionalProperties: false,
        properties: {
          instagram: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 8 },
          facebook: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 8 },
          tiktok: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 8 },
        },
        required: ['instagram', 'facebook', 'tiktok'],
      },
      youtubeTitles: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 12 },
      best: {
        type: 'object',
        additionalProperties: false,
        properties: {
          instagram: { type: 'string' },
          facebook: { type: 'string' },
          tiktok: { type: 'string' },
          youtubeTitle: { type: 'string' },
        },
        required: ['instagram', 'facebook', 'tiktok', 'youtubeTitle'],
      },
    },
    required: ['transcriptSummary', 'tweets', 'captions', 'youtubeTitles', 'best'],
  };

  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'content_bundle',
          strict: true,
          schema,
        },
      },
    }),
  });

  const raw = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = (raw as any)?.error?.message || `Generation failed (${r.status}).`;
    throw new Error(msg);
  }

  const outText = (raw as any)?.output_text;
  if (typeof outText === 'string' && outText.trim().startsWith('{')) {
    return JSON.parse(outText);
  }

  const output = (raw as any)?.output;
  const first = Array.isArray(output) ? output[0] : null;
  const content = first?.content;
  const firstText = Array.isArray(content)
    ? content.find((c: any) => c?.type === 'output_text')?.text
    : null;

  if (typeof firstText === 'string' && firstText.trim().startsWith('{')) {
    return JSON.parse(firstText);
  }

  throw new Error('Generation succeeded but returned an unexpected format.');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as InputBody;
    const audioUrl = body.audioUrl;
    if (!audioUrl || typeof audioUrl !== 'string') {
      return json(400, { error: 'Missing audioUrl' });
    }

    const transcript = await transcribeAudioFromUrl(audioUrl);
    const bundle = await generateIdeasFromTranscript(transcript, body.tone, body.platforms);

    return json(200, {
      transcript,
      ...bundle,
    });
  } catch (err) {
    console.error('content-ai error:', err);
    return json(500, {
      error: 'Internal server error',
      details: safeErr(err),
    });
  }
});