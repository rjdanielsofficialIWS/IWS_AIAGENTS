import { getCorsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

// Style-specific prompt engineering for highest quality output
function buildScenePrompts(brief: string, style: string, aspectRatio: string, duration: string): string[] {
  const base = brief.trim();
  const ar = aspectRatio || '16:9';
  const dur = duration || '5';

  const styleMap: Record<string, string[]> = {
    cinematic: [
      `${base}. Cinematic film look, anamorphic lens flare, shallow depth of field, dramatic chiaroscuro lighting, muted desaturated color grade, professional movie quality, ARRI camera aesthetic, ${ar}, ${dur}s`,
      `${base}. Close-up cinematic shot, bokeh background, golden hour rim lighting, film grain texture, widescreen letterbox composition, Oscar-quality production value, ${dur}s`,
      `${base}. Epic establishing shot, slow dolly push-in, teal and orange color grading, atmospheric haze, IMAX quality detail, emotionally resonant framing, ${dur}s`,
      `${base}. Dynamic tracking shot, cinematic motion blur, high contrast shadows, dramatic sky backdrop, feature-film production quality, ${dur}s`,
    ],
    commercial: [
      `${base}. Premium commercial advertisement style, clean bright studio lighting, polished product-hero framing, crisp whites and deep blacks, high-end brand aesthetic, sharp detail, professional color grading, ${ar}, ${dur}s`,
      `${base}. Luxury brand commercial, glossy sleek surfaces, even softbox lighting, aspirational lifestyle framing, Apple or Nike ad quality, clean modern composition, ${dur}s`,
      `${base}. High-production commercial shoot, hero product in spotlight, elegant minimal background, premium feel, 4K sharpness, broadcast-quality color, ${dur}s`,
      `${base}. Corporate commercial style, confident confident subject, bright professional lighting, modern office or clean environment, trustworthy brand aesthetic, ${dur}s`,
    ],
    documentary: [
      `${base}. Cinematic documentary style, handheld vérité feel, natural available light, authentic candid framing, National Geographic quality, 4K detail, ${ar}, ${dur}s`,
      `${base}. Documentary close-up interview, shallow focus on subject, natural environmental lighting, emotional authenticity, PBS Frontline quality cinematography, ${dur}s`,
      `${base}. Documentary establishing wide shot, environmental context, natural light, grounded realistic color grade, journalistic framing, ${dur}s`,
      `${base}. Observational documentary style, slow deliberate push-in, real-world lighting, thought-provoking composition, BBC documentary quality, ${dur}s`,
    ],
    anime: [
      `${base}. High-quality anime style, Studio Ghibli aesthetic, lush vibrant colors, expressive character design, detailed background art, dramatic lighting effects, ${ar}, ${dur}s`,
      `${base}. Anime cinematic shot, dramatic speed lines, vivid saturated palette, expressive emotional framing, Makoto Shinkai atmospheric quality, ${dur}s`,
      `${base}. Anime action sequence, dynamic pose, bold cel-shaded colors, dramatic energy effects, top-tier animation production value, ${dur}s`,
      `${base}. Anime wide establishing shot, painterly background, soft diffused light, emotionally evocative composition, theatrical anime film quality, ${dur}s`,
    ],
    realistic: [
      `${base}. Hyperrealistic photographic quality, 8K resolution, perfect natural lighting, true-to-life color accuracy, photojournalism sharpness, ${ar}, ${dur}s`,
      `${base}. Photorealistic detail, natural skin tones, crisp environmental textures, RAW photograph quality, zero artificiality, ${dur}s`,
      `${base}. Realistic wide environment shot, accurate perspective, true-to-life color science, Sony A7R quality detail, ${dur}s`,
      `${base}. Ultra-realistic close-up, macro lens detail, natural bokeh, authentic lighting, photographic perfection, ${dur}s`,
    ],
    fantasy: [
      `${base}. Epic fantasy style, magical atmospheric lighting, otherworldly color palette, sweeping mythical landscape, Lord of the Rings visual grandeur, ${ar}, ${dur}s`,
      `${base}. Fantasy wide establishing shot, dramatic volumetric light rays, ethereal mist, detailed fantasy architecture, James Cameron-level VFX quality, ${dur}s`,
      `${base}. High fantasy close-up, magical particle effects, glowing enchanted elements, dramatic rim lighting, AAA video game cutscene quality, ${dur}s`,
      `${base}. Fantasy action moment, dynamic composition, magical energy surges, vivid otherworldly colors, cinematic scale, ${dur}s`,
    ],
    noir: [
      `${base}. Classic film noir, hard low-key lighting, deep shadows with single-source spotlight, black and white desaturated palette, 1940s detective aesthetic, ${ar}, ${dur}s`,
      `${base}. Noir close-up, dramatic Venetian blind shadow patterns, high contrast black and white, moody atmospheric smoke, Raymond Chandler aesthetic, ${dur}s`,
      `${base}. Neo-noir style, rain-slicked streets, neon reflections, dark moody palette, cinematic tension, Michael Mann visual quality, ${dur}s`,
      `${base}. Noir establishing shot, isolated subject in darkness, single overhead light, dramatic long shadows, timeless dark atmosphere, ${dur}s`,
    ],
    vibrant: [
      `${base}. Vibrant hyper-saturated colors, bold graphic composition, energetic dynamic framing, Instagram-optimized visual pop, maximum color impact, ${ar}, ${dur}s`,
      `${base}. Bold colorful commercial style, vivid complementary color palette, high-energy motion, eye-catching visual design, social media viral aesthetic, ${dur}s`,
      `${base}. Vibrant lifestyle shot, rich warm colors, golden hour saturation boost, joyful energetic mood, aspirational social media quality, ${dur}s`,
      `${base}. Ultra-colorful abstract composition, bold geometric elements, saturated gradient background, modern graphic design aesthetic, ${dur}s`,
    ],
  };

  return styleMap[style.toLowerCase()] ?? styleMap['cinematic'];
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
  try {
    const body = await req.json();
    brief       = body.brief       ?? '';
    style       = body.style       ?? style;
    aspectRatio = body.aspectRatio ?? aspectRatio;
    duration    = body.duration    ?? duration;
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

  const prompts = buildScenePrompts(brief, style, aspectRatio, duration);

  return new Response(JSON.stringify({ prompts }), {
    status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
