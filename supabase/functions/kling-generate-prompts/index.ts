import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing auth token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!brief.trim()) {
    return new Response(JSON.stringify({ error: 'brief is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const scenes = [
    `${brief}. ${style} style, ${aspectRatio} aspect ratio, opening establishing shot, high production value, 8K, ${duration}s`,
    `${brief}. ${style} style, close-up detail shot, dramatic lighting, cinematic depth of field, ${duration}s`,
    `${brief}. ${style} style, dynamic camera movement, vivid colors, professional grade, ${duration}s`,
    `${brief}. ${style} style, wide angle, golden hour lighting, epic scale, ${duration}s closing shot`,
  ];

  return new Response(JSON.stringify({ prompts: scenes }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
