import React from 'react';

export const RANK_COLORS: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  Builder:    { dot: '#9ca3af', text: '#d1d5db', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.25)' },
  Hustler:    { dot: '#60a5fa', text: '#93c5fd', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)' },
  Leader:     { dot: '#4ade80', text: '#86efac', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.25)' },
  Director:   { dot: '#fbbf24', text: '#fde68a', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)' },
  Executive:  { dot: '#c084fc', text: '#e9d5ff', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)' },
  Elite:      { dot: '#fb923c', text: '#fed7aa', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.25)' },
  Ambassador: { dot: '#f472b6', text: '#fbcfe8', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.25)' },
};

const UNRANKED = { dot: 'rgba(255,255,255,0.2)', text: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)' };

interface RankBadgeProps {
  rank: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
  const colors = rank ? (RANK_COLORS[rank] ?? UNRANKED) : UNRANKED;
  const label = rank ?? 'Unranked';

  const dotSize = size === 'sm' ? 6 : size === 'lg' ? 10 : 8;
  const fontSize = size === 'sm' ? 10 : size === 'lg' ? 14 : 12;
  const px = size === 'sm' ? '6px 10px' : size === 'lg' ? '8px 14px' : '6px 12px';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: px,
      borderRadius: 20,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      fontSize,
      fontWeight: 700,
      color: colors.text,
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: dotSize,
        height: dotSize,
        borderRadius: '50%',
        background: colors.dot,
        flexShrink: 0,
        boxShadow: `0 0 6px ${colors.dot}80`,
      }} />
      {label}
    </span>
  );
}
