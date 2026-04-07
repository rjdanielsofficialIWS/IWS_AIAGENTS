import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/vapiAI';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;
  const { data: refreshed } = await supabase.auth.refreshSession();
  return refreshed.session?.access_token ?? '';
}

export interface RankDef {
  rank: string;
  rank_order: number;
  mrr_min_cents: number;
  mrr_max_cents: number | null;
  stipend_cents: number;
  min_personal_refs: number;
}

export interface DirectMember {
  supabase_user_id: string;
  plan: string;
  plan_mrr_cents: number;
  is_active: boolean;
  enrolled_at: string;
}

export interface RankChange {
  previous_rank: string | null;
  new_rank: string;
  reason: string;
  team_mrr_cents: number;
  changed_at: string;
}

export interface NetworkStats {
  user_id: string;
  current_rank: string | null;
  next_rank: RankDef | null;
  team_mrr_cents: number;
  personal_mrr_cents: number;
  largest_leg_mrr_cents: number;
  active_team_count: number;
  personal_ref_count: number;
  below_threshold_since: string | null;
  next_rank_mrr_needed: number;
  this_month: {
    period: string;
    stipend_cents: number;
    ref_commission_cents: number;
    total_cents: number;
  };
  lifetime_earned_cents: number;
  direct_team: DirectMember[];
  rank_history: RankChange[];
  ranks: RankDef[];
}

interface UseNetworkStatsResult {
  stats: NetworkStats | null;
  referralCode: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useNetworkStats(userId: string | null): UseNetworkStatsResult {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const [statsRes, codeRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/functions/v1/network-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        supabase
          .from('referral_codes')
          .select('code')
          .eq('supabase_user_id', userId)
          .maybeSingle(),
      ]);

      if (!statsRes.ok) {
        const body = await statsRes.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${statsRes.status}`);
      }
      setStats(await statsRes.json());
      setReferralCode((codeRes.data as any)?.code ?? null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load network stats');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { stats, referralCode, loading, error, refetch: fetch_ };
}
