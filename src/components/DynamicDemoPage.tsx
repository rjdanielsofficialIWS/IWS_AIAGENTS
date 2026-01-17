import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader, AlertCircle, X, Phone, PhoneOff, MessageSquare } from 'lucide-react';
import { supabase } from '../services/vapiAI';
import Vapi from '@vapi-ai/web';

interface DemoPage {
  slug: string;
  assistant_id: string;
  system_prompt: string;
  first_message: string;
  is_active: boolean;
}

type ChatMsg = { role: 'assistant' | 'user'; content: string };
type ModalMode = 'voice' | 'chat' | null;

const VAPI_PUBLIC_KEY = 'ebb2120b-ac56-4ce9-b1d5-17966931c665';

export function DynamicDemoPage() {
  const { slug } = useParams<{ slug: string }>();
  const targetSlug = useMemo(() => (slug || 'demo').trim(), [slug]);

  const [demoPage, setDemoPage] = useState<DemoPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalMode>(null);

  // Voice
  const vapiRef = useRef<Vapi | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'live' | 'ended' | 'error'>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Chat
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const displayName = useMemo(() => {
    return targetSlug
      .split('-')
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }, [targetSlug]);

  // Remove any floating Vapi launcher widgets (but don't mess with modal content)
  const nukeVapiLauncher = () => {
    document.querySelectorAll('vapi-widget').forEach((node) => {
      const el = node as HTMLElement;
      if (el.closest('[data-demo-modal="true"]')) return;
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') el.remove();
    });

    const candidates = document.querySelectorAll(
      '[class*="vapi"], [id*="vapi"], [data-vapi], [class*="Vapi"], [id*="Vapi"]'
    );

    candidates.forEach((node) => {
      const el = node as HTMLElement;
      if (el.closest('[data-demo-modal="true"]')) return;
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') el.remove();
    });
  };

  useEffect(() => {
    nukeVapiLauncher();
    const t1 = window.setTimeout(nukeVapiLauncher, 300);
    const t2 = window.setTimeout(nukeVapiLauncher, 1200);
    const t3 = window.setTimeout(nukeVapiLauncher, 2500);

    const obs = new MutationObserver(() => nukeVapiLauncher());
    obs.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      obs.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch demo page record
  useEffect(() => {
    let alive = true;

    const fetchPage = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('demo_pages')
          .select('*')
          .eq('slug', targetSlug)
          .eq('is_active', true)
          .maybeSingle();

        if (!alive) return;

        if (error || !data) {
          setDemoPage(null);
          setError(`Demo page "${targetSlug}" not found`);
          return;
        }

        setDemoPage(data);
        setChatMsgs([
          {
            role: 'assistant',
            content: data.first_message || `Hey ${displayName}, how can I help?`,
          },
        ]);
      } catch {
        if (!alive) return;
        setDemoPage(null);
        setError('Failed to load demo page');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    fetchPage();

    return () => {
      alive = false;
    };
  }, [targetSlug, displayName]);

  // Realtime updates (optional but you had it)
  useEffect(() => {
    if (!targetSlug) return;

    const channel = supabase
      .channel(`demo_pages:${targetSlug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demo_pages', filter: `slug=eq.${targetSlug}` },
        (payload) => {
          const next = payload.new as DemoPage | null;
          if (!next || !next.is_active) return;

          setDemoPage(next);
          setChatMsgs((prev) => {
            if (!prev.length) {
              return [{ role: 'assistant', content: next.first_message || `Hey ${displayName}, how can I help?` }];
            }
            const copy = [...prev];
            if (copy[0]?.role === 'assistant') {
              copy[0] = { role: 'assistant', content: next.first_message || copy[0].content };
            }
            return copy;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetSlug, displayName]);

  // Auto-scroll chat
  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMsgs, chatLoading]);

  // Start voice immediately when voice modal opens
  useEffect(() => {
    if (modal !== 'voice') return;
    if (!demoPage?.assistant_id) return;

    let cancelled = false;

    const start = async () => {
      try {
        setVoiceError(null);
        setVoiceStatus('connecting');

        try {
          vapiRef.current?.stop();
        } catch {}
        vapiRef.current = null;

        const vapi = new Vapi(VAPI_PUBLIC_KEY);
        vapiRef.current = vapi;

        vapi.on('call-start', () => {
          if (cancelled) return;
          setVoiceStatus('live');
        });

        vapi.on('call-end', () => {
          if (cancelled) return;
          setVoiceStatus('ended');
        });

        (vapi as any).on?.('error', (e: any) => {
          if (cancelled) return;
          setVoiceStatus('error');
          setVoiceError(e?.message || 'Voice error');
        });

        await vapi.start(demoPage.assistant_id);

        if (demoPage.first_message?.trim()) {
          try {
            await (vapi as any).say(demoPage.first_message.trim(), false);
          } catch {}
        }
      } catch (e: any) {
        if (cancelled) return;
        setVoiceStatus('error');
        setVoiceError(e?.message || 'Failed to start voice');
      }
    };

    start();

    return () => {
      cancelled = true;
      try {
        vapiRef.current?.stop();
      } catch {}
      vapiRef.current = null;
      setVoiceStatus('idle');
      setVoiceError(null);
    };
  }, [modal, demoPage]);

  const closeModal = () => {
    if (modal === 'voice') {
      try {
        vapiRef.current?.stop();
      } catch {}
      vapiRef.current = null;
      setVoiceStatus('idle');
      setVoiceError(null);
    }
    setModal(null);
  };

  // Chat uses Supabase Edge Function (Option A)
  const sendChat = async () => {
    if (!demoPage?.assistant_id) return;
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;

    setChatError(null);
    setChatLoading(true);
    setChatInput('');
    setChatMsgs((prev) => [...prev, { role: 'user', content: msg }]);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL');
      if (!anonKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY');

      const publicChatUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/vapi-public-chat`;

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || anonKey;

      const res = await fetch(publicChatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assistantId: demoPage.assistant_id,
          input: msg,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || json?.message || `Chat failed (${res.status})`);
      }

      const reply = json?.response || '…';
      setChatMsgs((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setChatError(e?.message || 'Chat failed (edge function)');
    } finally {
      setChatLoading(false);
    }
  };

  // UI states
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        <div className="text-center">
          <Loader className="h-10 w-10 animate-spin text-yellow-400 mx-auto mb-3" />
          <p className="text-gray-300">Loading demo...</p>
        </div>
      </div>
    );
  }

  if (error || !demoPage) {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="px-6 py-6 border-b border-gray-800">
          <Link to="/" className="flex items-center text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5 mr-2" /> Back
          </Link>
        </header>

        <div className="min-h-[70vh] flex items-center justify-center px-6">
          <div className="text-center max-w-xl">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-3">Demo Page Not Found</h2>
            <p className="text-gray-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white bg-[radial-gradient(1200px_600px_at_50%_-200px,rgba(255,215,0,0.15),transparent_60%),linear-gradient(to_bottom,#2a2a2a,#0b0b0b,#000)]">
      {/* Header */}
      <header className="px-6 py-6">
        <Link to="/" className="flex items-center text-gray-400 hover:text-white">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back
        </Link>
      </header>

      {/* Hero */}
      <main className="max-w-3xl mx-auto text-center px-6 pb-16">
        <h1 className="text-5xl font-extrabold mt-10">
          Hey <span className="text-yellow-400">{displayName}</span>,
        </h1>

        <p className="mt-6 text-xl text-gray-200">
          I built a tool that <span className="text-yellow-400 font-semibold">answers your customer calls</span> for you.
        </p>

        <div className="mt-10 bg-white/5 border border-gray-700/50 rounded-2xl p-6 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
          It&apos;s a robot that talks to your customers on the phone, answers their questions, and helps them get what they need — automatically.
        </div>

        <p className="mt-10 text-lg font-semibold">Choose how you&apos;d like to try it:</p>

        <div className="mt-6 flex gap-4 justify-center">
          <button
            onClick={() => setModal('voice')}
            className="px-8 py-4 bg-yellow-400 text-black font-bold rounded-2xl hover:bg-yellow-300 transition inline-flex items-center gap-3"
          >
            <Phone className="h-5 w-5" />
            Call Me
          </button>

          <button
            onClick={() => setModal('chat')}
            className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-100 transition inline-flex items-center gap-3"
          >
            <MessageSquare className="h-5 w-5" />
            Text Me
          </button>
        </div>
      </main>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" data-demo-modal="true">
          <div className="bg-black/80 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.75)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
              <div className="font-bold">{modal === 'voice' ? 'Call Me' : 'Text Me'}</div>
              <button className="text-gray-300 hover:text-white" onClick={closeModal} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              {modal === 'voice' ? (
                <div className="text-center min-h-[420px] flex flex-col items-center justify-center">
                  <h3 className="text-xl font-bold mb-2 text-yellow-400">AI Voice Agent</h3>

                  <p className="text-gray-300">
                    {voiceStatus === 'connecting' && 'Connecting… (you may see a mic permission prompt)'}
                    {voiceStatus === 'live' && 'Live — speak normally.'}
                    {voiceStatus === 'ended' && 'Call ended.'}
                    {voiceStatus === 'error' && 'Could not start the call.'}
                    {voiceStatus === 'idle' && 'Ready.'}
                  </p>

                  {voiceError && <p className="mt-2 text-sm text-red-300">{voiceError}</p>}

                  {/* ✅ Sleek Hang Up Button */}
                  <button
                    onClick={() => {
                      try {
                        vapiRef.current?.stop();
                      } catch {}
                      setVoiceStatus('ended');
                    }}
                    className="
                      mt-10
                      w-20 h-20
                      rounded-full
                      bg-red-600
                      hover:bg-red-500
                      active:scale-95
                      transition
                      flex items-center justify-center
                      shadow-[0_10px_30px_rgba(220,38,38,0.45)]
                    "
                    aria-label="End call"
                  >
                    <PhoneOff className="h-8 w-8 text-white" />
                  </button>

                  <p className="mt-4 text-sm text-gray-400 tracking-wide">Tap to hang up</p>
                </div>
              ) : (
                <div className="flex flex-col h-[420px]">
                  <div
                    ref={chatScrollRef}
                    className="flex-1 overflow-y-auto border border-gray-700/60 rounded-xl p-4 bg-black/40"
                  >
                    {chatMsgs.map((m, i) => (
                      <div key={i} className={`mb-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <span
                          className={`inline-block px-4 py-2 rounded-xl ${
                            m.role === 'user'
                              ? 'bg-white text-black'
                              : 'bg-white/10 text-white border border-gray-700/50'
                          }`}
                        >
                          {m.content}
                        </span>
                      </div>
                    ))}

                    {chatLoading && (
                      <div className="mb-2 text-left">
                        <span className="inline-block px-4 py-2 rounded-xl bg-white/10 text-white border border-gray-700/50">
                          Typing…
                        </span>
                      </div>
                    )}
                  </div>

                  {chatError && <div className="mt-2 text-xs text-red-300">{chatError}</div>}

                  <div className="mt-3 flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                      className="flex-1 bg-black/40 border border-gray-700/60 rounded-xl px-4 py-2 text-white placeholder:text-gray-500 outline-none focus:border-yellow-400/70"
                      placeholder="Type your message…"
                    />
                    <button
                      onClick={sendChat}
                      disabled={chatLoading || !chatInput.trim()}
                      className="px-4 py-2 bg-white text-black rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                    >
                      Send
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Chat uses: <span className="text-gray-400">/functions/v1/vapi-public-chat</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}