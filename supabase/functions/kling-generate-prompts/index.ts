import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const STYLE_DESCRIPTORS: Record<string, string> = {
  cinematic:    'cinematic film look, anamorphic lens flare, shallow depth of field, dramatic chiaroscuro lighting, muted desaturated color grade, ARRI camera aesthetic, widescreen letterbox composition',
  commercial:   'premium commercial advertisement style, clean bright studio lighting, polished product-hero framing, crisp whites and deep blacks, high-end brand aesthetic, Apple or Nike ad quality',
  documentary:  'cinematic documentary style, handheld verite feel, natural available light, authentic candid framing, National Geographic quality, journalistic composition',
  anime:        'high-quality anime style, Studio Ghibli aesthetic, lush vibrant colors, expressive character design, detailed background art, Makoto Shinkai atmospheric quality',
  realistic:    'hyperrealistic photographic quality, 8K resolution, perfect natural lighting, true-to-life color accuracy, Sony A7R detail, photojournalism sharpness',
  voiceover:    'clean well-lit talking-head or presenter framing, professional broadcast lighting, subtle depth of field, crisp and readable composition, social media creator quality, steady confident camera',
};

async function enhanceBrief(
  brief: string,
  style: string,
  aspectRatio: string,
  duration: string,
  textOnScreen: boolean,
  textContent: string,
  fontColor: string,
  videoType: string,
  hasStartFrame: boolean,
): Promise<string> {
  const styleDesc = STYLE_DESCRIPTORS[style.toLowerCase()] ?? STYLE_DESCRIPTORS['cinematic'];
  const textNote = textOnScreen && textContent
    ? `\n- TEXT ON SCREEN: "${textContent}" in ${fontColor} font — ensure clean framing space for on-screen text overlay`
    : '';

  // ── Speaking Video ─────────────────────────────────────────────────────────
  if (videoType === 'speaking') {

    // When a reference frame image is provided, character appearance is already
    // anchored by the image. Focus entirely on dialogue delivery.
    const characterSection = hasStartFrame
      ? `CHARACTER: The presenter's appearance and background are fully defined by the provided reference frame image — do NOT describe physical appearance in the prompt. The image anchors the character.`
      : `CHARACTER: Read the user's input for any physical description (age, gender, ethnicity, hair, clothing). If found, open the prompt with a precise one-sentence character anchor using exactly those details. If no appearance details are given, skip character description entirely.`;

    const systemPrompt = `You are an expert AI video director for realistic speaking-head videos. Your job is to convert user talking points into a Kling AI video prompt that produces smooth, natural on-camera dialogue.

${characterSection}

MAIN FOCUS — DIALOGUE DELIVERY (this is the most important part):
- Read the user's talking points and understand the core message, the key ideas, and the intended emotional tone.
- Describe the character's speech as a flowing, natural monologue delivery — not as a script, but as a description of HOW they speak.
- Structure the delivery arc: what idea they open with, how they transition between points, what they land on at the end.
- Include delivery details: pace (measured, energetic, calm, urgent), tone (warm, authoritative, conversational, motivational), physical expressiveness (subtle hand gestures, nods, leaning slightly forward for emphasis).
- Example of good dialogue delivery description: "The presenter opens with a direct, calm statement about why discipline outlasts motivation, transitions naturally into explaining how small consistent actions compound over time, and closes with a warm encouraging appeal to the viewer — speaking at a measured but engaging pace, with natural pauses between key ideas, occasional slight nods for emphasis, and genuine eye contact with the lens throughout."

BACKGROUND (if no frame image):
- Choose one static, professional environment: seamless studio, minimal branded wall, or softly blurred office interior.
- Lock it with specific detail so it cannot morph: e.g. "plain matte warm-charcoal grey seamless studio backdrop, no props, no movement, no parallax."

TECHNICAL (always include):
- Camera: medium close-up, face centered, stable tripod frame, direct eye contact with the lens, slight shallow depth of field.
- Lighting: professional softbox portrait lighting, bright even clean exposure, no harsh face shadows.
- Mouth movement: natural, realistic lip sync with clear enunciation, genuine blink rate, no robotic stillness.

OUTPUT RULES:
- Write ONE dense paragraph (3-5 sentences). No bullet points, no headers, no labels.
- ${hasStartFrame ? 'Do NOT describe physical appearance — the reference image defines the character.' : ''}
- Return ONLY the final prompt text. No preamble, no explanation.`;

    const userMsg = `USER TALKING POINTS / INPUT:
${brief.trim()}

ASPECT RATIO: ${aspectRatio}
DURATION: ${duration} seconds${textNote}

Convert these talking points into a smooth speaking video prompt. Return only the final prompt.`;

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
  let textOnScreen = false, textOnScreenContent = '', fontColor = '#FFFFFF', hasStartFrame = false;
  try {
    const body = await req.json();
    brief               = body.brief               ?? '';
    style               = body.style               ?? style;
    aspectRatio         = body.aspectRatio         ?? aspectRatio;
    duration            = body.duration            ?? duration;
    videoType           = body.videoType           ?? 'cinematic';
    hasStartFrame       = body.hasStartFrame       ?? false;
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
    const enhanced = await enhanceBrief(brief, style, aspectRatio, duration, textOnScreen, textOnScreenContent, fontColor, videoType, hasStartFrame);
    return new Response(JSON.stringify({ prompts: [enhanced] }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Enhancement failed' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
