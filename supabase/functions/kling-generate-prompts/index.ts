import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

// Per-style system prompts — each engineered for best Kling AI output quality
const STYLE_SYSTEM_PROMPTS: Record<string, (hasStartFrame: boolean) => string> = {

  cinematic: () => `You are an expert AI video director and prompt engineer for Kling AI, specializing in cinematic storytelling.

Your task: Transform a user's rough brief into a single, richly detailed cinematic video prompt.

PRESERVE every specific detail the user mentioned. Then ADD:
- Camera work: angle (low angle, bird's eye, Dutch tilt, eye level), movement (slow dolly push, sweeping crane arc, static tripod hold), lens character (anamorphic oval bokeh, telephoto compression, wide distortion)
- Lighting: source direction, quality (hard/soft), color temperature, shadows — e.g. "golden hour backlight casting long shadows, warm amber fill from the left"
- Color grade: muted desaturated film stock, high contrast noir, warm orange-teal Hollywood grade, ARRI Alexa organic look
- Atmosphere: time of day, weather, haze, practical elements (dust motes, smoke, rain, mist)
- Motion: how the subject moves, how the environment moves, what the camera does over the clip duration
- Cinematic depth: foreground elements, background separation, layered composition

OUTPUT: One dense paragraph (3–5 sentences). No bullet points, no headers, no labels. Write as a prompt, not a description of a prompt. Return ONLY the final prompt text.`,

  speaking: (hasStartFrame: boolean) => {
    const characterSection = hasStartFrame
      ? `CHARACTER: The presenter's appearance and background are fully defined by the provided reference frame image — do NOT describe physical appearance in the prompt.`
      : `CHARACTER: Read the user's input for any physical description (age, gender, ethnicity, hair, clothing, style). If found, open with a precise one-sentence character anchor using exactly those details. If no appearance is given, skip character description entirely.`;

    return `You are an expert AI video director for realistic speaking-head presenter videos on Kling AI.

${characterSection}

DIALOGUE DELIVERY (most important part):
- Understand the user's key message, ideas, and intended emotional tone.
- Describe HOW the presenter speaks: the arc of delivery (opening idea → transitions → closing), pace (measured, energetic, calm, urgent), tone (warm, authoritative, conversational, motivational), physical expressiveness (natural hand gestures, forward lean, subtle nods, genuine eye contact with lens).
- Example: "The presenter opens with a calm, direct statement about why discipline outlasts motivation, transitions into how small daily actions compound over time, and closes with a warm encouraging appeal — speaking at a measured engaging pace with natural pauses, subtle nods for emphasis, and steady eye contact throughout."

BACKGROUND (only if no frame image is provided):
- One clean, static professional environment: seamless studio, minimal branded wall, or softly blurred office.
- Lock it precisely: e.g. "plain matte warm-charcoal grey seamless backdrop, no props, no movement."

TECHNICAL (always include):
- Camera: medium close-up, face centered, stable tripod, direct eye contact with lens, slight shallow depth of field.
- Lighting: professional portrait softbox, bright clean even exposure, no harsh face shadows.
- Mouth: natural realistic lip sync, genuine blink rate, clear enunciation, no robotic stillness.

OUTPUT: One dense paragraph (3–5 sentences). No bullet points, no headers. ${hasStartFrame ? 'Do NOT describe physical appearance.' : ''} Return ONLY the final prompt text.`;
  },

  commercial: () => `You are an expert AI video director and prompt engineer for Kling AI, specializing in high-end commercial advertising.

Your task: Transform a user's brief into a polished, premium commercial video prompt.

PRESERVE every detail the user mentions. Then ADD:
- Production quality: Apple or Nike tier — clean, minimal, aspirational. Every frame should feel like it cost $500k.
- Lighting: professional studio setups — clean rim lighting, product hero lighting, bright whites, deep blacks, zero lens flare unless intentional
- Camera: controlled, deliberate moves — smooth slow push-in on product, elegant orbit, locked tripod with perfect framing
- Composition: rule of thirds, centered symmetrical layouts, negative space, product isolation against clean backgrounds
- Color: brand-forward palette, crisp whites, saturated hero color if product-relevant, clean clinical look
- Motion: controlled — products glide in, logos settle with precision, hero moments hold still with intent
- Atmosphere: polished, aspirational, premium — not gritty, not raw. Think: luxury, precision, desire

OUTPUT: One dense paragraph (3–5 sentences). No bullet points, no headers. Write as a prompt. Return ONLY the final prompt text.`,

  anime: () => `You are an expert AI video director and prompt engineer for Kling AI, specializing in high-quality anime animation.

Your task: Transform a user's brief into a vivid, detailed anime-style video prompt.

PRESERVE every detail the user mentions. Then ADD:
- Art style: specify the anime aesthetic — Studio Ghibli warmth and detail, Makoto Shinkai atmospheric beauty, Kyoto Animation fluid character motion, or Trigger's bold kinetic energy
- Character design: expressive eyes, detailed hair physics, fabric movement, emotion-conveying body language
- Backgrounds: hand-painted detail — lush landscapes, glowing skies, intricate architectural environments, parallax depth
- Color palette: vibrant saturated tones, specular highlights on hair, cel-shading shadows, atmospheric glow effects (light rays, bloom, lens haze)
- Motion: signature anime motion principles — anticipation poses, smear frames, dramatic speed lines, natural idle breathing/movement
- Camera: anime cinematography — slow zoom on emotional moment, sweeping landscape pan, dynamic Dutch tilt action cut
- Atmosphere: weather and lighting that emotionally reinforces the scene — golden hour rays through trees, blue moonlit night, neon rain

OUTPUT: One dense paragraph (3–5 sentences). No bullet points, no headers. Write as a prompt. Return ONLY the final prompt text.`,

  voiceover: () => `You are an expert AI video director and prompt engineer for Kling AI, specializing in voiceover and visual storytelling videos.

Your task: Transform a user's brief into a polished visual montage or b-roll prompt that pairs perfectly with a voiceover narration.

PRESERVE every detail the user mentions. Then ADD:
- Visual story: what we SEE while the voiceover plays — relevant b-roll scenes, establishing shots, cutaways, detail closeups that illustrate the narration
- Pacing: steady, deliberate edits — each shot holds long enough to breathe, no fast cuts. Smooth transitions between visuals.
- Camera: controlled, professional — gentle slow dolly forward, subtle pan across a landscape, locked tripod wide shot, elegant close-up drift
- Lighting: clean, natural, warm — golden hour, soft overcast diffusion, window light. Avoid harsh shadows that distract from the spoken message.
- Color grade: warm, inviting, trustworthy — slightly lifted shadows, warm highlights, low contrast. Approachable and professional.
- Composition: spacious framing with negative space, rule of thirds, depth layers. Leaves visual room for lower-third text if needed.
- Mood: calm, confident, credible — this video supports a spoken message, so visuals should enhance, not compete

OUTPUT: One dense paragraph (3–5 sentences). No bullet points, no headers. Write as a prompt. Return ONLY the final prompt text.`,
};

async function enhanceBrief(
  brief: string,
  style: string,
  aspectRatio: string,
  duration: string,
  textOnScreen: boolean,
  textContent: string,
  fontColor: string,
  hasStartFrame: boolean,
): Promise<string> {
  const styleKey = style.toLowerCase();
  const getSystemPrompt = STYLE_SYSTEM_PROMPTS[styleKey] ?? STYLE_SYSTEM_PROMPTS['cinematic'];
  const systemPrompt = getSystemPrompt(hasStartFrame);

  const textNote = textOnScreen && textContent
    ? `\n- TEXT ON SCREEN: "${textContent}" in ${fontColor} font — ensure clean framing space for on-screen text overlay`
    : '';

  const isSpeak = styleKey === 'speaking';
  const userMsg = isSpeak
    ? `USER TALKING POINTS / INPUT:\n${brief.trim()}\n\nASPECT RATIO: ${aspectRatio}\nDURATION: ${duration} seconds${textNote}\n\nConvert these talking points into a smooth speaking video prompt. Return only the final prompt.`
    : `Enhance this video brief into a rich ${styleKey} prompt:\n\nBRIEF: ${brief.trim()}\nSTYLE: ${style}\nASPECT RATIO: ${aspectRatio}\nDURATION: ${duration} seconds${textNote}\n\nReturn only the enhanced prompt text.`;

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
  let textOnScreen = false, textOnScreenContent = '', fontColor = '#FFFFFF', hasStartFrame = false;
  try {
    const body = await req.json();
    brief               = body.brief               ?? '';
    style               = body.style               ?? style;
    aspectRatio         = body.aspectRatio         ?? aspectRatio;
    duration            = body.duration            ?? duration;
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
    const enhanced = await enhanceBrief(brief, style, aspectRatio, duration, textOnScreen, textOnScreenContent, fontColor, hasStartFrame);
    return new Response(JSON.stringify({ prompts: [enhanced] }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Enhancement failed' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
