import React from 'react';
import { Copy, CheckCircle2, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useNetworkStats } from '../../hooks/useNetworkStats';
import { RankBadge, RANK_COLORS } from './RankBadge';
import { EarningsCards } from './EarningsCards';
import { RankLadder } from './RankLadder';
import { DirectTeam } from './DirectTeam';

const GOLD   = '#D6B25E';
const GOLD_L = '#F0D27C';
const GOLD_D = '#8F6B1E';
const BG     = 'linear-gradient(135deg, #141414 0%, #2a2a2a 50%, #1a1a1a 100%)';

function fmtDollars(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonBlock({ w, h, radius = 8 }: { w?: string; h?: number; radius?: number }) {
  return (
    <div style={{
      width: w ?? '100%', height: h ?? 16, borderRadius: radius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: 'earnSkeleton 1.4s infinite',
    }} />
  );
}

function SkeletonPage() {
  return (
    <>
      <style>{`@keyframes earnSkeleton { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header skeleton */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <SkeletonBlock w="80px" h={24} radius={20} />
            <SkeletonBlock w="60%" h={14} />
          </div>
          <SkeletonBlock h={40} radius={10} />
        </div>
        {/* Cards skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SkeletonBlock w="32px" h={32} radius={9} />
              <SkeletonBlock h={28} w="70%" />
              <SkeletonBlock h={10} w="80%" />
            </div>
          ))}
        </div>
        {/* Rank ladder skeleton */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
          <SkeletonBlock h={12} w="120px" />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {[0,1,2,3,4,5,6].map(i => <SkeletonBlock key={i} w="88px" h={80} radius={14} />)}
          </div>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonBlock h={6} radius={99} />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Rank Table ───────────────────────────────────────────────────────────────

function RankTable({ stats }: { stats: ReturnType<typeof useNetworkStats>['stats'] }) {
  if (!stats) return null;
  const sorted = [...stats.ranks].filter(r => r.rank !== 'Builder').sort((a, b) => a.rank_order - b.rank_order);
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Compensation Plan — All Ranks
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Rank', 'Team MRR Required', 'Monthly Pay', 'Referral Commission'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((rank) => {
              const isCurrent = rank.rank === stats.current_rank;
              const colors = RANK_COLORS[rank.rank] ?? { dot: '#9ca3af', text: '#d1d5db', bg: 'rgba(156,163,175,0.05)', border: 'rgba(156,163,175,0.15)' };
              return (
                <tr key={rank.rank} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: isCurrent ? `${colors.bg}` : 'transparent',
                }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors.dot, flexShrink: 0, boxShadow: isCurrent ? `0 0 6px ${colors.dot}80` : 'none' }} />
                      <span style={{ fontSize: 13, fontWeight: isCurrent ? 800 : 600, color: isCurrent ? colors.text : 'rgba(255,255,255,0.6)' }}>
                        {rank.rank}
                      </span>
                      {isCurrent && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: colors.bg, color: colors.text, border: `1px solid ${colors.dot}40`, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: isCurrent ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: isCurrent ? 700 : 400 }}>
                    {fmtDollars(rank.mrr_min_cents)}+
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: rank.stipend_cents > 0 ? (isCurrent ? GOLD_L : GOLD) : 'rgba(255,255,255,0.2)',
                    }}>
                      {rank.stipend_cents > 0 ? fmtDollars(rank.stipend_cents) + '/mo' : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    20% recurring
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Rank History ─────────────────────────────────────────────────────────────

function RankHistory({ history }: { history: ReturnType<typeof useNetworkStats>['stats'] extends null ? never : NonNullable<ReturnType<typeof useNetworkStats>['stats']>['rank_history'] }) {
  if (!history.length) return null;
  const shown = [...history].sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()).slice(0, 6);

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Rank History
        </div>
      </div>
      <div>
        {shown.map((entry, i) => {
          const isPromo = entry.reason === 'promoted';
          const isDerank = entry.reason === 'deranked';
          const colors = RANK_COLORS[entry.new_rank] ?? { dot: '#9ca3af', text: '#d1d5db', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.2)' };
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 18px',
              borderBottom: i < shown.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              {/* Icon */}
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isPromo ? 'rgba(74,222,128,0.1)' : isDerank ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)',
              }}>
                {isPromo
                  ? <TrendingUp className="w-3.5 h-3.5" style={{ color: '#4ade80' }} />
                  : isDerank
                  ? <TrendingDown className="w-3.5 h-3.5" style={{ color: '#f87171' }} />
                  : <Minus className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                }
              </div>
              {/* Rank change */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {entry.previous_rank && (
                  <>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                      {entry.previous_rank}
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>→</span>
                  </>
                )}
                <span style={{ fontSize: 12, fontWeight: 800, color: colors.text }}>{entry.new_rank}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                  background: isPromo ? 'rgba(74,222,128,0.1)' : isDerank ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)',
                  color: isPromo ? '#4ade80' : isDerank ? '#f87171' : 'rgba(255,255,255,0.35)',
                  textTransform: 'capitalize',
                }}>
                  {entry.reason}
                </span>
              </div>
              {/* MRR + date */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                  {fmtDollars(entry.team_mrr_cents)}/mo
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                  {new Date(entry.changed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FAQ Strip ────────────────────────────────────────────────────────────────

function FaqStrip() {
  const items = [
    {
      title: 'Team MRR',
      body: 'The total monthly subscription value of every active member in your entire downline, however deep.',
    },
    {
      title: 'Monthly Pay',
      body: 'A flat monthly payment from Infinite Media based on your rank. Paid on the 1st of each month.',
    },
    {
      title: 'Referral Commission',
      body: '20% of the monthly subscription of every person you personally enrolled, recurring every month they stay active.',
    },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
      {items.map(item => (
        <div key={item.title} style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: '16px 18px',
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: GOLD_L, marginBottom: 6 }}>{item.title}</div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>{item.body}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Qualification Rules ──────────────────────────────────────────────────────

function QualificationRules() {
  const rules = [
    'Must be an active paying subscriber yourself',
    'Must have at least 3 active personal referrals to qualify for any monthly pay',
    'Max 20% of team MRR can come from personal enrollments (depth requirement)',
    'No single downline leg can exceed 50% of team MRR',
    'De-ranking has a 30-day grace period',
  ];
  return (
    <div style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}25`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        Qualification Rules
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {rules.map(rule => (
          <li key={rule} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, flexShrink: 0, marginTop: 5 }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{rule}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main EarnPage ────────────────────────────────────────────────────────────

interface EarnPageProps {
  userId: string | null;
}

export function EarnPage({ userId }: EarnPageProps) {
  const { stats, referralCode, loading, error, refetch } = useNetworkStats(userId);
  const [copied, setCopied] = React.useState(false);

  const referralLink = referralCode
    ? `https://infinitewealthsolutionsai.com?ref=${referralCode}`
    : '';

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!userId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
        Sign in to access the Builder Network
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: BG }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px 100px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Header Strip ── */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <RankBadge rank={stats?.current_rank ?? null} size="lg" />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Share your link. Earn 20% on every referral + monthly pay based on your team's MRR.
            </p>
          </div>

          {/* Referral link */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: 1, borderRadius: 10, padding: '10px 14px', fontSize: 12, fontFamily: 'monospace',
              background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)',
              color: referralLink ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {loading ? 'Loading…' : referralLink || 'Referral link not found'}
            </div>
            <button
              onClick={copyLink}
              disabled={!referralLink}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: copied ? 'rgba(74,222,128,0.15)' : `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`,
                color: copied ? 'rgb(74,222,128)' : '#000',
                border: copied ? '1px solid rgba(74,222,128,0.3)' : 'none',
                cursor: referralLink ? 'pointer' : 'not-allowed',
                opacity: referralLink ? 1 : 0.4,
                whiteSpace: 'nowrap',
              }}
            >
              {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Link</>}
            </button>
          </div>
        </div>

        {/* ── Loading state ── */}
        {loading && <SkeletonPage />}

        {/* ── Error state ── */}
        {!loading && error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 14, padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <p style={{ color: '#fca5a5', fontSize: 13, margin: 0, textAlign: 'center' }}>
              Failed to load network stats: {error}
            </p>
            <button onClick={refetch} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700,
              background: 'rgba(239,68,68,0.15)', color: '#fca5a5',
              border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer',
            }}>
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* ── Data sections ── */}
        {!loading && !error && stats && (
          <>
            {/* Earnings Cards */}
            <EarningsCards stats={stats} />

            {/* Rank Ladder */}
            <RankLadder stats={stats} />

            {/* Rank Table */}
            <RankTable stats={stats} />

            {/* Qualification Rules */}
            <QualificationRules />

            {/* Your Team */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Your Direct Team
              </div>
              <DirectTeam
                members={stats.direct_team}
                personalRefCount={stats.personal_ref_count}
                personalMrrCents={stats.personal_mrr_cents}
                referralLink={referralLink}
              />
            </div>

            {/* Rank History */}
            {stats.rank_history.length > 0 && (
              <RankHistory history={stats.rank_history} />
            )}

            {/* FAQ */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                How It Works
              </div>
              <FaqStrip />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
