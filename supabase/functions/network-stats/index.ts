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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
}

function getPeriod() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
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

  const userId = user.id;
  const period = getPeriod();

  // ── Parallel queries ──────────────────────────────────────────────────────
  const [
    ranksRes,
    userRankRes,
    directTeamRes,
    rankHistoryRes,
    stipendMonthRes,
    commMonthRes,
    stipendLifetimeRes,
    commLifetimeRes,
  ] = await Promise.all([
    // All rank definitions
    supabase
      .from('network_ranks')
      .select('rank, rank_order, mrr_min_cents, mrr_max_cents, stipend_cents, min_personal_refs')
      .order('rank_order'),

    // This user's current rank row
    supabase
      .from('network_user_ranks')
      .select('current_rank, qualified_rank, below_threshold_since, team_mrr_cents, personal_mrr_cents, largest_leg_mrr_cents, active_team_count, personal_ref_count')
      .eq('supabase_user_id', userId)
      .maybeSingle(),

    // Direct (personally sponsored) team members
    supabase
      .from('network_nodes')
      .select('supabase_user_id, plan, plan_mrr_cents, is_active, enrolled_at')
      .eq('sponsor_user_id', userId)
      .order('enrolled_at'),

    // Rank history (last 6 changes, newest first)
    supabase
      .from('network_rank_history')
      .select('previous_rank, new_rank, reason, team_mrr_cents, changed_at')
      .eq('supabase_user_id', userId)
      .order('changed_at', { ascending: false })
      .limit(6),

    // This month's stipend
    supabase
      .from('network_stipends')
      .select('stipend_cents')
      .eq('supabase_user_id', userId)
      .eq('period', period),

    // This month's referral commissions
    supabase
      .from('network_ref_commissions')
      .select('commission_cents')
      .eq('supabase_user_id', userId)
      .eq('period', period),

    // Lifetime stipends (approved or paid)
    supabase
      .from('network_stipends')
      .select('stipend_cents')
      .eq('supabase_user_id', userId)
      .in('status', ['approved', 'paid']),

    // Lifetime commissions (approved or paid)
    supabase
      .from('network_ref_commissions')
      .select('commission_cents')
      .eq('supabase_user_id', userId)
      .in('status', ['approved', 'paid']),
  ]);

  // ── Compute values ────────────────────────────────────────────────────────
  const ranks: any[] = ranksRes.data ?? [];
  const userRank = userRankRes.data;

  const currentRank: string | null = userRank?.current_rank ?? null;
  const teamMrr      = userRank?.team_mrr_cents      ?? 0;
  const personalMrr  = userRank?.personal_mrr_cents  ?? 0;
  const largestLeg   = userRank?.largest_leg_mrr_cents ?? 0;
  const teamCount    = userRank?.active_team_count   ?? 0;
  const personalRefs = userRank?.personal_ref_count  ?? 0;
  const belowThreshold = userRank?.below_threshold_since ?? null;

  // Next rank = lowest rank whose mrr_min_cents > teamMrr, or first rank if unranked
  const currentRankOrder = ranks.find(r => r.rank === currentRank)?.rank_order ?? -1;
  const nextRank = ranks.find(r => r.rank_order > currentRankOrder) ?? null;
  const nextRankMrrNeeded = nextRank ? Math.max(0, nextRank.mrr_min_cents - teamMrr) : 0;

  // This month earnings
  const stipendMonth = (stipendMonthRes.data ?? []).reduce((s: number, r: any) => s + (r.stipend_cents ?? 0), 0);
  const commMonth    = (commMonthRes.data ?? []).reduce((s: number, r: any) => s + (r.commission_cents ?? 0), 0);

  // Lifetime earnings
  const stipendLifetime = (stipendLifetimeRes.data ?? []).reduce((s: number, r: any) => s + (r.stipend_cents ?? 0), 0);
  const commLifetime    = (commLifetimeRes.data ?? []).reduce((s: number, r: any) => s + (r.commission_cents ?? 0), 0);

  // ── Response ──────────────────────────────────────────────────────────────
  return json({
    user_id: userId,
    current_rank: currentRank,
    next_rank: nextRank,
    team_mrr_cents: teamMrr,
    personal_mrr_cents: personalMrr,
    largest_leg_mrr_cents: largestLeg,
    active_team_count: teamCount,
    personal_ref_count: personalRefs,
    below_threshold_since: belowThreshold,
    next_rank_mrr_needed: nextRankMrrNeeded,
    this_month: {
      period,
      stipend_cents: stipendMonth,
      ref_commission_cents: commMonth,
      total_cents: stipendMonth + commMonth,
    },
    lifetime_earned_cents: stipendLifetime + commLifetime,
    direct_team: directTeamRes.data ?? [],
    rank_history: rankHistoryRes.data ?? [],
    ranks,
  }, 200, corsHeaders);
});
