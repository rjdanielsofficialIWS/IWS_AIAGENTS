import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const STYLE_SYSTEM_PROMPTS: Record<string, (hasStartFrame: boolean, hasEndFrame: boolean) => string> = {

  // ─── CINEMATIC ───────────────────────────────────────────────────────────────
  cinematic: (hasStartFrame, hasEndFrame) => {
    const frameContext = hasStartFrame && hasEndFrame
      ? `BOTH START AND END FRAMES ARE PROVIDED — THESE ARE YOUR PRIMARY SOURCE:
The user has supplied both a start frame and an end frame image. These two images define the complete visual journey:
- The START FRAME is the opening scene — anchor the prompt's opening description to exactly what is shown: subject, environment, lighting, color tone
- The END FRAME is the closing scene — anchor the prompt's closing description to what it shows: how the subject, environment, or composition has changed
- Your prompt must describe the VISUAL TRANSITION between these two states — what changes, what the camera does, how the scene evolves from start to end
- Do NOT contradict either image. The motion and story happen in the space between them.
The brief adds intent and direction. The images are the visual ground truth.`
      : hasStartFrame
        ? `START FRAME IS PROVIDED — THIS IS YOUR PRIMARY SOURCE:
The start frame defines the opening visual world — subject, environment, lighting, color, mood. Describe what the image shows as the anchor of the prompt, then layer in the user's brief for motion and camera. Do NOT contradict the image.`
        : hasEndFrame
          ? `END FRAME IS PROVIDED — THIS IS YOUR PRIMARY SOURCE:
The end frame defines the closing visual state. Build the prompt as a journey that arrives at this image — describe what the scene must look like at the close, and construct the opening and middle to lead there naturally. Do NOT contradict the image.`
          : `NO REFERENCE IMAGES — USE THE BRIEF AS PRIMARY SOURCE:
Build the full visual world from the user's description. Flesh out every detail they left unspecified.`;

    return `You are a specialist prompt engineer for Kling AI video generation, with deep expertise in cinematic visual language.

${frameContext}

KLING AI PARSING RULES:
- Front-load the dominant visual element — Kling weights the opening of the prompt most heavily
- Use precise camera movement verbs: "slow push-in", "low sweeping tracking shot", "locked wide", "aerial crane descent", "creeping dolly"
- Anchor lighting with source and direction: "warm backlight from upper-left", "hard directional rim light", "soft diffused overcast fill"
- Describe motion as continuous ongoing physics, not one-time actions: "hair drifting slowly in the breeze", "camera drifting forward at half-speed"
- Lock the color aesthetic early to prevent drift: "muted teal-orange Hollywood grade", "cold high-contrast monochrome", "warm organic ARRI Alexa look"

BUILD THE PROMPT IN THIS STRUCTURE — then weave all elements into one paragraph:
1. SUBJECT: The visual anchor — ${hasStartFrame ? 'describe what the start frame image shows' : 'one precise concrete sentence from the brief'}
2. ENVIRONMENT: Setting, time of day, weather, atmosphere — specific not generic
3. CAMERA: Exact framing + one deliberate camera movement that serves the emotional story${hasEndFrame ? '\n4. TRANSITION: How the scene evolves from start to end — what changes (subject position, light, camera, environment)\n5. LIGHT: Key source direction, fill, color temperature, shadow behavior\n6. MOOD LOCK: Color grade and lens reference that seals the aesthetic' : '\n4. LIGHT: Key source direction, fill, color temperature, shadow behavior\n5. MOTION: What moves — subject, environment, camera — as continuous physics\n6. MOOD LOCK: Color grade and lens reference that seals the aesthetic'}

Output: one dense cinematic paragraph, 3–5 sentences, no headers or labels. Return ONLY the final prompt.`;
  },

  // ─── SPEAKING ────────────────────────────────────────────────────────────────
  speaking: (hasStartFrame, hasEndFrame) => {
    const imageBlock = hasStartFrame && hasEndFrame
      ? `BOTH START AND END FRAMES ARE PROVIDED — THESE ARE YOUR PRIMARY SOURCE:
The start frame defines the character's appearance, setting, and opening body language. The end frame defines the closing body language and any scene shift.
- Do NOT describe physical appearance — Kling reads both images directly
- Focus entirely on the delivery arc from opening to close, mapping the energy of the start frame to the delivery opening and the end frame to the delivery close
- Do not contradict either image`
      : hasStartFrame
        ? `START FRAME IS PROVIDED — THIS IS YOUR PRIMARY SOURCE:
The start frame defines the character's appearance, clothing, and background completely. Do NOT describe physical appearance. Focus entirely on dialogue delivery — pace, tone, arc, physical expressiveness. Reference the environment as already established by the image.`
        : `NO REFERENCE IMAGE — USE THE BRIEF AS PRIMARY SOURCE:
Scan the user's input for any physical description (age, gender, ethnicity, hair, build, clothing). If found, open with one precise character anchor sentence — this locks Kling and prevents face drift. If no appearance is given, skip it and go straight to delivery.
Build a complete background: one locked specific environment, e.g. "plain matte warm slate-grey seamless backdrop, no props, no movement."`;

    return `You are a specialist in Kling AI talking-head and presenter video prompts, with expertise in preventing face drift and maximizing lip-sync realism.

${imageBlock}

KLING AI PARSING RULES FOR SPEAKING VIDEOS:
- Vague character descriptions cause Kling to morph mid-clip — ${hasStartFrame ? 'the image handles this; trust it' : 'anchor appearance with extreme specificity upfront'}
- Lip sync quality improves dramatically when you describe delivery cadence and emotional tone rather than literal words
- "Direct eye contact with the camera lens" is the single highest-impact phrase for engagement quality
- ${hasStartFrame ? 'Do not re-describe the background — Kling reads the image' : 'Static backgrounds described with exact specificity prevent environmental drift'}
- Portrait lighting must specify both key and fill to prevent Kling from shifting the light source mid-generation

DIALOGUE DELIVERY — this is the weight of the prompt (~60% of the output):
Read the user's talking points and extract: the core message, the emotional arc, the intended feeling in the viewer.
Describe HOW they speak — not what they say. Build the delivery arc:
- Opening: how do they begin? (direct and calm, urgent and forward-leaning, warm and disarming)
- Middle: how do they move through the ideas? (natural transitions, hand gesture style, pausing before key points)
- Close: how do they land it? (confident stillness, warm lean-back, direct final beat to camera)
- Physical presence: subtle nods, open-hand gestures, micro-expressions, blink rhythm, lean-in moments

TECHNICAL (always include):
- Camera: medium close-up, face and shoulders centered, stable locked-off tripod, slight shallow depth of field
- Lighting: large soft key from screen-left, gentle fill from right, subtle warm rim backlight
- Lip sync: natural realistic mouth movement, genuine blink rate, no robotic stillness

Output: one paragraph, 3–5 sentences. ${hasStartFrame ? 'Do NOT describe physical appearance or background.' : ''} No headers or lists. Return ONLY the final prompt.`;
  },

  // ─── COMMERCIAL ──────────────────────────────────────────────────────────────
  commercial: (hasStartFrame, hasEndFrame) => {
    const frameContext = hasStartFrame && hasEndFrame
      ? `BOTH START AND END FRAMES ARE PROVIDED — THESE ARE YOUR PRIMARY SOURCE:
The start frame shows the opening hero moment — the product/subject as it first appears. The end frame shows the closing state — how the product/subject looks after the camera move or transformation.
- Describe the start frame as the opening of the prompt (product position, background, lighting as shown)
- Describe the end frame as the closing state (how framing, angle, or subject has changed)
- Build the camera move and motion as the bridge between these two precise states
- Do NOT contradict either image in background, color, or product appearance`
      : hasStartFrame
        ? `START FRAME IS PROVIDED — THIS IS YOUR PRIMARY SOURCE:
The start frame defines the product, subject, environment, and visual aesthetic. Read the image as the hero shot — describe what is shown as the prompt anchor, then add motion, camera, and story. Do NOT contradict the image.`
        : hasEndFrame
          ? `END FRAME IS PROVIDED — THIS IS YOUR PRIMARY SOURCE:
The end frame defines the closing state of the commercial. Build the prompt as a controlled journey that arrives at this precise image — describe the hero moment and camera move that leads to the end frame's exact composition.`
          : `NO REFERENCE IMAGES — USE THE BRIEF AS PRIMARY SOURCE:
Build the full commercial world from the user's description. Every frame must feel intentional, controlled, and expensive.`;

    return `You are a specialist prompt engineer for Kling AI with expertise in high-end commercial advertising production.

${frameContext}

THE COMMERCIAL LENS:
Think Apple, Nike, Rolex, Tesla launch video. Clean, minimal, aspirational. Every element serves the hero.

KLING AI PARSING RULES FOR COMMERCIAL:
- Clean background specs generate the sharpest product isolation — be exact: "pure matte white seamless infinity curve", "deep matte navy-to-black gradient"
- Rim lighting and edge separation must be described technically: "sharp bright rim light from directly behind the product", "thin specular edge highlight separating subject from background"
- Slow controlled camera moves outperform dramatic ones: "smooth 4-second push-in ending with product filling 60% of frame", "tight 180-degree orbit at constant elevation"
- Motion vocabulary that reads premium: "glides", "settles with precision", "drifts slowly into frame", "holds with complete stillness"

BUILD THIS STRUCTURE — weave into one paragraph:
1. HERO MOMENT: ${hasStartFrame ? 'The start frame as the opening — describe the product/subject exactly as shown' : 'The subject/product, its positioning, the dominant visual statement'}
2. ENVIRONMENT: ${hasStartFrame ? 'Background as established by the image' : 'Minimal, controlled, exact — nothing competes with the hero'}
3. LIGHTING RIG: Key, rim, fill — described as a pro lighting setup
4. CAMERA MOVE: One deliberate premium move${hasEndFrame ? ' — describe the journey from start frame composition to end frame composition' : ' — start framing, movement, end framing, speed'}
5. COLOR SIGNATURE: Brand palette and grade — what tones dominate, what reads luxury

Output: one tightly constructed commercial paragraph, 3–4 sentences. Lead with the hero. No headers or lists. Return ONLY the final prompt.`;
  },

  // ─── ANIME ───────────────────────────────────────────────────────────────────
  anime: (hasStartFrame, hasEndFrame) => {
    const frameContext = hasStartFrame && hasEndFrame
      ? `BOTH START AND END FRAMES ARE PROVIDED — THESE ARE YOUR PRIMARY SOURCE:
The start frame establishes the anime art style, character design, and opening scene. The end frame shows where the scene arrives — a different pose, expression, location, or lighting state.
- Lock the anime art style from the start frame as the very first phrase
- Describe the opening scene from the start frame
- Describe the visual journey and transformation that leads to the end frame's scene
- Do NOT contradict either image's art style, character design, or environment`
      : hasStartFrame
        ? `START FRAME IS PROVIDED — THIS IS YOUR PRIMARY SOURCE:
The start frame defines the anime art style, character design, environment, and color palette. Lock the art style from the image as the first phrase, describe what the image shows, then animate the scene forward. Do NOT contradict the image.`
        : hasEndFrame
          ? `END FRAME IS PROVIDED — THIS IS YOUR PRIMARY SOURCE:
The end frame defines the closing scene, character state, and art style. Lock the art style from the image as the first phrase, then build the prompt as a journey that arrives at this precise visual state.`
          : `NO REFERENCE IMAGES — THE STYLE LOCK IS CRITICAL:
Kling AI drifts toward photorealism unless the anime aesthetic is locked hard in the FIRST sentence. Choose ONE studio aesthetic and commit.`;

    return `You are a specialist prompt engineer for Kling AI with deep expertise in anime-style video generation.

${frameContext}

${!hasStartFrame && !hasEndFrame ? `STUDIO AESTHETIC SELECTION (choose the best match for the user's scene):
- "Studio Ghibli feature film quality" → warm pastoral environments, hand-painted lush backgrounds, expressive naturalistic characters, soft warm light, gentle motion
- "Makoto Shinkai atmospheric style" → hyper-detailed environments, volumetric god rays, deep emotional atmosphere, golden or blue-hour light, melancholy beauty
- "Kyoto Animation fluid motion style" → character-driven intimacy, precise fabric and hair physics, emotionally expressive faces, soft close framing
- "Trigger kinetic action style" → bold dynamic composition, speed lines, hard color contrast, dramatic Dutch tilts, high-energy motion
` : ''}
KLING AI PARSING RULES FOR ANIME:
- Cell shading must be locked in the first sentence: "2D anime art style, hand-drawn aesthetic, cel-shaded rendering" — front-load this or Kling renders photorealistic
- Character hair and fabric physics are a Kling strength — describe explicitly: "hair lifting in slow arcs on the wind", "fabric edge fluttering"
- Anime atmosphere works extremely well: light rays through canopy, cherry blossom scatter, rain on glass, moonlit ground mist
- Camera moves that parse best: "slow zoom from wide establishing to close-up", "parallax pan across layered background", "low dramatic upward angle"
- Color vocabulary: "vibrant saturated palette", "deep cel-shaded shadow fills", "bright specular hair highlights", "atmospheric depth haze"

BUILD THIS STRUCTURE — weave into one paragraph:
1. STYLE LOCK: ${hasStartFrame || hasEndFrame ? 'Identify and name the anime art style from the reference image(s) as the very first phrase' : 'Studio reference + rendering type in the very first phrase (non-negotiable)'}
2. SCENE: ${hasStartFrame ? 'Opening scene from the start frame' : 'Subject, action, emotional state'}
3. ENVIRONMENT: Background detail in the established aesthetic
4. LIGHT AND ATMOSPHERE: The atmospheric effect that carries the scene's emotion${hasEndFrame ? '\n5. TRANSITION: The visual journey and transformation that leads to the end frame' : '\n5. CAMERA: One anime-appropriate camera move'}

Output: one vivid anime paragraph opening with the style lock. 3–5 sentences. No headers or lists. Return ONLY the final prompt.`;
  },

  // ─── VOICEOVER ───────────────────────────────────────────────────────────────
  voiceover: (hasStartFrame, hasEndFrame) => {
    const frameContext = hasStartFrame && hasEndFrame
      ? `BOTH START AND END FRAMES ARE PROVIDED — THESE ARE YOUR PRIMARY SOURCE:
The start frame establishes the opening scene — environment, light quality, color, mood. The end frame shows where the visual journey arrives — a different time of day, location, weather state, or compositional angle.
- Describe the start frame as the opening image of the video
- Describe the end frame as the closing image — how the scene, light, or composition has shifted
- Build the camera move and atmospheric evolution as the bridge between them
- Do NOT contradict either image's environment, lighting, or color`
      : hasStartFrame
        ? `START FRAME IS PROVIDED — THIS IS YOUR PRIMARY SOURCE:
The start frame establishes the visual world — scene, environment, light quality, color tone, mood. Read the image as the opening frame and describe what it shows as the prompt anchor. Animate it forward from there. Do NOT contradict the image.`
        : hasEndFrame
          ? `END FRAME IS PROVIDED — THIS IS YOUR PRIMARY SOURCE:
The end frame defines the closing visual state. Build the prompt as an atmospheric journey that arrives at this image — describe the opening scene and camera move that leads to the end frame's exact composition and mood.`
          : `NO REFERENCE IMAGES — USE THE BRIEF AS PRIMARY SOURCE:
Build the full visual world from the user's description. Pure atmospheric B-roll designed to support narration.`;

    return `You are a specialist prompt engineer for Kling AI focused on premium B-roll and visual storytelling footage designed to accompany voiceover narration.

${frameContext}

THE VOICEOVER MINDSET:
Beautiful, emotionally resonant, calm enough to support spoken word. Think high-end documentary, luxury brand film, premium YouTube intro. No competing energy — every frame supports the narration.

KLING AI PARSING RULES FOR B-ROLL / VOICEOVER:
- Slow deliberate camera movements score best — specify timing: "gentle 8-second dolly forward", "barely perceptible upward drift over 5 seconds"
- Natural environmental motion adds life without distraction: "clouds drifting overhead", "golden grass swaying", "water surface catching and scattering morning light"
- Describe foreground, midground, and background layers — Kling responds well to spatial depth
- Golden hour and magic hour lighting produce the warmest and most aspirational output
- Compositional space: "open sky in the upper third", "negative space to the right" — leaves room for text overlays
- Color grade vocabulary: "warm lifted shadows, muted golden highlights", "cool desaturated documentary tones", "clean bright airy minimal grade"

BUILD THIS STRUCTURE — weave into one atmospheric paragraph:
1. SCENE ANCHOR: ${hasStartFrame ? 'The start frame as the opening — describe exactly what the image shows' : 'Primary visual — one highly specific sentence'}
2. ATMOSPHERE: Time of day, weather, light quality, emotional texture
3. CAMERA: One deliberate slow move with implicit timing${hasEndFrame ? ' that carries the scene from start frame to end frame' : ''}
4. MOTION LAYER: What moves naturally in the frame — environmental, not subject-driven
5. COLOR AND GRADE: The tonal character${hasEndFrame ? ' — consistent with both reference images' : ' — warm/aspirational, cool/credible, or clean/minimal'}
6. ${hasEndFrame ? 'CLOSING STATE: Describe the end frame as the arrival — the final composition and mood' : 'COMPOSITIONAL NOTE: How the frame breathes — spacious, layered, intimate'}

Output: one atmospheric paragraph that reads like a high-end documentary scene description. 3–5 sentences. No headers or lists. Return ONLY the final prompt.`;
  },
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
  hasEndFrame: boolean,
): Promise<string> {
  const styleKey = style.toLowerCase();
  const getSystemPrompt = STYLE_SYSTEM_PROMPTS[styleKey] ?? STYLE_SYSTEM_PROMPTS['cinematic'];
  const systemPrompt = getSystemPrompt(hasStartFrame, hasEndFrame);

  const textNote = textOnScreen && textContent
    ? `\n- TEXT ON SCREEN: "${textContent}" in ${fontColor} font — ensure clean framing space for on-screen text overlay`
    : '';

  const frameNote = hasStartFrame && hasEndFrame
    ? '\nNOTE: Both a start frame and end frame image are provided — anchor the opening to the start frame and the close to the end frame.'
    : hasStartFrame
      ? '\nNOTE: A start frame image is provided — anchor the prompt to what the start frame shows.'
      : hasEndFrame
        ? '\nNOTE: An end frame image is provided — build toward the end frame as the closing visual state.'
        : '';

  const isSpeak = styleKey === 'speaking';
  const userMsg = isSpeak
    ? `USER TALKING POINTS / INPUT:\n${brief.trim()}\n\nASPECT RATIO: ${aspectRatio}\nDURATION: ${duration} seconds${textNote}${frameNote}\n\nConvert these talking points into a smooth speaking video prompt. Return only the final prompt.`
    : `Transform this brief into an optimized Kling AI ${styleKey} video prompt:\n\nBRIEF: ${brief.trim()}\nASPECT RATIO: ${aspectRatio}\nDURATION: ${duration} seconds${textNote}${frameNote}\n\nReturn only the final prompt text.`;

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
  let textOnScreen = false, textOnScreenContent = '', fontColor = '#FFFFFF';
  let hasStartFrame = false, hasEndFrame = false;
  try {
    const body = await req.json();
    brief               = body.brief               ?? '';
    style               = body.style               ?? style;
    aspectRatio         = body.aspectRatio         ?? aspectRatio;
    duration            = body.duration            ?? duration;
    hasStartFrame       = body.hasStartFrame       ?? false;
    hasEndFrame         = body.hasEndFrame         ?? false;
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
    const enhanced = await enhanceBrief(brief, style, aspectRatio, duration, textOnScreen, textOnScreenContent, fontColor, hasStartFrame, hasEndFrame);
    return new Response(JSON.stringify({ prompts: [enhanced] }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Enhancement failed' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
