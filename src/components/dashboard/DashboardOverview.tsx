import React from 'react';
import { Brain, Phone, MessageSquare, TrendingUp, Plus, Zap, Code, ArrowRight } from 'lucide-react';

const GOLD   = '#D6B25E';
const GOLD_L = '#F0D27C';
const GOLD_D = '#8F6B1E';

interface Props {
  onNavigate?: (page: string) => void;
}

export function DashboardOverview({ onNavigate }: Props) {
  const stats = [
    {
      label: 'Active Assistants',
      value: 0,
      icon: Brain,
      color: GOLD,
      glow: `${GOLD}22`,
      cta: { label: 'Create one', page: 'assistants' },
    },
    {
      label: 'Phone Numbers',
      value: 0,
      icon: Phone,
      color: '#60a5fa',
      glow: 'rgba(96,165,250,0.18)',
      cta: { label: 'Add number', page: 'phone-numbers' },
    },
    {
      label: 'Total Calls',
      value: 0,
      icon: MessageSquare,
      color: '#34d399',
      glow: 'rgba(52,211,153,0.16)',
      cta: null,
    },
    {
      label: 'Minutes Used',
      value: 0,
      icon: TrendingUp,
      color: '#a78bfa',
      glow: 'rgba(167,139,250,0.16)',
      cta: null,
    },
  ];

  const quickStart = [
    {
      icon: Brain,
      title: 'Create an Assistant',
      desc: 'Build your first AI voice agent and give it a personality, voice, and knowledge base.',
      page: 'assistants',
      color: GOLD,
      border: `${GOLD}30`,
      glow: `${GOLD}18`,
    },
    {
      icon: Phone,
      title: 'Add a Phone Number',
      desc: 'Connect a real phone number so your AI can receive inbound calls from customers.',
      page: 'phone-numbers',
      color: '#60a5fa',
      border: 'rgba(96,165,250,0.25)',
      glow: 'rgba(96,165,250,0.12)',
    },
    {
      icon: Code,
      title: 'Embed a Widget',
      desc: 'Drop your AI assistant onto any website with a single line of code.',
      page: 'widgets',
      color: '#a78bfa',
      border: 'rgba(167,139,250,0.25)',
      glow: 'rgba(167,139,250,0.12)',
    },
  ];

  return (
    <>
      <style>{`
        @keyframes ovIconPulse { 0%,100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.08); } }
        .ov-stat { transition: transform 0.2s, box-shadow 0.2s; }
        .ov-stat:hover { transform: translateY(-3px); box-shadow: 0 24px 60px rgba(0,0,0,0.55) !important; }
        .ov-qs { cursor: pointer; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
        .ov-qs:hover { transform: translateY(-3px); }
        .ov-cta {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 700; padding: 5px 10px;
          border-radius: 7px; cursor: pointer; transition: all 0.15s;
        }
      `}</style>

      {/* Welcome header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.04em', color: 'white', lineHeight: 1.2, marginBottom: 8 }}>
          Welcome to{' '}
          <span style={{
            background: `linear-gradient(90deg, ${GOLD_D} 0%, ${GOLD} 40%, ${GOLD_L} 60%, ${GOLD} 80%, ${GOLD_D} 100%)`,
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>
            IWS AI
          </span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
          Your AI voice agent platform. Build, deploy, and scale in minutes.
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="ov-stat"
              style={{
                background: 'linear-gradient(160deg, rgba(18,18,18,0.95) 0%, rgba(11,11,11,0.95) 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                padding: '20px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ position: 'relative', display: 'inline-flex', marginBottom: 16 }}>
                <div style={{
                  position: 'absolute', inset: -5, borderRadius: '50%',
                  background: s.glow, filter: 'blur(10px)',
                  animation: 'ovIconPulse 4s ease-in-out infinite',
                }} />
                <div style={{
                  position: 'relative', width: 38, height: 38, borderRadius: 10,
                  background: s.glow, border: `1px solid ${s.color}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={17} style={{ color: s.color }} />
                </div>
              </div>
              <div style={{ fontSize: 34, fontWeight: 900, color: 'white', letterSpacing: '-0.06em', lineHeight: 1, marginBottom: 4 }}>
                {s.value.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: s.cta ? 14 : 0 }}>
                {s.label}
              </div>
              {s.cta && (
                <button
                  className="ov-cta"
                  onClick={() => onNavigate?.(s.cta!.page)}
                  style={{
                    background: `${s.color}14`, color: s.color,
                    border: `1px solid ${s.color}28`,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${s.color}28`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${s.color}14`; }}
                >
                  <Plus size={10} />
                  {s.cta.label}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick start */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.02em' }}>
            Quick Start
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: GOLD, padding: '3px 8px', borderRadius: 6,
            background: `${GOLD}10`, border: `1px solid ${GOLD}25`,
          }}>
            <Zap size={9} />
            Get started
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {quickStart.map(qs => {
            const Icon = qs.icon;
            return (
              <div
                key={qs.title}
                className="ov-qs"
                onClick={() => onNavigate?.(qs.page)}
                style={{
                  background: 'rgba(13,13,13,0.9)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '18px',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = qs.border;
                  el.style.boxShadow = `0 12px 40px ${qs.glow}`;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'rgba(255,255,255,0.07)';
                  el.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: qs.glow, border: `1px solid ${qs.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={16} style={{ color: qs.color }} />
                  </div>
                  <ArrowRight size={13} style={{ color: 'rgba(255,255,255,0.18)', marginTop: 2, flexShrink: 0 }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.015em' }}>
                  {qs.title}
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.32)', lineHeight: 1.55 }}>
                  {qs.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity feed */}
      <div style={{
        background: 'linear-gradient(160deg, rgba(16,16,16,0.9) 0%, rgba(10,10,10,0.9) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '-0.01em' }}>
            Recent Activity
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', fontWeight: 600, letterSpacing: '0.04em' }}>
            Last 7 days
          </div>
        </div>
        <div style={{ padding: '44px 20px', textAlign: 'center' }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <MessageSquare size={18} style={{ color: 'rgba(255,255,255,0.18)' }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.22)', marginBottom: 5 }}>
            No activity yet
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.14)', lineHeight: 1.7 }}>
            Create an assistant and make your first call<br />to see your activity here.
          </div>
        </div>
      </div>
    </>
  );
}
