import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

// Style descriptors used in both the Claude system prompt and the final template
const STYLE_DESCRIPTORS: Record<string, string> = {
  cinematic:    'cinematic film look, anamorphic lens flare, shallow depth of field, dramatic chiaroscuro lighting, muted desaturated color grade, ARRI camera aesthetic, widescreen letterbox composition',
  commercial:   'premium commercial advertisement style, clean bright studio lighting, polished product-hero framing, crisp whites and deep blacks, high-end brand aesthetic, Apple or Nike ad quality',
  documentary:  'cinematic documentary style, handheld vérité feel, natural available light, authentic candid framing, National Geographic quality, journalistic composition',
  anime:        'high-quality anime style, Studio Ghibli aesthetic, lush vibrant colors, expressive character design, detailed background art, Makoto Shinkai atmospheric quality',
  realistic:    'hyperrealistic photographic quality, 8K resolution, perfect natural lighting, true-to-life color accuracy, Sony A7R detail, photojournalism sharpness',
  voiceover:    'clean well-lit talking-head or presenter framing, professional broadcast lighting, subtle depth of field, crisp and readable composition, social media creator quality, steady confident camera',
};

/** Call Claude to intelligently enhance the user brief */
async function enhanceBrief(
  brief: string,
  style: string,
  aspectRatio: string,
  duration: string,
  textOnScreen: boolean,
  textContent: string,
  fontColor: string,
): Promise<string> {
  const styleDesc = STYLE_DESCRIPTORS[style.toLowerCase()] ?? STYLE_DESCRIPTORS['cinematic'];
  const textNote = textOnScreen && textContent
    ? `\n- TEXT ON SCREEN: "${textContent}" in ${fontColor} font — ensure the scene framing provides clean space for on-screen text overlay`
    : '';

  const systemPrompt = `You are a professional video director and AI prompt engineer specializing in AI video generation (Kling, Sora, Runway). Your job is to transform a user's rough video brief into a rich, detailed, vivid scene description that will produce the highest quality AI-generated video possible.

When enhancing a brief:
- PRESERVE every specific detail the user mentioned (names, brands, locations, products, people, emotions)
- ADD specific visual details: camera angle, camera movement, lens type, lighting setup, color palette, time of day, mood
- ADD atmospheric and environmental details: weather, textures, depth, spatial relationships
- ADD action and motion details: how subjects move, how the camera moves, what changes over the clip duration
- ENFORCE the selected style: ${styleDesc}
- Keep the result as a single vivid paragraph (2-4 sentences) — no bullet points, no headers
- Write it as a prompt, not a description of a prompt
- Return ONLY the enhanced prompt text — nothing else`;

  const userMsg = `Enhance this video brief into a rich cinematic prompt:

BRIEF: ${brief.trim()}
STYLE: ${style}
ASPECT RATIO: ${aspectRatio}
DURATION: ${duration} seconds${textNote}

Return only the enhanced prompt text.`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });
  if (!r.ok) throw new Error('Claude enhancement error: ' + await r.text());
  const d = await r.json();
  return (d.content?.[0]?.text ?? brief).trim();
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing auth token' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let brief = '', style = 'cinematic', aspectRatio = '16:9', duration = '5';
  let textOnScreen = false, textOnScreenContent = '', fontColor = '#FFFFFF';
  try {
    const body = await req.json();
    brief               = body.brief               ?? '';
    style               = body.style               ?? style;
    aspectRatio         = body.aspectRatio         ?? aspectRatio;
    duration            = body.duration            ?? duration;
    textOnScreen        = body.textOnScreen        ?? false;
    textOnScreenContent = body.textOnScreenContent ?? '';
    fontColor           = body.fontColor           ?? '#FFFFFF';
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (!brief.trim()) {
    return new Response(JSON.stringify({ error: 'brief is required' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (!ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const enhanced = await enhanceBrief(brief, style, aspectRatio, duration, textOnScreen, textOnScreenContent, fontColor);
    return new Response(JSON.stringify({ prompts: [enhanced] }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Enhancement failed' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
