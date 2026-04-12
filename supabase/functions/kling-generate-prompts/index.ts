import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

// Style descriptors used in both the Claude system prompt and the final template
const STYLE_DESCRIPTORS: Record<string, string> = {
  cinematic:    'cinematic film look, anamorphic lens flare, shallow depth of field, dramatic chiaroscuro lighting, muted desaturated color grade, ARRI camera aesthetic, widescreen letterbox composition',
  commercial:   'premium commercial advertisement style, clean bright studio lighting, polished product-hero framing, crisp whites and deep blacks, high-end brand aesthetic, Apple or Nike ad quality',
  documentary:  'cinematic documentary style, handheld verité feel, natural available light, authentic candid framing, National Geographic quality, journalistic composition',
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
  videoType: string,
): Promise<string> {
  const styleDesc = STYLE_DESCRIPTORS[style.toLowerCase()] ?? STYLE_DESCRIPTORS['cinematic'];
  const textNote = textOnScreen && textContent
    ? `\n- TEXT ON SCREEN: "${textContent}" in ${fontColor} font — ensure the scene framing provides clean space for on-screen text overlay`
    : '';

  // ── Speaking Video: specialized prompt for natural human dialogue ──────────
  if (videoType === 'speaking') {
    const systemPrompt = `You are an expert AI video director for realistic speaking-head videos. Your task is to convert user input into a precise Kling AI video prompt.

STEP 1 — EXTRACT THE CHARACTER FROM THE USER'S INPUT (most critical step):
- Carefully read the user's input and pull out every physical detail they mentioned: age, gender, ethnicity, skin tone, hair color and style, clothing, accessories, facial expression.
- Use EXACTLY those details verbatim in your prompt. Do not replace, generalize, or swap them for a different character.
- Example: if the user says "Black woman, early 40s, wearing a white blazer, loc'd hair" — you must describe exactly that person. Do not produce a different race, age, or outfit.
- If the user provided zero appearance details, invent a professional presenter that fits the topic, described with the same level of granularity.
- Be ultra-specific about appearance: e.g. "a 38-year-old Black woman with medium-length loc'd hair pulled back loosely, warm deep-brown skin, wearing a crisp white blazer over a black top, small gold stud earrings, composed and authoritative expression."

STEP 2 — LOCK THE BACKGROUND:
- Choose exactly ONE static environment: a seamless studio backdrop, a minimal branded wall, or a softly blurred professional interior.
- Describe it with zero ambiguity so it never morphs: e.g. "a plain matte warm-charcoal grey seamless studio backdrop, no props, no movement, no parallax shift, soft wrap lighting from camera left."

STEP 3 — WRITE THE FINAL PROMPT as a single dense paragraph (3-5 sentences):
- Open with the full character anchor: their precise appearance, posture, and expression.
- Follow with the locked static background.
- Then action: the character speaks directly and confidently into the camera lens, mouth forming words with clear natural enunciation, genuine blink rate, subtle engaged head micro-movements — no frozen or robotic quality.
- Then camera: medium close-up framing, face centered, stable tripod, direct eye contact with the lens, slight shallow depth of field.
- Then lighting: professional softbox portrait lighting, bright even clean exposure, no harsh shadows on the face.

ABSOLUTE RULES:
- The character you describe MUST match what the user wrote. Age, gender, race, clothing — all of it. This is non-negotiable.
- No background changes, scene transitions, cuts, or camera movement.
- Return ONLY the final prompt text. No preamble, no explanation, no labels.`;

    const userMsg = `USER INPUT (extract the character from this exactly as described, then build the speaking video prompt):

${brief.trim()}

ASPECT RATIO: ${aspectRatio}
DURATION: ${duration} seconds${textNote}

Return only the final speaking video prompt.`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });
    if (!r.ok) throw new Error('Claude enhancement error: ' + await r.text());
    const d = await r.json();
    return (d.content?.[0]?.text ?? brief).trim();
  }

  // ── Standard cinematic/scene prompt ───────────────────────────────────────
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
      model: 'claude-sonnet-4-6',
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

  let brief = '', style = 'cinematic', aspectRatio = '16:9', duration = '5', videoType = 'cinematic';
  let textOnScreen = false, textOnScreenContent = '', fontColor = '#FFFFFF';
  try {
    const body = await req.json();
    brief               = body.brief               ?? '';
    style               = body.style               ?? style;
    aspectRatio         = body.aspectRatio         ?? aspectRatio;
    duration            = body.duration            ?? duration;
    videoType           = body.videoType           ?? 'cinematic';
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

  // Require active subscription for video prompt generation
  const { data: subRow } = await supabase.from('subscriptions').select('plan,status,stripe_customer_id,current_period_end').eq('supabase_user_id', user.id).maybeSingle();
  const isPromo = subRow?.stripe_customer_id?.startsWith('promo_');
  const isTrialing = subRow?.status === 'trialing' && !!subRow?.current_period_end && new Date(subRow.current_period_end as string) > new Date();
  const isActive = ((subRow?.status === 'active' || isPromo) || isTrialing) && !!subRow?.plan;
  if (!isActive) {
    return new Response(JSON.stringify({ error: 'upgrade_required', message: 'AI video generation requires an active plan.' }), {
      status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const enhanced = await enhanceBrief(brief, style, aspectRatio, duration, textOnScreen, textOnScreenContent, fontColor, videoType);
    return new Response(JSON.stringify({ prompts: [enhanced] }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Enhancement failed' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
