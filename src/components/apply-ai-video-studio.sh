#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# apply-ai-video-studio.sh
# Run this script from the ROOT of your repo in your GitHub Codespace:
#   bash apply-ai-video-studio.sh
# It patches MediaDistributionPage.tsx in-place using Python's ast-free
# sed / python3 approach so it never corrupts JSX.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

TARGET="src/pages/MediaDistributionPage.tsx"   # adjust if your path differs

if [ ! -f "$TARGET" ]; then
  echo "❌  Cannot find $TARGET — edit the TARGET variable at the top of this script."
  exit 1
fi

echo "✅  Found $TARGET"

# ── 1. Backup ─────────────────────────────────────────────────────────────────
cp "$TARGET" "${TARGET}.bak"
echo "   Backup saved to ${TARGET}.bak"

# ── 2. Write the AIVideoStudio component to a temp file ───────────────────────
COMPONENT_FILE=$(mktemp /tmp/aivideostudio_XXXX.tsx)

cat > "$COMPONENT_FILE" << 'COMPONENT_EOF'

// ─── AIVideoStudio ────────────────────────────────────────────────────────────

type VideoStep = 'brief' | 'prompts' | 'frames' | 'video' | 'done';

type VideoProject = {
  id: string;
  brief: string;
  style: string;
  prompts: string[];
  frames: { prompt: string; imageUrl?: string; imageTaskId?: string; imageStatus: 'idle' | 'generating' | 'done' | 'error'; imageError?: string }[];
  videoTaskId?: string;
  videoUrl?: string;
  videoStatus: 'idle' | 'generating' | 'polling' | 'done' | 'error';
  videoError?: string;
  createdAt: Date;
};

const SUPABASE_URL_V = 'https://wcbkzebgcsfvrugibsjr.supabase.co';

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function AIVideoStudio({ userId }: { userId: string | null }) {
  const [step, setStep]                   = React.useState<VideoStep>('brief');
  const [brief, setBrief]                 = React.useState('');
  const [style, setStyle]                 = React.useState('cinematic');
  const [promptsLoading, setPromptsLoading] = React.useState(false);
  const [promptsError, setPromptsError]   = React.useState<string | null>(null);
  const [prompts, setPrompts]             = React.useState<string[]>(['', '', '', '']);
  const [frames, setFrames]               = React.useState<VideoProject['frames']>([]);
  const [videoTaskId, setVideoTaskId]     = React.useState<string | null>(null);
  const [videoUrl, setVideoUrl]           = React.useState<string | null>(null);
  const [videoStatus, setVideoStatus]     = React.useState<'idle' | 'generating' | 'polling' | 'done' | 'error'>('idle');
  const [videoError, setVideoError]       = React.useState<string | null>(null);
  const [history, setHistory]             = React.useState<VideoProject[]>(() => {
    try { return JSON.parse(localStorage.getItem('mm_video_projects') || '[]').map((p: any) => ({ ...p, createdAt: new Date(p.createdAt) })); }
    catch { return []; }
  });
  const [historyOpen, setHistoryOpen]     = React.useState(false);
  const pollRef                           = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const STYLES = [
    { id: 'cinematic',   label: '🎬 Cinematic'   },
    { id: 'anime',       label: '🌸 Anime'       },
    { id: 'realistic',   label: '📷 Realistic'   },
    { id: 'watercolor',  label: '🎨 Watercolor'  },
    { id: 'cyberpunk',   label: '🤖 Cyberpunk'   },
    { id: 'vintage',     label: '📽 Vintage'     },
  ];

  const persistHistory = (projects: VideoProject[]) => {
    setHistory(projects);
    try { localStorage.setItem('mm_video_projects', JSON.stringify(projects)); } catch {}
  };

  const saveProject = (patch: Partial<VideoProject>, id?: string) => {
    const projectId = id || Date.now().toString();
    setHistory(prev => {
      const exists = prev.find(p => p.id === projectId);
      const next = exists
        ? prev.map(p => p.id === projectId ? { ...p, ...patch } : p)
        : [{ id: projectId, brief, style, prompts, frames, videoStatus: 'idle', createdAt: new Date(), ...patch } as VideoProject, ...prev];
      try { localStorage.setItem('mm_video_projects', JSON.stringify(next)); } catch {}
      return next;
    });
    return projectId;
  };

  // Step 1 → 2: generate prompts
  const handleGeneratePrompts = async () => {
    if (!brief.trim()) return;
    setPromptsLoading(true); setPromptsError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${SUPABASE_URL_V}/functions/v1/kling-generate-prompts`, {
        method: 'POST', headers,
        body: JSON.stringify({ brief: brief.trim(), style }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate prompts');
      const generated: string[] = Array.isArray(data.prompts) ? data.prompts.slice(0, 4) : [];
      while (generated.length < 4) generated.push('');
      setPrompts(generated);
      setStep('prompts');
    } catch (e: any) { setPromptsError(e.message || 'Something went wrong'); }
    finally { setPromptsLoading(false); }
  };

  // Step 2 → 3: generate key-frame images
  const handleGenerateFrames = async () => {
    const activePrompts = prompts.filter(p => p.trim());
    if (activePrompts.length === 0) return;
    const initialFrames = activePrompts.map(p => ({
      prompt: p, imageStatus: 'generating' as const,
    }));
    setFrames(initialFrames);
    setStep('frames');

    await Promise.all(activePrompts.map(async (prompt, i) => {
      try {
        const headers = await authHeaders();
        const res = await fetch(`${SUPABASE_URL_V}/functions/v1/kling-generate-image`, {
          method: 'POST', headers,
          body: JSON.stringify({ prompt, style }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Image generation failed');
        // Poll if taskId returned, else treat imageUrl as immediate
        if (data.imageUrl) {
          setFrames(prev => prev.map((f, fi) => fi === i ? { ...f, imageUrl: data.imageUrl, imageStatus: 'done' } : f));
        } else if (data.taskId) {
          setFrames(prev => prev.map((f, fi) => fi === i ? { ...f, imageTaskId: data.taskId } : f));
          // Poll for image
          let attempts = 0;
          while (attempts < 30) {
            await new Promise(r => setTimeout(r, 4000));
            const pollHeaders = await authHeaders();
            const pollRes = await fetch(`${SUPABASE_URL_V}/functions/v1/kling-poll`, {
              method: 'POST', headers: pollHeaders,
              body: JSON.stringify({ taskId: data.taskId, type: 'image' }),
            });
            const pollData = await pollRes.json();
            if (pollData.status === 'done' && pollData.imageUrl) {
              setFrames(prev => prev.map((f, fi) => fi === i ? { ...f, imageUrl: pollData.imageUrl, imageStatus: 'done' } : f));
              break;
            }
            if (pollData.status === 'error') {
              setFrames(prev => prev.map((f, fi) => fi === i ? { ...f, imageStatus: 'error', imageError: pollData.error || 'Generation failed' } : f));
              break;
            }
            attempts++;
          }
          if (attempts >= 30) {
            setFrames(prev => prev.map((f, fi) => fi === i ? { ...f, imageStatus: 'error', imageError: 'Timed out' } : f));
          }
        }
      } catch (e: any) {
        setFrames(prev => prev.map((f, fi) => fi === i ? { ...f, imageStatus: 'error', imageError: e.message } : f));
      }
    }));
  };

  // Step 3 → 4: generate video
  const handleGenerateVideo = async () => {
    const doneFrames = frames.filter(f => f.imageUrl);
    if (doneFrames.length === 0) return;
    setVideoStatus('generating'); setVideoError(null);
    setStep('video');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${SUPABASE_URL_V}/functions/v1/kling-generate-video`, {
        method: 'POST', headers,
        body: JSON.stringify({
          frames: doneFrames.map(f => ({ imageUrl: f.imageUrl, prompt: f.prompt })),
          style,
          brief: brief.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Video generation failed');
      if (data.videoUrl) {
        setVideoUrl(data.videoUrl); setVideoStatus('done'); setStep('done');
        saveProject({ videoUrl: data.videoUrl, videoStatus: 'done', frames, brief, style, prompts });
      } else if (data.taskId) {
        setVideoTaskId(data.taskId);
        setVideoStatus('polling');
        // Start polling
        let attempts = 0;
        const poll = async () => {
          if (attempts >= 60) {
            setVideoStatus('error'); setVideoError('Video generation timed out after 4 minutes');
            return;
          }
          attempts++;
          try {
            const ph = await authHeaders();
            const pr = await fetch(`${SUPABASE_URL_V}/functions/v1/kling-poll`, {
              method: 'POST', headers: ph,
              body: JSON.stringify({ taskId: data.taskId, type: 'video' }),
            });
            const pd = await pr.json();
            if (pd.status === 'done' && pd.videoUrl) {
              setVideoUrl(pd.videoUrl); setVideoStatus('done'); setStep('done');
              saveProject({ videoUrl: pd.videoUrl, videoStatus: 'done', videoTaskId: data.taskId, frames, brief, style, prompts });
            } else if (pd.status === 'error') {
              setVideoStatus('error'); setVideoError(pd.error || 'Generation failed');
            } else {
              pollRef.current = setTimeout(poll, 4000) as any;
            }
          } catch {
            pollRef.current = setTimeout(poll, 6000) as any;
          }
        };
        pollRef.current = setTimeout(poll, 5000) as any;
      }
    } catch (e: any) { setVideoStatus('error'); setVideoError(e.message || 'Failed'); }
  };

  const handleReset = () => {
    if (pollRef.current) clearTimeout(pollRef.current as any);
    setBrief(''); setStyle('cinematic'); setPrompts(['', '', '', '']);
    setFrames([]); setVideoTaskId(null); setVideoUrl(null);
    setVideoStatus('idle'); setVideoError(null); setPromptsError(null);
    setStep('brief');
  };

  React.useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current as any); }, []);

  const allFramesDone = frames.length > 0 && frames.every(f => f.imageStatus === 'done' || f.imageStatus === 'error');
  const anyFrameDone  = frames.some(f => f.imageStatus === 'done');

  const STEP_LABELS: Record<VideoStep, string> = {
    brief: '1. Brief', prompts: '2. Prompts', frames: '3. Frames', video: '4. Generating', done: '5. Done',
  };
  const STEPS: VideoStep[] = ['brief', 'prompts', 'frames', 'video', 'done'];

  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8" style={{ background: BG }}>
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Film className="w-5 h-5" style={{ color: GOLD }} />
              AI Video Studio
            </h1>
            <p className="text-sm text-white/40 mt-1">Brief → AI prompts → key frames → full AI video</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setHistoryOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition hover:bg-white/5"
              style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
              <ClipboardList className="w-3.5 h-3.5" />
              History ({history.length})
            </button>
            {step !== 'brief' && (
              <button onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition hover:bg-white/5"
                style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
                <RefreshCcw className="w-3.5 h-3.5" /> New
              </button>
            )}
          </div>
        </div>

        {/* Progress stepper */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const active  = s === step;
            const passed  = STEPS.indexOf(step) > i;
            return (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition"
                    style={{
                      background: passed ? '#22c55e' : active ? GOLD : 'rgba(255,255,255,0.07)',
                      color: (passed || active) ? '#000' : 'rgba(255,255,255,0.25)',
                    }}>
                    {passed ? '✓' : i + 1}
                  </div>
                  <span className="text-[9px] font-bold whitespace-nowrap hidden sm:block"
                    style={{ color: active ? GOLD_L : passed ? '#86efac' : 'rgba(255,255,255,0.2)' }}>
                    {STEP_LABELS[s].split('. ')[1]}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px mx-1 rounded-full"
                    style={{ background: STEPS.indexOf(step) > i ? '#22c55e' : 'rgba(255,255,255,0.08)' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Step 1: Brief ── */}
        {step === 'brief' && (
          <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: BORDER, background: SURFACE }}>
            <div>
              <label className="text-xs font-bold text-white/30 uppercase tracking-wider">Video Brief</label>
              <textarea
                value={brief}
                onChange={e => setBrief(e.target.value)}
                placeholder="Describe the video you want to create. E.g. 'A luxury real-estate reveal of a Miami penthouse at sunset, with slow cinematic drone shots and warm golden lighting'"
                rows={5}
                className="mt-2 w-full rounded-xl border bg-black/30 px-4 py-3 text-sm text-white placeholder-white/20 outline-none resize-none"
                style={{ borderColor: BORDER }}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2 block">Visual Style</label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className="px-3 py-2 rounded-xl border text-xs font-bold transition"
                    style={{
                      borderColor: style === s.id ? GOLD : BORDER,
                      background:  style === s.id ? `${GOLD}18` : 'transparent',
                      color:       style === s.id ? GOLD_L : 'rgba(255,255,255,0.45)',
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {promptsError && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-xs text-red-300 border border-red-400/20 bg-red-400/5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {promptsError}
              </div>
            )}
            <button
              onClick={handleGeneratePrompts}
              disabled={promptsLoading || !brief.trim()}
              className="w-full flex flex-col items-center gap-0.5 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
              style={{ background: GOLD, color: '#000' }}>
              <span className="flex items-center gap-2">
                {promptsLoading
                  ? <><Loader className="w-4 h-4 animate-spin" /> Generating Shot Prompts…</>
                  : <><Wand2 className="w-4 h-4" /> Generate Shot Prompts</>}
              </span>
              {promptsLoading && <span style={{ fontSize: 9, opacity: 0.6 }}>AI is planning your shots…</span>}
            </button>
          </div>
        )}

        {/* ── Step 2: Prompts ── */}
        {step === 'prompts' && (
          <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: BORDER, background: SURFACE }}>
            <div>
              <div className="text-sm font-black text-white mb-1">AI-Generated Shot Prompts</div>
              <p className="text-xs text-white/35">Review and edit each shot prompt, then generate the key frames.</p>
            </div>
            <div className="space-y-3">
              {prompts.map((p, i) => (
                <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                  <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: BORDER, background: 'rgba(0,0,0,0.2)' }}>
                    <span className="text-[10px] font-black text-white/25 uppercase tracking-widest">Shot {i + 1}</span>
                  </div>
                  <textarea
                    value={p}
                    onChange={e => setPrompts(prev => prev.map((x, xi) => xi === i ? e.target.value : x))}
                    rows={3}
                    placeholder="Describe this shot…"
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white/80 outline-none resize-none placeholder-white/20"
                    style={{ background: 'rgba(0,0,0,0.15)' }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('brief')}
                className="px-4 py-2.5 rounded-xl border text-xs font-bold transition hover:bg-white/5"
                style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
                ← Back
              </button>
              <button
                onClick={handleGenerateFrames}
                disabled={!prompts.some(p => p.trim())}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
                style={{ background: GOLD, color: '#000' }}>
                <Upload className="w-4 h-4" /> Generate Key Frames
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Frames ── */}
        {step === 'frames' && (
          <div className="space-y-4">
            <div className="rounded-2xl border p-5" style={{ borderColor: BORDER, background: SURFACE }}>
              <div className="text-sm font-black text-white mb-1">Key Frame Generation</div>
              <p className="text-xs text-white/35 mb-4">AI is rendering each shot as a key frame image. This may take 1–3 minutes per frame.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {frames.map((f, i) => (
                  <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                    <div className="aspect-video bg-black/40 flex items-center justify-center relative overflow-hidden">
                      {f.imageStatus === 'generating' && (
                        <div className="flex flex-col items-center gap-2 text-white/30">
                          <Loader className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
                          <span className="text-xs font-bold">Generating…</span>
                        </div>
                      )}
                      {f.imageStatus === 'done' && f.imageUrl && (
                        <img src={f.imageUrl} alt={`Frame ${i+1}`} className="w-full h-full object-cover" />
                      )}
                      {f.imageStatus === 'error' && (
                        <div className="flex flex-col items-center gap-1 text-red-400 text-xs text-center px-3">
                          <AlertCircle className="w-5 h-5" />
                          <span>{f.imageError || 'Failed'}</span>
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <span className="text-[10px] font-black text-white/25 shrink-0">Shot {i+1}</span>
                      <span className="text-[10px] text-white/35 truncate flex-1">{f.prompt.slice(0, 60)}{f.prompt.length > 60 ? '…' : ''}</span>
                      <span className="text-[10px] font-bold shrink-0" style={{ color: f.imageStatus === 'done' ? '#86efac' : f.imageStatus === 'error' ? '#fca5a5' : GOLD }}>
                        {f.imageStatus === 'done' ? '✓' : f.imageStatus === 'error' ? '✗' : '…'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {allFramesDone && (
              <div className="flex gap-3">
                <button onClick={() => setStep('prompts')}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold transition hover:bg-white/5"
                  style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.4)' }}>
                  ← Back
                </button>
                <button
                  onClick={handleGenerateVideo}
                  disabled={!anyFrameDone}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition hover:brightness-110"
                  style={{ background: GOLD, color: '#000' }}>
                  <Film className="w-4 h-4" /> Generate Video
                </button>
              </div>
            )}
            {!allFramesDone && (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-white/25">
                <Loader className="w-3.5 h-3.5 animate-spin" /> Waiting for all frames to complete…
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Video Generating ── */}
        {step === 'video' && (
          <div className="rounded-2xl border p-8 flex flex-col items-center gap-5 text-center" style={{ borderColor: BORDER, background: SURFACE }}>
            {videoStatus === 'error' ? (
              <>
                <AlertCircle className="w-10 h-10 text-red-400" />
                <div>
                  <div className="text-base font-black text-white mb-1">Video Generation Failed</div>
                  <p className="text-sm text-red-300">{videoError}</p>
                </div>
                <button onClick={() => setStep('frames')}
                  className="px-6 py-2.5 rounded-xl border text-sm font-bold transition hover:bg-white/5"
                  style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.5)' }}>
                  ← Try Again
                </button>
              </>
            ) : (
              <>
                <div className="relative">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${GOLD}18` }}>
                    <Film className="w-7 h-7" style={{ color: GOLD }} />
                  </div>
                  <div className="absolute -inset-2 rounded-full border-2 border-dashed animate-spin" style={{ borderColor: `${GOLD}40`, animationDuration: '3s' }} />
                </div>
                <div>
                  <div className="text-base font-black text-white mb-1">
                    {videoStatus === 'generating' ? 'Starting Video Generation…' : 'Rendering Your Video…'}
                  </div>
                  <p className="text-sm text-white/35">AI video generation typically takes 2–5 minutes. Hang tight!</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/25">
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  {videoStatus === 'polling' ? `Polling for completion… (Task: ${videoTaskId?.slice(0, 12)}…)` : 'Submitting to AI pipeline…'}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 5: Done ── */}
        {step === 'done' && videoUrl && (
          <div className="space-y-4">
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${GOLD}40`, background: SURFACE }}>
              <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: BORDER }}>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm font-black text-white">Video Ready!</span>
                <span className="ml-auto text-xs text-white/30">{new Date().toLocaleTimeString()}</span>
              </div>
              <video
                src={videoUrl}
                controls
                className="w-full"
                style={{ maxHeight: 480, background: '#000' }}
              />
              <div className="flex items-center gap-3 px-5 py-4">
                <a
                  href={videoUrl}
                  download="ai-video.mp4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition hover:brightness-110"
                  style={{ background: GOLD, color: '#000' }}>
                  <Download className="w-4 h-4" /> Download Video
                </a>
                <button onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition hover:bg-white/5"
                  style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.5)' }}>
                  <RefreshCcw className="w-4 h-4" /> Create Another
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── History panel ── */}
      {historyOpen && (
        <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center md:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
          <div className="relative w-full md:max-w-lg rounded-t-2xl md:rounded-2xl border overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            style={{ background: SURFACE, borderColor: BORDER }}>
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
              <div className="text-sm font-black text-white">🎬 Video History</div>
              <button onClick={() => setHistoryOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                  <Film className="w-8 h-8 text-white/15" />
                  <div className="text-sm text-white/25 font-bold">No videos yet</div>
                  <div className="text-xs text-white/15">Your completed projects will appear here</div>
                </div>
              ) : history.map(project => (
                <div key={project.id} className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
                  {project.videoUrl ? (
                    <video src={project.videoUrl} className="w-full" style={{ maxHeight: 180, background: '#000' }} controls />
                  ) : (
                    <div className="h-24 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <span className="text-xs text-white/20 font-bold uppercase tracking-wider">
                        {project.videoStatus === 'done' ? 'No URL saved' : project.videoStatus}
                      </span>
                    </div>
                  )}
                  <div className="px-3 py-3 space-y-1">
                    <div className="text-xs font-bold text-white/60 line-clamp-2">{project.brief}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/25">{project.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ background: project.videoStatus === 'done' ? 'rgba(34,197,94,0.12)' : `${GOLD}12`, color: project.videoStatus === 'done' ? '#86efac' : GOLD_L }}>
                        {project.videoStatus}
                      </span>
                      {project.videoUrl && (
                        <a href={project.videoUrl} download target="_blank" rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition hover:brightness-110"
                          style={{ background: `${GOLD}15`, color: GOLD_L }}>
                          <Download className="w-3 h-3" /> Download
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {history.length > 0 && (
              <div className="px-5 py-3 border-t shrink-0" style={{ borderColor: BORDER }}>
                <button onClick={() => { persistHistory([]); }}
                  className="w-full py-2 rounded-xl border text-xs font-bold transition hover:bg-red-500/10 hover:border-red-500/30"
                  style={{ borderColor: BORDER, color: 'rgba(255,255,255,0.25)' }}>
                  Clear History
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

COMPONENT_EOF

echo "   Component file written to $COMPONENT_FILE"

# ── 3. Apply changes using Python ─────────────────────────────────────────────
python3 << PYEOF
import re, sys

target = "$TARGET"
component_file = "$COMPONENT_FILE"

with open(target, 'r', encoding='utf-8') as f:
    src = f.read()

with open(component_file, 'r', encoding='utf-8') as f:
    component_code = f.read()

changed = src

# ── 3a. Add 'video' to ViewMode type ──────────────────────────────────────────
old_viewmode = "type ViewMode = 'composer' | 'calendar' | 'planner' | 'partner';"
new_viewmode = "type ViewMode = 'composer' | 'calendar' | 'planner' | 'partner' | 'video';"
if old_viewmode in changed:
    changed = changed.replace(old_viewmode, new_viewmode)
    print("  ✅  ViewMode updated")
else:
    print("  ⚠️   ViewMode type not found — check manually")

# ── 3b. Add Film, Upload, Download, RefreshCcw, Wand2 to lucide imports ───────
old_import = "  ClipboardList, FileText, Trash2, BookOpen, DollarSign, Copy, TrendingUp, Users, Gift,"
new_import = "  ClipboardList, FileText, Trash2, BookOpen, DollarSign, Copy, TrendingUp, Users, Gift,\n  Film, Upload, Download, RefreshCcw, Wand2,"
if old_import in changed:
    changed = changed.replace(old_import, new_import)
    print("  ✅  Lucide imports updated")
else:
    print("  ⚠️   Lucide import line not found — check manually")

# ── 3c. Inject AIVideoStudio component before MediaDistributionPage export ────
insert_before = "// ─── Main page ──────────────────────────────────────────────────────────────"
if insert_before in changed:
    changed = changed.replace(insert_before, component_code + "\n" + insert_before)
    print("  ✅  AIVideoStudio component injected")
else:
    print("  ⚠️   Injection anchor not found — check manually")

# ── 3d. Add 'video' nav item to Sidebar navItems ──────────────────────────────
old_nav = "    { id: 'partner'  as ViewMode, label: 'Earn',     icon: <svg viewBox=\"0 0 24 24\" fill=\"none\" className=\"w-5 h-5\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"><line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"23\"/><path d=\"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6\"/></svg> },"
new_nav = old_nav + "\n    { id: 'video'   as ViewMode, label: 'Studio',  icon: <Film className=\"w-5 h-5\" /> },"
if old_nav in changed:
    changed = changed.replace(old_nav, new_nav)
    print("  ✅  Sidebar nav item added")
else:
    print("  ⚠️   Sidebar nav anchor not found — check manually")

# ── 3e. Add view routing for 'video' ──────────────────────────────────────────
old_routing = "            {view === 'partner'  && <PartnerDashboard userId={currentUser?.id ?? null} userEmail={currentUser?.email ?? null} userName={authUser?.user_metadata?.full_name ?? authUser?.user_metadata?.name ?? null} />}"
new_routing = old_routing + "\n            {view === 'video'   && <AIVideoStudio userId={currentUser?.id ?? null} />}"
if old_routing in changed:
    changed = changed.replace(old_routing, new_routing)
    print("  ✅  View routing added")
else:
    print("  ⚠️   View routing anchor not found — check manually")

with open(target, 'w', encoding='utf-8') as f:
    f.write(changed)

print("  ✅  File written successfully")
PYEOF

rm -f "$COMPONENT_FILE"
echo ""
echo "✅  Done! Changes applied to $TARGET"
echo "   To verify: grep -n 'AIVideoStudio\|ViewMode\|Film,' $TARGET | head -20"
echo "   To revert: cp ${TARGET}.bak $TARGET"
