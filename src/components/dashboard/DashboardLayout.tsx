import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Phone, MessageSquare, Users, CreditCard,
  Key, Settings, LogOut, Code, Layout, ChevronRight,
  Zap, Bell,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const GOLD   = '#D6B25E';
const GOLD_L = '#F0D27C';
const GOLD_D = '#8F6B1E';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const humanizePageTitle = (page: string): string => {
  const titles: Record<string, string> = {
    dashboard:       'Dashboard',
    assistants:      'AI Assistants',
    'demo-pages':    'Demo Pages',
    widgets:         'Widget Manager',
    'phone-numbers': 'Phone Numbers',
    calls:           'Call History',
    team:            'Team',
    billing:         'Billing',
    'api-keys':      'API Keys',
    settings:        'Settings',
  };
  return titles[page] ?? page.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export function DashboardLayout({ children, currentPage, onPageChange }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard',     label: 'Dashboard',      icon: Brain,         section: 'main' },
    { id: 'assistants',    label: 'Assistants',      icon: Brain,         section: 'main' },
    { id: 'demo-pages',    label: 'Demo Pages',      icon: Layout,        section: 'main' },
    { id: 'widgets',       label: 'Widget Manager',  icon: Code,          section: 'main' },
    { id: 'phone-numbers', label: 'Phone Numbers',   icon: Phone,         section: 'tools' },
    { id: 'calls',         label: 'Calls',           icon: MessageSquare, section: 'tools' },
    { id: 'team',          label: 'Team',            icon: Users,         section: 'tools' },
    { id: 'billing',       label: 'Billing',         icon: CreditCard,    section: 'account' },
    { id: 'api-keys',      label: 'API Keys',        icon: Key,           section: 'account' },
    { id: 'settings',      label: 'Settings',        icon: Settings,      section: 'account' },
  ];

  const sections = [
    { id: 'main',    label: 'Workspace' },
    { id: 'tools',   label: 'Tools' },
    { id: 'account', label: 'Account' },
  ];

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'IW';
  const emailDisplay = user?.email ?? '';

  return (
    <>
      <style>{`
        @keyframes dashFade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes dashShimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .dash-logo-text {
          background: linear-gradient(90deg, ${GOLD_D} 0%, ${GOLD} 40%, ${GOLD_L} 55%, ${GOLD} 70%, ${GOLD_D} 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: dashShimmer 4s linear infinite;
        }
        .dash-nav-item {
          width: 100%; display: flex; align-items: center; gap: 11px;
          padding: 10px 12px; border-radius: 10px; cursor: pointer;
          font-size: 13px; font-weight: 500; transition: all 0.15s;
          border: 1px solid transparent; text-align: left; position: relative;
          background: transparent; color: rgba(255,255,255,0.45);
        }
        .dash-nav-item:hover {
          background: rgba(255,255,255,0.05) !important;
          color: rgba(255,255,255,0.8) !important;
          border-color: rgba(255,255,255,0.06) !important;
        }
        .dash-nav-item.active {
          background: linear-gradient(135deg, ${GOLD}14, ${GOLD}08) !important;
          border-color: ${GOLD}35 !important;
          color: ${GOLD_L} !important;
          box-shadow: inset 3px 0 0 ${GOLD} !important;
        }
        .dash-section-label {
          display: flex; align-items: center; gap: 8px;
          font-size: 9px; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; color: rgba(255,255,255,0.18);
          padding: 0 8px;
        }
        .dash-section-label::before {
          content: ''; width: 14px; height: 1px;
          background: rgba(255,255,255,0.12); flex-shrink: 0;
        }
        .dash-topbar-btn {
          width: 34px; height: 34px; border-radius: 10px; border: none; cursor: pointer;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .dash-topbar-btn:hover { background: rgba(255,255,255,0.08) !important; color: rgba(255,255,255,0.7) !important; }
        .dash-content { animation: dashFade 0.35s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0f1623', display: 'flex', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* Sidebar */}
        <motion.aside
          animate={{ width: collapsed ? 68 : 232 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{
            minHeight: '100vh',
            background: 'rgba(10,18,38,0.98)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column',
            padding: '20px 12px',
            position: 'fixed', top: 0, left: 0, bottom: 0,
            zIndex: 100,
            backdropFilter: 'blur(20px)',
          }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, paddingLeft: 4 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}35 0%, transparent 70%)`, filter: 'blur(6px)' }} />
              <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD}, ${GOLD_L})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 18px ${GOLD}40` }}>
                <Zap size={17} color="#000" strokeWidth={2.5} />
              </div>
            </div>
            {!collapsed && (
              <div>
                <div className="dash-logo-text" style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em' }}>IWS AI</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>Dashboard</div>
              </div>
            )}
            <div style={{ flex: 1 }} />
            {!collapsed && (
              <button onClick={() => setCollapsed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 4, borderRadius: 6, display: 'flex', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
                <ChevronRight size={14} />
              </button>
            )}
            {collapsed && (
              <button onClick={() => setCollapsed(false)} style={{ position: 'absolute', top: 22, right: -14, background: 'rgba(20,20,20,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: '5px 3px', display: 'flex', zIndex: 10, transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                <ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} />
              </button>
            )}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {sections.map(sec => {
              const items = menuItems.filter(i => i.section === sec.id);
              return (
                <div key={sec.id} style={{ marginBottom: 20 }}>
                  {!collapsed && (
                    <div className="dash-section-label" style={{ marginBottom: 6 }}>
                      {sec.label}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {items.map(item => {
                      const Icon = item.icon;
                      const isActive = currentPage === item.id;
                      return (
                        <motion.button
                          key={item.id}
                          className={`dash-nav-item${isActive ? ' active' : ''}`}
                          onClick={() => onPageChange(item.id)}
                          title={collapsed ? item.label : undefined}
                          style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '10px' : '10px 12px' }}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <Icon size={16} style={{ flexShrink: 0 }} />
                          {!collapsed && <span>{item.label}</span>}
                          {!collapsed && isActive && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* User section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}
          >
            {!collapsed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#000', flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emailDisplay}</div>
                  <div style={{ fontSize: 9, color: GOLD, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>Premium</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#000' }}>
                  {initials}
                </div>
              </div>
            )}
            <button
              onClick={signOut}
              className="dash-nav-item"
              style={{ color: 'rgba(239,68,68,0.6)', justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '10px' : '10px 12px' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(239,68,68,0.6)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <LogOut size={15} style={{ flexShrink: 0 }} />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </motion.div>
        </motion.aside>

        {/* Main */}
        <motion.main
          animate={{ marginLeft: collapsed ? 68 : 232 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{
            flex: 1,
            minHeight: '100vh',
            padding: '0 40px 48px',
            position: 'relative', zIndex: 1,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        >
          {/* Sticky topbar */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 0 14px',
            marginBottom: 24,
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'linear-gradient(to bottom, #0f1623 65%, rgba(15,22,35,0.75) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'white', letterSpacing: '-0.035em', margin: 0, lineHeight: 1.2 }}>
                {humanizePageTitle(currentPage)}
              </h1>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 3, fontWeight: 500 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="dash-topbar-btn" title="Notifications">
                <Bell size={14} />
              </button>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: '#000',
                boxShadow: `0 2px 10px ${GOLD}30`, cursor: 'pointer',
              }}>
                {initials}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="dash-content"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </motion.main>
      </div>
    </>
  );
}
