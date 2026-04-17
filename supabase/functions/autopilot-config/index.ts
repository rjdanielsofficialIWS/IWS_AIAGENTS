import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = ['https://infinitewealthsolutionsai.com', 'https://www.infinitewealthsolutionsai.com'];

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = CORS.includes(origin) ? origin : CORS[0];
  const cors = {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: cors });
  const respond = (code: number, data: unknown) =>
    new Response(JSON.stringify(data), { status: code, headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return respond(401, { error: 'Unauthorized' });

  // ── GET: load config ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspaceId') ?? null;

    // Explicit column list — avoids PostgREST schema cache lag on newly added columns (e.g. last_run_at)
    let q = supabase.from('autopilot_configs')
      .select('id, supabase_user_id, workspace_id, niche, product_service, twitter_accounts, tone, start_hour, end_hour, platforms, is_active, last_run_date, last_run_at, trending_topics, created_at, updated_at')
      .eq('supabase_user_id', user.id);
    q = workspaceId ? (q as any).eq('workspace_id', workspaceId) : (q as any).is('workspace_id', null);
    const { data, error } = await (q as any).maybeSingle();
    if (error) return respond(500, { error: error.message });
    return respond(200, { config: data ?? null });
  }

  // ── POST: upsert config ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return respond(400, { error: 'Invalid JSON' }); }

    const workspaceId = typeof body.workspace_id === 'string' ? body.workspace_id.trim() : null;

    const record = {
      supabase_user_id: user.id,
      workspace_id: workspaceId || null,
      niche: String(body.niche ?? '').trim(),
      product_service: String(body.product_service ?? '').trim(),
      twitter_accounts: Array.isArray(body.twitter_accounts)
        ? body.twitter_accounts
            .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
            .map((a) => a.trim().replace(/^@/, ''))
        : [],
      tone: String(body.tone ?? '').trim(),
      start_hour: Math.max(0, Math.min(23, Number(body.start_hour ?? 8))),
      end_hour:   Math.max(0, Math.min(23, Number(body.end_hour   ?? 20))),
      platforms: Array.isArray(body.platforms)
        ? body.platforms.filter((p): p is string => typeof p === 'string')
        : ['x', 'linkedin', 'threads'],
      is_active: body.is_active !== false,
      updated_at: new Date().toISOString(),
    };

    // Manual upsert — functional unique index can't be used with .upsert(onConflict)
    let existsQ = supabase.from('autopilot_configs').select('id').eq('supabase_user_id', user.id);
    existsQ = workspaceId
      ? (existsQ as any).eq('workspace_id', workspaceId)
      : (existsQ as any).is('workspace_id', null);
    const { data: existing } = await (existsQ as any).maybeSingle();

    let data, error;
    if (existing?.id) {
      ({ data, error } = await supabase.from('autopilot_configs').update(record).eq('id', existing.id).select().maybeSingle());
    } else {
      ({ data, error } = await supabase.from('autopilot_configs').insert(record).select().maybeSingle());
    }

    if (error) return respond(500, { error: error.message });
    return respond(200, { config: data, success: true });
  }

  return respond(405, { error: 'Method not allowed' });
});
