import React from 'react';
import { DollarSign, TrendingUp, Zap, Star } from 'lucide-react';
import type { NetworkStats } from '../../hooks/useNetworkStats';

const GOLD   = '#D6B25E';
const GOLD_L = '#F0D27C';

function fmt(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

interface EarningsCardsProps {
  stats: NetworkStats;
}

export function EarningsCards({ stats }: EarningsCardsProps) {
  const cards = [
    {
      label: "This Month's Monthly Pay",
      value: fmt(stats.this_month.stipend_cents),
      icon: <Star className="w-4 h-4" />,
      accent: GOLD,
      accentBg: `${GOLD}18`,
    },
    {
      label: 'Referral Commissions',
      value: fmt(stats.this_month.ref_commission_cents),
      icon: <TrendingUp className="w-4 h-4" />,
      accent: '#60a5fa',
      accentBg: 'rgba(96,165,250,0.12)',
    },
    {
      label: "This Month's Total",
      value: fmt(stats.this_month.total_cents),
      icon: <Zap className="w-4 h-4" />,
      accent: '#4ade80',
      accentBg: 'rgba(74,222,128,0.12)',
    },
    {
      label: 'Lifetime Earned',
      value: fmt(stats.lifetime_earned_cents),
      icon: <DollarSign className="w-4 h-4" />,
      accent: GOLD_L,
      accentBg: `${GOLD_L}15`,
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {cards.map(card => (
        <div key={card.label} style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: card.accentBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: card.accent,
            marginBottom: 2,
          }}>
            {card.icon}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
            {card.value}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {card.label}
          </div>
        </div>
      ))}
    </div>
  );
}
