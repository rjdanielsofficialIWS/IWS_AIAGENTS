import { useEffect, useState, useCallback } from 'react';


const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const GOLD    = '#C9A84C';
const GOLD_D  = '#a07830';
const SURFACE = 'rgba(18,18,18,0.98)';
const BORDER  = 'rgba(255,255,255,0.07)';
const CARD    = 'rgba(255,255,255,0.03)';

type AdminUser = {
  id: string; email: string; createdAt: string; lastSignIn: string;
  plan: string; status: string; trialEnd: string | null;
  trialExpired: boolean; isPromo: boolean; stripeId: string | null; mrr: number;
};

type Stats = {
  totalUsers: number; activeUsers: number; trialingUsers: number;
  expiredTrials: number; newSignups7d: number; newSignups30d: number;
  connectedUsers: number; mrr: number; arr: number;
  planBreakdown: Record<string,number>;
  posts: { total:number; published:number; scheduled:number; failed:number; last30Days:number };
  usage: { aiCallsThisMonth:number; postsScheduledThisMonth:number };
  signupsByDay: Record<string,number>;
};

const PLAN_COLOR: Record<string,string> = {
  agency: '#a78bfa', viral: GOLD, starter: '#38bdf8', free: 'rgba(255,255,255,0.2)',
};
const STATUS_COLOR: Record<string,string> = {
  active: '#86efac', trialing: GOLD, none: 'rgba(255,255,255,0.2)',
};

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtMoney(n: number) {
  return '$' + fmt(n);
}
function timeAgo(iso: string | null) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  return d + 'd ago';
}
function fmtDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatCard({ label, value, sub, color }: { label:string; value:string|number; sub?:string; color?:string }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1 border" style={{ background: CARD, borderColor: BORDER }}>
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
      <div className="text-3xl font-black" style={{ color: color ?? 'white' }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ data }: { data: Record<string,number> }) {
  const vals  = Object.values(data);
  const max   = Math.max(...vals, 1);
  const days  = Object.keys(data).slice(-14);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {days.map(d => (
        <div key={d} className="flex-1 rounded-sm transition-all" title={d + ': ' + data[d]}
          style={{ height: Math.max(2, (data[d] / max) * 40) + 'px', background: data[d] > 0 ? GOLD : 'rgba(255,255,255,0.07)' }} />
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string|null>(null);
  const [stats, setStats]       = useState<Stats|null>(null);
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [search, setSearch]     = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Passcode gate
  const STORAGE_KEY = 'admin_passcode_verified';
  const [passcode, setPasscode]       = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [verified, setVerified]       = useState(() => sessionStorage.getItem(STORAGE_KEY) === 'true');
  const [savedCode, setSavedCode]     = useState('IWS');
  const [loadingCode, setLoadingCode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [newCode, setNewCode]         = useState('');
  const [newCodeConfirm, setNewCodeConfirm] = useState('');
  const [savingCode, setSavingCode]   = useState(false);
  const [saveMsg, setSaveMsg]         = useState('');

  // Load saved passcode from Supabase user metadata
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const code = user?.user_metadata?.admin_passcode;
        if (code) setSavedCode(code);
      } catch {}
      finally { setLoadingCode(false); }
    })();
  }, []);

  const handlePasscode = () => {
    if (passcode.trim().toUpperCase() === savedCode.toUpperCase()) {
      sessionStorage.setItem(STORAGE_KEY, 'true');
      setVerified(true);
      setPasscodeError('');
    } else {
      setPasscodeError('Incorrect passcode. Try again.');
      setPasscode('');
    }
  };

  const handleSaveCode = async () => {
    if (!newCode.trim()) { setSaveMsg('Passcode cannot be empty.'); return; }
    if (newCode !== newCodeConfirm) { setSaveMsg('Passcodes do not match.'); return; }
    setSavingCode(true); setSaveMsg('');
    try {
      await supabase.auth.updateUser({ data: { admin_passcode: newCode.trim() } });
      setSavedCode(newCode.trim());
      setNewCode(''); setNewCodeConfirm('');
      setSaveMsg('Passcode updated.');
      setTimeout(() => { setSaveMsg(''); setShowSettings(false); }, 1500);
    } catch { setSaveMsg('Failed to save. Try again.'); }
    finally { setSavingCode(false); }
  };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) { const r = await supabase.auth.refreshSession(); session = r.data.session; }
      if (!session) { setError('Not authenticated'); setLoading(false); return; }
      const res  = await fetch(SUPABASE_URL + '/functions/v1/admin-dashboard', {
        headers: { Authorization: 'Bearer ' + session.access_token },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to load'); setLoading(false); return; }
      setStats(data.stats);
      setUsers(data.users);
      setLastRefresh(new Date());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase());
    const matchPlan   = planFilter === 'all' || u.plan === planFilter;
    return matchSearch && matchPlan;
  });

  // Passcode gate
  if (!verified && !loadingCode) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="rounded-2xl border p-8 space-y-6" style={{ background: 'rgba(18,18,18,0.98)', borderColor: BORDER }}>
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black mx-auto mb-4"
              style={{ background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000' }}>A</div>
            <div className="text-lg font-black text-white">Admin Access</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Enter your passcode to continue</div>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={passcode}
              onChange={e => { setPasscode(e.target.value); setPasscodeError(''); }}
              onKeyDown={e => e.key === 'Enter' && handlePasscode()}
              placeholder="Passcode"
              autoFocus
              className="w-full rounded-xl border bg-black/40 px-4 py-3 text-sm text-white outline-none text-center tracking-[0.3em] placeholder:tracking-normal placeholder:text-white/20"
              style={{ borderColor: passcodeError ? 'rgba(248,113,113,0.5)' : BORDER, colorScheme: 'dark' }}
            />
            {passcodeError && (
              <div className="text-xs text-center" style={{ color: '#f87171' }}>{passcodeError}</div>
            )}
            <button onClick={handlePasscode}
              className="w-full py-3 rounded-xl text-sm font-black transition hover:brightness-110"
              style={{ background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000' }}>
              Enter
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading && !stats) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
        <div className="text-sm text-white/40">Loading dashboard...</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <div className="text-center space-y-3">
        <div className="text-4xl">⛔</div>
        <div className="text-white font-bold">{error}</div>
        <button onClick={load} className="text-sm px-4 py-2 rounded-xl border" style={{ borderColor: BORDER, color: GOLD }}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a', color: 'white' }}>
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-xl"
        style={{ borderColor: BORDER, background: 'rgba(10,10,10,0.9)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black"
            style={{ background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000' }}>A</div>
          <div>
            <div className="text-sm font-black text-white">Admin Dashboard</div>
            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Infinite Wealth Solutions AI - Last updated {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} disabled={loading}
            className="text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition hover:bg-white/5 disabled:opacity-40"
            style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.5)' }}>
            <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button onClick={() => setShowSettings(true)}
            className="text-xs px-3 py-1.5 rounded-xl border transition hover:bg-white/5"
            style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.5)' }}>
            Passcode Settings
          </button>
          <a href="/" className="text-xs px-3 py-1.5 rounded-xl border transition hover:bg-white/5"
            style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.5)' }}>Back to App</a>

          {/* Passcode Settings Modal */}
          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
              <div className="relative w-full max-w-sm rounded-2xl border p-6 space-y-4"
                style={{ background: 'rgba(18,18,18,0.98)', borderColor: BORDER }}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-white">Change Passcode</div>
                  <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white transition text-lg leading-none">x</button>
                </div>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={newCode}
                    onChange={e => { setNewCode(e.target.value); setSaveMsg(''); }}
                    placeholder="New passcode"
                    className="w-full rounded-xl border bg-black/40 px-4 py-2.5 text-sm text-white outline-none"
                    style={{ borderColor: BORDER, colorScheme: 'dark' }}
                  />
                  <input
                    type="password"
                    value={newCodeConfirm}
                    onChange={e => { setNewCodeConfirm(e.target.value); setSaveMsg(''); }}
                    placeholder="Confirm new passcode"
                    className="w-full rounded-xl border bg-black/40 px-4 py-2.5 text-sm text-white outline-none"
                    style={{ borderColor: BORDER, colorScheme: 'dark' }}
                  />
                  {saveMsg && (
                    <div className="text-xs" style={{ color: saveMsg.includes('updated') ? '#86efac' : '#f87171' }}>{saveMsg}</div>
                  )}
                  <button onClick={handleSaveCode} disabled={savingCode}
                    className="w-full py-2.5 rounded-xl text-sm font-black transition hover:brightness-110 disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${GOLD_D}, ${GOLD})`, color: '#000' }}>
                    {savingCode ? 'Saving...' : 'Save Passcode'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Revenue + Growth */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Revenue</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="MRR" value={fmtMoney(stats?.mrr ?? 0)} sub="Monthly recurring" color={GOLD} />
            <StatCard label="ARR" value={fmtMoney(stats?.arr ?? 0)} sub="Annualized" color={GOLD} />
            <StatCard label="Paying Users" value={stats?.activeUsers ?? 0} sub="Active subscriptions" color="#86efac" />
            <StatCard label="Trialing" value={stats?.trialingUsers ?? 0} sub={stats?.expiredTrials ? stats.expiredTrials + ' expired' : 'All active'} color={GOLD} />
          </div>
        </div>

        {/* Plan Breakdown */}
        <div className="rounded-2xl border p-5" style={{ background: CARD, borderColor: BORDER }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Plan Breakdown</div>
          <div className="grid grid-cols-4 gap-4">
            {(['agency','viral','starter','free'] as const).map(plan => (
              <div key={plan} className="text-center">
                <div className="text-2xl font-black" style={{ color: PLAN_COLOR[plan] }}>
                  {stats?.planBreakdown[plan] ?? 0}
                </div>
                <div className="text-xs capitalize mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{plan}</div>
                {plan !== 'free' && (
                  <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {fmtMoney((stats?.planBreakdown[plan] ?? 0) * ({ agency: 297, viral: 97, starter: 29 }[plan] ?? 0))}/mo
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Growth + Engagement */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Growth and Engagement</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats?.totalUsers ?? 0} sub="All time" />
            <StatCard label="New (7d)" value={stats?.newSignups7d ?? 0} sub="Last 7 days" color="#38bdf8" />
            <StatCard label="New (30d)" value={stats?.newSignups30d ?? 0} sub="Last 30 days" color="#38bdf8" />
            <StatCard label="Connected" value={stats?.connectedUsers ?? 0} sub="Social accounts linked" color="#86efac" />
          </div>
        </div>

        {/* Signups Chart */}
        {stats?.signupsByDay && (
          <div className="rounded-2xl border p-5" style={{ background: CARD, borderColor: BORDER }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Signups - Last 14 Days
              </div>
              <div className="text-xs" style={{ color: GOLD }}>
                {Object.values(stats.signupsByDay).reduce((a,b) => a+b, 0)} total
              </div>
            </div>
            <MiniBar data={stats.signupsByDay} />
          </div>
        )}

        {/* Platform Activity */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Platform Activity</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Posts" value={fmt(stats?.posts.total ?? 0)} sub="All time" />
            <StatCard label="Published" value={fmt(stats?.posts.published ?? 0)} sub="Live" color="#86efac" />
            <StatCard label="Scheduled" value={fmt(stats?.posts.scheduled ?? 0)} sub="Queued" color={GOLD} />
            <StatCard label="Failed" value={fmt(stats?.posts.failed ?? 0)} sub="Errors" color="#f87171" />
          </div>
        </div>

        {/* AI Usage */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>AI Usage This Month</div>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="AI Caption Generations" value={fmt(stats?.usage.aiCallsThisMonth ?? 0)} sub="Claude API calls" color="#a78bfa" />
            <StatCard label="Posts Scheduled" value={fmt(stats?.usage.postsScheduledThisMonth ?? 0)} sub="Via platform this month" color="#38bdf8" />
          </div>
        </div>

        {/* User Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
              All Users ({filtered.length})
            </div>
            <div className="flex items-center gap-2">
              <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
                className="text-xs rounded-xl border bg-black/40 px-3 py-1.5 outline-none"
                style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.6)', colorScheme: 'dark' }}>
                <option value="all">All Plans</option>
                <option value="agency">Agency</option>
                <option value="viral">Viral</option>
                <option value="starter">Starter</option>
                <option value="free">Free</option>
              </select>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search email..."
                className="text-xs rounded-xl border bg-black/40 px-3 py-1.5 outline-none w-48"
                style={{ borderColor: BORDER, color: 'white', colorScheme: 'dark' }} />
            </div>
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid ' + BORDER }}>
                    {['Email','Plan','Status','MRR','Joined','Last Seen','Trial Ends'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-bold uppercase tracking-wider"
                        style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <tr key={u.id}
                      style={{ borderBottom: i < filtered.length-1 ? '1px solid ' + BORDER : 'none' }}
                      className="hover:bg-white/[0.02] transition">
                      <td className="px-4 py-3 font-medium text-white/80">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-lg font-bold capitalize"
                          style={{ background: (PLAN_COLOR[u.plan] ?? 'rgba(255,255,255,0.1)') + '20', color: PLAN_COLOR[u.plan] ?? 'rgba(255,255,255,0.4)' }}>
                          {u.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-lg font-bold capitalize"
                          style={{ background: (STATUS_COLOR[u.status] ?? 'rgba(255,255,255,0.1)') + '20', color: STATUS_COLOR[u.status] ?? 'rgba(255,255,255,0.4)' }}>
                          {u.trialExpired && u.status === 'trialing' ? 'Expired' : u.status || 'None'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold" style={{ color: u.mrr > 0 ? GOLD : 'rgba(255,255,255,0.2)' }}>
                        {u.mrr > 0 ? fmtMoney(u.mrr) : '-'}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{fmtDate(u.createdAt)}</td>
                      <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{timeAgo(u.lastSignIn)}</td>
                      <td className="px-4 py-3" style={{ color: u.trialExpired ? '#f87171' : 'rgba(255,255,255,0.4)' }}>
                        {u.trialEnd ? fmtDate(u.trialEnd) : '-'}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
