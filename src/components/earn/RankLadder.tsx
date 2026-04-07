import React from 'react';
import { Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { RANK_COLORS } from './RankBadge';
import type { NetworkStats, RankDef } from '../../hooks/useNetworkStats';

const GOLD   = '#D6B25E';
const GOLD_L = '#F0D27C';

function fmtDollars(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

interface RankLadderProps {
  stats: NetworkStats;
}

export function RankLadder({ stats }: RankLadderProps) {
  const sortedRanks = [...stats.ranks].sort((a, b) => a.rank_order - b.rank_order);
  const currentRankOrder = sortedRanks.find(r => r.rank === stats.current_rank)?.rank_order ?? -1;

  const progressPct = stats.next_rank
    ? clamp(Math.round((stats.team_mrr_cents / stats.next_rank.mrr_min_cents) * 100), 0, 100)
    : 100;

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 20px 22px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
        Rank Progress
      </div>

      {/* Grace period warning */}
      {stats.below_threshold_since && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16,
        }}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#fbbf24', marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#fde68a', lineHeight: 1.5, margin: 0 }}>
            Your team MRR has dropped below the <strong>{stats.current_rank}</strong> threshold.
            You have 30 days to recover before de-ranking.{' '}
            Grace period started {new Date(stats.below_threshold_since).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
          </p>
        </div>
      )}

      {/* Horizontal rank ladder — scrolls on mobile */}
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 6, minWidth: 'max-content', paddingBottom: 2 }}>
          {sortedRanks.map((rank, i) => {
            const isCurrent = rank.rank === stats.current_rank;
            const isComplete = rank.rank_order <= currentRankOrder;
            const colors = RANK_COLORS[rank.rank] ?? { dot: '#9ca3af', text: '#d1d5db', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.2)' };

            return (
              <React.Fragment key={rank.rank}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  minWidth: 88,
                }}>
                  {/* Rank node */}
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    background: isCurrent
                      ? colors.bg
                      : isComplete
                      ? `${colors.bg}`
                      : 'rgba(255,255,255,0.03)',
                    border: isCurrent
                      ? `2px solid ${colors.dot}`
                      : isComplete
                      ? `1px solid ${colors.border}`
                      : '1px solid rgba(255,255,255,0.07)',
                    boxShadow: isCurrent ? `0 0 16px ${colors.dot}40` : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4" style={{ color: colors.dot }} />
                    ) : (
                      <Lock className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.2)' }} />
                    )}
                    <span style={{
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      color: isComplete ? colors.text : 'rgba(255,255,255,0.2)',
                      textTransform: 'uppercase',
                    }}>
                      {rank.rank.slice(0, 4)}
                    </span>
                  </div>
                  {/* Rank name */}
                  <span style={{
                    fontSize: 10,
                    fontWeight: isCurrent ? 800 : 600,
                    color: isCurrent ? colors.text : isComplete ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
                    textAlign: 'center',
                  }}>
                    {rank.rank}
                  </span>
                  {/* MRR label */}
                  <span style={{
                    fontSize: 9,
                    color: isComplete ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
                    textAlign: 'center',
                  }}>
                    {fmtDollars(rank.mrr_min_cents)}
                  </span>
                </div>

                {/* Connector */}
                {i < sortedRanks.length - 1 && (
                  <div style={{
                    width: 20,
                    height: 2,
                    borderRadius: 2,
                    alignSelf: 'center',
                    marginBottom: 36,
                    background: rank.rank_order < currentRankOrder
                      ? GOLD
                      : 'rgba(255,255,255,0.1)',
                    flexShrink: 0,
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Progress bar toward next rank */}
      {stats.next_rank && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
              Progress to {stats.next_rank.rank}
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: GOLD_L }}>
              {progressPct}%
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              borderRadius: 99,
              background: `linear-gradient(90deg, ${GOLD}, ${GOLD_L})`,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              {fmtDollars(stats.team_mrr_cents)} of {fmtDollars(stats.next_rank.mrr_min_cents)} team MRR
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              {fmtDollars(stats.next_rank_mrr_needed)} more needed
            </span>
          </div>
        </div>
      )}

      {!stats.next_rank && stats.current_rank && (
        <div style={{
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 10,
          background: 'rgba(244,114,182,0.08)',
          border: '1px solid rgba(244,114,182,0.2)',
        }}>
          <span style={{ fontSize: 14 }}>🏆</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fbcfe8' }}>
            You've reached the highest rank — Ambassador!
          </span>
        </div>
      )}
    </div>
  );
}
