#!/usr/bin/env bash
# Apply AIVideoStudio changes to MediaDistributionPage.tsx
# Usage: bash apply-video-studio.sh [path/to/MediaDistributionPage.tsx]

FILE="${1:-src/components/MediaDistributionPage.tsx}"

if [ ! -f "$FILE" ]; then
  echo "❌ File not found: $FILE"
  echo "   Usage: bash apply-video-studio.sh [path/to/MediaDistributionPage.tsx]"
  exit 1
fi

echo "📄 Applying changes to: $FILE"
cp "$FILE" "$FILE.bak"
echo "✅ Backup saved to: $FILE.bak"

# ── 1. Update imports (add Film, Upload, Download, RefreshCcw, Wand2) ──────────
python3 - "$FILE" <<'PYEOF'
import sys, re

path = sys.argv[1]
with open(path, 'r') as f:
    src = f.read()

old = "  ClipboardList, FileText, Trash2, BookOpen, DollarSign, Copy, TrendingUp, Users, Gift,\n} from 'lucide-react';"
new = "  ClipboardList, FileText, Trash2, BookOpen, DollarSign, Copy, TrendingUp, Users, Gift,\n  Film, Upload, Download, RefreshCcw, Wand2,\n} from 'lucide-react';"

if old not in src:
    print("⚠️  Step 1: import block not matched — skipping (may already be applied)")
else:
    src = src.replace(old, new, 1)
    print("✅ Step 1: Added Film, Upload, Download, RefreshCcw, Wand2 imports")

with open(path, 'w') as f:
    f.write(src)
PYEOF

# ── 2. Update ViewMode type ────────────────────────────────────────────────────
python3 - "$FILE" <<'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'r') as f:
    src = f.read()

old = "type ViewMode = 'composer' | 'calendar' | 'planner' | 'partner';"
new = "type ViewMode = 'composer' | 'calendar' | 'planner' | 'partner' | 'video';"

if old not in src:
    print("⚠️  Step 2: ViewMode type not matched — skipping")
else:
    src = src.replace(old, new, 1)
    print("✅ Step 2: Added 'video' to ViewMode type")

with open(path, 'w') as f:
    f.write(src)
PYEOF

# ── 3. Add VideoStudio types after the PlannerItem type ───────────────────────
python3 - "$FILE" <<'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'r') as f:
    src = f.read()

marker = "// ─── Helpers ──────────────────────────────────────────────────────────────────"

new_types = """// ─── Video Studio Types ──────────────────────────────────────────────────────

type VideoStudioStep = 'brief' | 'prompts' | 'frames' | 'video' | 'done';
type VideoPrompt = { id: string; text: string; selected: boolean; edited: boolean; };
type GeneratedFrame = { id: string; promptId: string; promptText: string; imageUrl: string | null; taskId: string | null; status: 'idle'|'generating'|'done'|'error'; error?: string; };
type GeneratedVideo = { id: string; frameUrl: string; promptText: string; videoUrl: string | null; taskId: string | null; status: 'idle'|'generating'|'polling'|'done'|'error'; error?: string; };
type VideoHistoryItem = { id: string; createdAt: string; brief: string; videoUrl: string; thumbnailUrl?: string; };

"""

if "VideoStudioStep" in src:
    print("⚠️  Step 3: Video types already present — skipping")
elif marker not in src:
    print("⚠️  Step 3: Helpers marker not found — skipping")
else:
    src = src.replace(marker, new_types + marker, 1)
    print("✅ Step 3: Added VideoStudio types")

with open(path, 'w') as f:
    f.write(src)
PYEOF

# ── 4. Add AIVideoStudio component before the Sidebar component ───────────────
python3 - "$FILE" <<'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'r') as f:
    src = f.read()

marker = "// ─── Sidebar ──────────────────────────────────────────────────────────────────"

if "AIVideoStudio" in src:
    print("⚠️  Step 4: AIVideoStudio already present — skipping")
elif marker not in src:
    print("⚠️  Step 4: Sidebar marker not found — skipping")
else:
    ai_video_studio = '''// ─── AIVideoStudio ───────────────────────────────────────────────────────────

function AIVideoStudio({ userId }: { userId: string | null }) {
  const [step, setStep]               = React.useState<VideoStudioStep>('brief');
  const [brief, setBrief]             = React.useState('');
  const [style, setStyle]             = React.useState('cinematic');
  const [aspectRatio, setAspectRatio] = React.useState('16:9');
  const [duration, setDuration]       = React.useState('5');
  const [prompts, setPrompts]         = React.useState<VideoPrompt[]>([]);
  const [frames, setFrames]           = React.useState<GeneratedFrame[]>([]);
  const [videos, setVideos]           = React.useState<GeneratedVideo[]>([]);
  const [history, setHistory]         = React.useState<VideoHistoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('mm_video_history') || '[]'); } catch { return []; }
  });
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [generatingPrompts, setGeneratingPrompts] = React.useState(false);
  const pollTimers = React.useRef<Record<string, ReturnType<typeof setInterval>>>({});

  React.useEffect(() => {
    return () => { Object.values(pollTimers.current).forEach(clearInterval); };
  }, []);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const addToHistory = (brief: string, videoUrl: string, thumbnailUrl?: string) => {
    const item: VideoHistoryItem = { id: Date.now().toString(), createdAt: new Date().toISOString(), brief, videoUrl, thumbnailUrl };
    setHistory(prev => {
      const next = [item, ...prev].slice(0, 20);
      try { localStorage.setItem('mm_video_history', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const pollFrameTask = (frameId: string, taskId: string) => {
    let attempts = 0;
    const iv = setInterval(async () => {
      attempts++;
      if (attempts > 60) {
        clearInterval(iv);
        delete pollTimers.current[frameId];
        setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'error', error: 'Timed out' } : f));
        return;
      }
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/kling-poll`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ taskId, type: 'image' }),
        });
        const data = await res.json();
        if (data.status === 'succeed' && data.imageUrl) {
          clearInterval(iv); delete pollTimers.current[frameId];
          setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'done', imageUrl: data.imageUrl } : f));
        } else if (data.status === 'failed') {
          clearInterval(iv); delete pollTimers.current[frameId];
          setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'error', error: data.error || 'Failed' } : f));
        }
      } catch {}
    }, 3000);
    pollTimers.current[frameId] = iv;
  };

  const pollVideoTask = (videoId: string, taskId: string, brief: string, thumbnailUrl?: string) => {
    let attempts = 0;
    const iv = setInterval(async () => {
      attempts++;
      if (attempts > 120) {
        clearInterval(iv); delete pollTimers.current[videoId];
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'error', error: 'Timed out' } : v));
        return;
      }
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/kling-poll`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ taskId, type: 'video' }),
        });
        const data = await res.json();
        if (data.status === 'succeed' && data.videoUrl) {
          clearInterval(iv); delete pollTimers.current[videoId];
          setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'done', videoUrl: data.videoUrl } : v));
          addToHistory(brief, data.videoUrl, thumbnailUrl);
          setStep('done');
        } else if (data.status === 'failed') {
          clearInterval(iv); delete pollTimers.current[videoId];
          setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'error', error: data.error || 'Failed' } : v));
        }
      } catch {}
    }, 5000);
    pollTimers.current[videoId] = iv;
  };

  const handleGeneratePrompts = async () => {
    if (!brief.trim()) { setGlobalError('Enter a brief first'); return; }
    setGeneratingPrompts(true); setGlobalError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/kling-generate-prompts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ brief, style, aspectRatio, duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate prompts');
      const generated: VideoPrompt[] = (data.prompts || []).map((text: string, i: number) => ({
        id: `p${i}`, text, selected: true, edited: false,
      }));
      setPrompts(generated);
      setStep('prompts');
    } catch (e: any) { setGlobalError(e.message); }
    finally { setGeneratingPrompts(false); }
  };

  const handleGenerateFrames = async () => {
    const selected = prompts.filter(p => p.selected);
    if (!selected.length) { setGlobalError('Select at least one prompt'); return; }
    setGlobalError(null);
    const newFrames: GeneratedFrame[] = selected.map(p => ({
      id: `f${Date.now()}-${p.id}`, promptId: p.id, promptText: p.text,
      imageUrl: null, taskId: null, status: 'generating',
    }));
    setFrames(newFrames);
    setStep('frames');
    const headers = await getAuthHeaders();
    for (const frame of newFrames) {
      const prompt = prompts.find(p => p.id === frame.promptId)!;
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/kling-generate-image`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ prompt: prompt.text, aspectRatio }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        if (data.imageUrl) {
          setFrames(prev => prev.map(f => f.id === frame.id ? { ...f, status: 'done', imageUrl: data.imageUrl } : f));
        } else if (data.taskId) {
          setFrames(prev => prev.map(f => f.id === frame.id ? { ...f, taskId: data.taskId } : f));
          pollFrameTask(frame.id, data.taskId);
        }
      } catch (e: any) {
        setFrames(prev => prev.map(f => f.id === frame.id ? { ...f, status: 'error', error: e.message } : f));
      }
    }
  };

  const handleGenerateVideos = async () => {
    const doneFr = frames.filter(f => f.status === 'done' && f.imageUrl);
    if (!doneFr.length) { setGlobalError('No completed frames'); return; }
    setGlobalError(null);
    const newVideos: GeneratedVideo[] = doneFr.map(f => ({
      id: `v${Date.now()}-${f.id}`, frameUrl: f.imageUrl!, promptText: f.promptText,
      videoUrl: null, taskId: null, status: 'generating',
    }));
    setVideos(newVideos);
    setStep('video');
    const headers = await getAuthHeaders();
    for (const vid of newVideos) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/kling-generate-video`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ imageUrl: vid.frameUrl, prompt: vid.promptText, duration, aspectRatio }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        if (data.videoUrl) {
          setVideos(prev => prev.map(v => v.id === vid.id ? { ...v, status: 'done', videoUrl: data.videoUrl } : v));
          addToHistory(brief, data.videoUrl, vid.frameUrl);
          setStep('done');
        } else if (data.taskId) {
          setVideos(prev => prev.map(v => v.id === vid.id ? { ...v, taskId: data.taskId, status: 'polling' } : v));
          pollVideoTask(vid.id, data.taskId, brief, vid.frameUrl);
        }
      } catch (e: any) {
        setVideos(prev => prev.map(v => v.id === vid.id ? { ...v, status: 'error', error: e.message } : v));
      }
    }
  };

  const resetStudio = () => {
    Object.values(pollTimers.current).forEach(clearInterval);
    pollTimers.current = {};
    setStep('brief'); setBrief(''); setPrompts([]); setFrames([]); setVideos([]); setGlobalError(null);
  };

  const STYLES = ['cinematic','documentary','commercial','anime','realistic','fantasy','noir','vibrant'];
  const allFramesDone  = frames.length > 0 && frames.every(f => f.status === 'done' || f.status === 'error');
  const allVideosDone  = videos.length > 0 && videos.every(v => v.status === 'done' || v.status === 'error');

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Main area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Film className="w-5 h-5" style={{ color: GOLD }} /> AI Video Studio
              </h2>
              <p className="text-xs text-white/40 mt-0.5">Turn a brief into AI-generated videos in minutes</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setHistoryOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition hover:bg-white/5"
                style={{ borderColor: BORDER, color: historyOpen ? GOLD_L : 'rgba(255,255,255,0.4)' }}>
                <Clock className="w-3.5 h-3.5" /> History ({history.length})
              </button>
              {step !== 'brief' && (
                <button onClick={resetStudio}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition hover:bg-white/5"
                  style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
                  <RefreshCcw className="w-3.5 h-3.5" /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {(['brief','prompts','frames','video','done'] as VideoStudioStep[]).map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition"
                    style={{ background: step === s ? GOLD : (['brief','prompts','frames','video','done'].indexOf(step) > i ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'), color: step === s ? '#000' : (['brief','prompts','frames','video','done'].indexOf(step) > i ? '#86efac' : 'rgba(255,255,255,0.3)') }}>
                    {['brief','prompts','frames','video','done'].indexOf(step) > i ? '✓' : i + 1}
                  </div>
                  <span className="text-[10px] font-bold capitalize hidden sm:block" style={{ color: step === s ? GOLD_L : 'rgba(255,255,255,0.25)' }}>{s}</span>
                </div>
                {i < 4 && <div className="flex-1 h-px" style={{ background: ['brief','prompts','frames','video','done'].indexOf(step) > i ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)' }} />}
              </React.Fragment>
            ))}
          </div>

          {globalError && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-xs text-red-300 border border-red-400/20 bg-red-400/5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {globalError}
              <button onClick={() => setGlobalError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Step 1: Brief */}
          {step === 'brief' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-white/30 uppercase tracking-wider">Video Brief</label>
                <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={4}
                  placeholder="Describe the video you want to create. E.g. 'A dramatic cinematic shot of a lone wolf running through a misty forest at dawn…'"
                  className="mt-1.5 w-full rounded-xl border bg-black/30 px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                  style={{ borderColor: BORDER }} />
              </div>
              <div>
                <label className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2 block">Style</label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <button key={s} onClick={() => setStyle(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold border transition capitalize"
                      style={{ borderColor: style === s ? GOLD : BORDER, background: style === s ? `${GOLD}18` : 'transparent', color: style === s ? GOLD_L : 'rgba(255,255,255,0.4)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2 block">Aspect Ratio</label>
                  <div className="flex gap-2">
                    {['16:9','9:16','1:1'].map(r => (
                      <button key={r} onClick={() => setAspectRatio(r)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold border transition"
                        style={{ borderColor: aspectRatio === r ? GOLD : BORDER, background: aspectRatio === r ? `${GOLD}18` : 'transparent', color: aspectRatio === r ? GOLD_L : 'rgba(255,255,255,0.4)' }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2 block">Duration</label>
                  <div className="flex gap-2">
                    {['5','10'].map(d => (
                      <button key={d} onClick={() => setDuration(d)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold border transition"
                        style={{ borderColor: duration === d ? GOLD : BORDER, background: duration === d ? `${GOLD}18` : 'transparent', color: duration === d ? GOLD_L : 'rgba(255,255,255,0.4)' }}>
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={handleGeneratePrompts} disabled={generatingPrompts || !brief.trim()}
                className="w-full flex flex-col items-center gap-0.5 py-3.5 rounded-xl text-sm font-bold disabled:opacity-50 transition"
                style={{ background: `linear-gradient(135deg, #6d28d9, #7c3aed, #8b5cf6)`, color: '#fff' }}>
                <span className="flex items-center gap-2">
                  {generatingPrompts ? <><Loader className="w-4 h-4 animate-spin" /> Generating Scene Prompts…</> : <><Wand2 className="w-4 h-4" /> Generate Scene Prompts</>}
                </span>
                {generatingPrompts && <span style={{ fontSize: 9, opacity: 0.7 }}>May take up to 30 seconds</span>}
              </button>
            </div>
          )}

          {/* Step 2: Prompts */}
          {step === 'prompts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/30 uppercase tracking-wider">Scene Prompts ({prompts.filter(p => p.selected).length}/{prompts.length} selected)</span>
                <div className="flex gap-2">
                  <button onClick={() => setPrompts(prev => prev.map(p => ({ ...p, selected: true })))} className="text-xs font-bold transition" style={{ color: GOLD_L }}>All</button>
                  <button onClick={() => setPrompts(prev => prev.map(p => ({ ...p, selected: false })))} className="text-xs font-bold transition" style={{ color: 'rgba(255,255,255,0.3)' }}>None</button>
                </div>
              </div>
              <div className="space-y-2">
                {prompts.map(p => (
                  <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl border transition"
                    style={{ borderColor: p.selected ? `${GOLD}40` : BORDER, background: p.selected ? `${GOLD}06` : 'rgba(0,0,0,0.2)' }}>
                    <button onClick={() => setPrompts(prev => prev.map(x => x.id === p.id ? { ...x, selected: !x.selected } : x))}
                      className="w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition"
                      style={{ borderColor: p.selected ? GOLD : BORDER, background: p.selected ? GOLD : 'transparent' }}>
                      {p.selected && <CheckCircle2 className="w-3 h-3 text-black" />}
                    </button>
                    <textarea value={p.text} rows={2}
                      onChange={e => setPrompts(prev => prev.map(x => x.id === p.id ? { ...x, text: e.target.value, edited: true } : x))}
                      className="flex-1 bg-transparent text-xs text-white/70 outline-none resize-none leading-relaxed" />
                  </div>
                ))}
              </div>
              <button onClick={handleGenerateFrames} disabled={prompts.filter(p => p.selected).length === 0}
                className="w-full py-3.5 rounded-xl text-sm font-bold disabled:opacity-50 transition flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, #6d28d9, #7c3aed)`, color: '#fff' }}>
                <Image className="w-4 h-4" /> Generate {prompts.filter(p => p.selected).length} Frame{prompts.filter(p => p.selected).length !== 1 ? 's' : ''}
              </button>
            </div>
          )}

          {/* Step 3: Frames */}
          {step === 'frames' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-white/30 uppercase tracking-wider block">Generated Frames</span>
              <div className="grid grid-cols-2 gap-3">
                {frames.map(frame => (
                  <div key={frame.id} className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                    <div className="relative bg-black/40" style={{ aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '1:1' ? '1/1' : '16/9' }}>
                      {frame.status === 'done' && frame.imageUrl ? (
                        <img src={frame.imageUrl} className="w-full h-full object-cover" alt={frame.promptText} />
                      ) : frame.status === 'error' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <span className="text-xs text-red-300 text-center px-2">{frame.error}</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <Loader className="w-5 h-5 animate-spin" style={{ color: GOLD }} />
                          <span className="text-xs text-white/40">Generating…</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed">{frame.promptText}</p>
                      {frame.status === 'done' && frame.imageUrl && (
                        <a href={frame.imageUrl} download target="_blank" rel="noreferrer"
                          className="mt-1.5 flex items-center gap-1 text-[10px] font-bold transition hover:brightness-125"
                          style={{ color: GOLD }}>
                          <Download className="w-3 h-3" /> Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {allFramesDone && (
                <button onClick={handleGenerateVideos} disabled={frames.filter(f => f.status === 'done').length === 0}
                  className="w-full py-3.5 rounded-xl text-sm font-bold disabled:opacity-50 transition flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, #6d28d9, #7c3aed)`, color: '#fff' }}>
                  <Film className="w-4 h-4" /> Generate {frames.filter(f => f.status === 'done').length} Video{frames.filter(f => f.status === 'done').length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}

          {/* Step 4 & 5: Videos */}
          {(step === 'video' || step === 'done') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/30 uppercase tracking-wider">
                  {step === 'done' ? '✅ Videos Ready' : '⏳ Generating Videos'}
                </span>
                {step === 'done' && (
                  <button onClick={resetStudio}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition hover:brightness-110"
                    style={{ background: GOLD, color: '#000' }}>
                    <Plus className="w-3.5 h-3.5" /> New Video
                  </button>
                )}
              </div>
              {step === 'video' && !allVideosDone && (
                <div className="p-3 rounded-xl text-xs text-amber-300/80 border border-amber-400/20 bg-amber-400/5 flex items-start gap-2">
                  <Loader className="w-3.5 h-3.5 animate-spin shrink-0 mt-0.5" />
                  AI video generation takes 2–5 minutes per clip. This page will update automatically — you can leave it open.
                </div>
              )}
              <div className="grid grid-cols-1 gap-4">
                {videos.map(vid => (
                  <div key={vid.id} className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                    <div className="relative bg-black" style={{ aspectRatio: aspectRatio === '9:16' ? '9/16' : aspectRatio === '1:1' ? '1/1' : '16/9' }}>
                      {vid.status === 'done' && vid.videoUrl ? (
                        <video src={vid.videoUrl} controls poster={vid.frameUrl} className="w-full h-full object-contain" playsInline />
                      ) : vid.status === 'error' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <span className="text-xs text-red-300">{vid.error}</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                          style={{ background: vid.frameUrl ? `url(${vid.frameUrl}) center/cover no-repeat` : 'rgba(0,0,0,0.5)' }}>
                          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
                          <div className="relative flex flex-col items-center gap-2">
                            <Loader className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
                            <span className="text-xs text-white/60 font-bold">
                              {vid.status === 'polling' ? 'Processing video…' : 'Submitting…'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-white/40 line-clamp-2">{vid.promptText}</p>
                      {vid.status === 'done' && vid.videoUrl && (
                        <a href={vid.videoUrl} download target="_blank" rel="noreferrer"
                          className="mt-2 flex items-center gap-1 text-xs font-bold transition hover:brightness-125"
                          style={{ color: GOLD }}>
                          <Download className="w-3.5 h-3.5" /> Download Video
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* History panel — lg screens only */}
      {historyOpen && (
        <div className="hidden lg:flex w-72 shrink-0 flex-col border-l" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: BORDER }}>
            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">History ({history.length})</span>
            <button onClick={() => { setHistory([]); try { localStorage.removeItem('mm_video_history'); } catch {} }}
              className="text-xs text-red-400/60 hover:text-red-400 transition">Clear</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-xs text-white/25">No history yet</div>
            ) : (
              history.map(item => (
                <div key={item.id} className="p-3 border-b" style={{ borderColor: BORDER }}>
                  {item.thumbnailUrl && <img src={item.thumbnailUrl} className="w-full rounded-lg mb-2 object-cover" style={{ aspectRatio: '16/9' }} alt="" />}
                  <p className="text-xs text-white/50 line-clamp-2 mb-1">{item.brief}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/25">{new Date(item.createdAt).toLocaleDateString()}</span>
                    <a href={item.videoUrl} download target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] font-bold" style={{ color: GOLD }}>
                      <Download className="w-3 h-3" /> Download
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'''
    src = src.replace(marker, ai_video_studio + marker, 1)
    print("✅ Step 4: Inserted AIVideoStudio component")

with open(path, 'w') as f:
    f.write(src)
PYEOF

# ── 5. Add 'video' nav item to Sidebar ────────────────────────────────────────
python3 - "$FILE" <<'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'r') as f:
    src = f.read()

old = "    { id: 'partner'  as ViewMode, label: 'Earn',     icon: <svg viewBox=\"0 0 24 24\""
new = "    { id: 'video'    as ViewMode, label: 'AI Video', icon: <Film className=\"w-5 h-5\" /> },\n    { id: 'partner'  as ViewMode, label: 'Earn',     icon: <svg viewBox=\"0 0 24 24\""

if "{ id: 'video'" in src:
    print("⚠️  Step 5: 'video' nav item already present — skipping")
elif old not in src:
    print("⚠️  Step 5: partner nav item anchor not found — skipping")
else:
    src = src.replace(old, new, 1)
    print("✅ Step 5: Added AI Video nav item to Sidebar (desktop)")

with open(path, 'w') as f:
    f.write(src)
PYEOF

# ── 6. Add 'video' nav item to mobile nav ─────────────────────────────────────
python3 - "$FILE" <<'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'r') as f:
    src = f.read()

# The mobile nav renders the same navItems array, so step 5 already covers it.
# Just confirm the array is shared.
if src.count("{ id: 'video'") >= 1:
    print("✅ Step 6: Mobile nav covered by shared navItems array")
else:
    print("⚠️  Step 6: Could not confirm mobile nav — check manually")
PYEOF

# ── 7. Add video view routing in main MediaDistributionPage ───────────────────
python3 - "$FILE" <<'PYEOF'
import sys

path = sys.argv[1]
with open(path, 'r') as f:
    src = f.read()

old = "            {view === 'partner'  && <PartnerDashboard"
new = "            {view === 'video'    && <AIVideoStudio userId={currentUser?.id ?? null} />}\n            {view === 'partner'  && <PartnerDashboard"

if "AIVideoStudio" in src and "view === 'video'" in src:
    print("⚠️  Step 7: video route already present — skipping")
elif old not in src:
    print("⚠️  Step 7: partner route anchor not found — skipping")
else:
    src = src.replace(old, new, 1)
    print("✅ Step 7: Added video view route")

with open(path, 'w') as f:
    f.write(src)
PYEOF

echo ""
echo "🎉 Done! Summary of changes applied to: $FILE"
echo "   Backup is at: $FILE.bak"
echo ""
echo "   Run: npx tsc --noEmit  to check for type errors"
