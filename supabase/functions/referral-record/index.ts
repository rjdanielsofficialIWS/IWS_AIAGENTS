import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_ORIGINS = [
  'https://infinitewealthsolutionsai.com',
  'https://www.infinitewealthsolutionsai.com',
];

function cors(origin: string | null) {
  const o = origin ?? '';
  const allowed = CORS_ORIGINS.includes(o) ? o : CORS_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(body: unknown, status = 200, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = cors(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401, corsHeaders);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401, corsHeaders);

  // ── Parse body ────────────────────────────────────────────────────────────
  let referralCode: string;
  try {
    const body = await req.json();
    referralCode = (body.referralCode ?? '').trim().toUpperCase();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, corsHeaders);
  }

  if (!referralCode) {
    return json({ error: 'referralCode is required' }, 400, corsHeaders);
  }

  const referredUserId = user.id;

  // ── Look up the referral code ─────────────────────────────────────────────
  const { data: codeRow } = await supabase
    .from('referral_codes')
    .select('supabase_user_id, code')
    .or(`code.eq.${referralCode},custom_code.eq.${referralCode}`)
    .maybeSingle();

  if (!codeRow) {
    // Unknown code — silently ignore (don't expose existence)
    return json({ ok: true, enrolled: false, reason: 'code_not_found' }, 200, corsHeaders);
  }

  const sponsorUserId: string = codeRow.supabase_user_id;

  // Prevent self-referral
  if (sponsorUserId === referredUserId) {
    return json({ ok: true, enrolled: false, reason: 'self_referral' }, 200, corsHeaders);
  }

  // ── Check if user is already enrolled with a sponsor ──────────────────────
  const { data: existingNode } = await supabase
    .from('network_nodes')
    .select('sponsor_user_id')
    .eq('supabase_user_id', referredUserId)
    .maybeSingle();

  if (existingNode?.sponsor_user_id) {
    // Already has a sponsor — do not override
    return json({ ok: true, enrolled: false, reason: 'already_enrolled' }, 200, corsHeaders);
  }

  // ── Ensure sponsor exists in network_nodes ────────────────────────────────
  await supabase.rpc('sync_network_node', { p_user_id: sponsorUserId });

  // ── Upsert referred user into network_nodes with sponsor set ──────────────
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('supabase_user_id', referredUserId)
    .maybeSingle();

  const planMrrCents = await (async () => {
    if (!subData?.plan) return 0;
    const { data: pp } = await supabase
      .from('plan_pricing')
      .select('monthly_cents')
      .eq('plan', subData.plan)
      .maybeSingle();
    return pp?.monthly_cents ?? 0;
  })();

  const isActive = subData?.status === 'active' || subData?.status === 'trialing'
    ? (subData.current_period_end ? new Date(subData.current_period_end) > new Date() : true)
    : false;

  const { error: nodeErr } = await supabase
    .from('network_nodes')
    .upsert({
      supabase_user_id:   referredUserId,
      sponsor_user_id:    sponsorUserId,
      referral_code_used: codeRow.code,
      plan:               subData?.plan ?? null,
      plan_mrr_cents:     planMrrCents,
      is_active:          isActive,
    }, { onConflict: 'supabase_user_id', ignoreDuplicates: false });

  if (nodeErr) {
    console.error('network_nodes upsert error:', nodeErr.message);
    return json({ error: 'Failed to enroll' }, 500, corsHeaders);
  }

  // ── Also write to legacy referrals table (for stripe-checkout discount) ───
  await supabase
    .from('referrals')
    .upsert({
      referrer_user_id: sponsorUserId,
      referred_user_id: referredUserId,
      referred_email:   user.email ?? null,
      status:           'pending',
      discount_applied: false,
    }, { onConflict: 'referrer_user_id,referred_user_id', ignoreDuplicates: true });

  // ── Re-evaluate sponsor's rank now that they have a new team member ────────
  await supabase.rpc('evaluate_user_rank', { p_user_id: sponsorUserId }).catch(() => {});

  return json({ ok: true, enrolled: true, sponsor_user_id: sponsorUserId }, 200, corsHeaders);
});
