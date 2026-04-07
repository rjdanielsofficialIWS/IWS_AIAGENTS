import React from 'react';
import { Copy, CheckCircle2, Users } from 'lucide-react';
import type { DirectMember } from '../../hooks/useNetworkStats';

const GOLD   = '#D6B25E';
const GOLD_L = '#F0D27C';
const GOLD_D = '#8F6B1E';

const PLAN_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  starter: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)' },
  viral:   { color: GOLD_L,   bg: `${GOLD}18`,              border: `${GOLD}40` },
  agency:  { color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.25)' },
};

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(0)}/mo`;
}

interface DirectTeamProps {
  members: DirectMember[];
  personalRefCount: number;
  personalMrrCents: number;
  referralLink: string;
}

export function DirectTeam({ members, personalRefCount, personalMrrCents, referralLink }: DirectTeamProps) {
  const [copied, setCopied] = React.useState(false);

  const activeCount = members.filter(m => m.is_active).length;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (members.length === 0) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, textAlign: 'center' }}>
        <Users className="w-10 h-10 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
        <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
          No direct enrollments yet
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginBottom: 20 }}>
          Share your referral link to start building your team and earning commissions.
        </p>
        <div style={{ display: 'flex', gap: 8, maxWidth: 440, margin: '0 auto' }}>
          <div style={{
            flex: 1, borderRadius: 9, padding: '10px 12px', fontSize: 12, fontFamily: 'monospace',
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {referralLink || 'Generating…'}
          </div>
          <button onClick={copyLink} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: 9, fontSize: 12, fontWeight: 700,
            background: copied ? 'rgba(74,222,128,0.15)' : `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`,
            color: copied ? 'rgb(74,222,128)' : '#000',
            border: copied ? '1px solid rgba(74,222,128,0.3)' : 'none',
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Summary strip */}
      <div style={{
        display: 'flex', gap: 0,
        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {[
          { label: 'Total Direct', value: personalRefCount },
          { label: 'Active',       value: activeCount },
          { label: 'Personal MRR', value: `$${(personalMrrCents / 100).toFixed(0)}/mo` },
        ].map((s, i) => (
          <div key={s.label} style={{
            flex: 1, padding: '12px 16px', textAlign: 'center',
            borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{s.value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Member list */}
      <div>
        {members.map((member, i) => {
          const plan = member.plan?.toLowerCase() ?? 'starter';
          const planColors = PLAN_COLORS[plan] ?? PLAN_COLORS.starter;
          return (
            <div key={member.supabase_user_id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              {/* Active dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: member.is_active ? '#4ade80' : '#ef4444',
                boxShadow: member.is_active ? '0 0 6px rgba(74,222,128,0.5)' : 'none',
              }} />

              {/* Plan badge */}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                background: planColors.bg, color: planColors.color, border: `1px solid ${planColors.border}`,
                textTransform: 'capitalize', letterSpacing: '0.04em', flexShrink: 0,
              }}>
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </span>

              {/* MRR */}
              <span style={{ fontSize: 13, fontWeight: 700, color: member.is_active ? '#fff' : 'rgba(255,255,255,0.3)', flex: 1 }}>
                {member.is_active ? fmt(member.plan_mrr_cents) : <span style={{ color: '#fca5a5', fontSize: 11, fontWeight: 700 }}>Churned</span>}
              </span>

              {/* Enrolled date */}
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                Enrolled {new Date(member.enrolled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
