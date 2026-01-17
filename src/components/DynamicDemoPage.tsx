import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader, AlertCircle, X } from 'lucide-react';
import { supabase } from '../services/vapiAI';
import Vapi from '@vapi-ai/web';

interface DemoPage {
  slug: string;
  assistant_id: string;
  system_prompt: string;
  first_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type ChatMsg = { role: 'assistant' | 'user'; content: string };

const VAPI_PUBLIC_KEY = 'ebb2120b-ac56-4ce9-b1d5-17966931c665';

export function DynamicDemoPage() {
  const { slug } = useParams<{ slug: string }>();

  const [demoPage, setDemoPage] = useState<DemoPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [openModal, setOpenModal] = useState<null | 'voice' | 'chat'>(null);

  // Voice SDK
  const vapiRef = useRef<Vapi | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'in-call' | 'ended' | 'error'>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Chat UI
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [previousChatId, setPreviousChatId] = useState<string | undefined>(undefined);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const targetSlug = useMemo(() => (slug || 'demo').trim(), [slug]);
  const displayName = useMemo(() => {
    if (!targetSlug) return 'Visitor';
    return targetSlug
      .split('-')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }, [targetSlug]);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const publicChatFunctionUrl = useMemo(() => {
    // Supabase edge functions are hosted at: <SUPABASE_URL>/functions/v1/<fn-name>
    return `${supabaseUrl}/functions/v1/vapi-public-chat`;
  }, [supabaseUrl]);

  useEffect(() => {
    fetchDemoPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSlug]);

  // Subscribe to changes so edits in Supabase update the page instantly
  useEffect(() => {
    if (!targetSlug) return;

    const channel = supabase
      .channel(`demo_pages:${targetSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demo_pages',
          filter: `slug=eq.${targetSlug}`,
        },
        (payload) => {
          const next = payload.new as DemoPage | null;
          if (next && next.is_active) {
            setDemoPage(next);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetSlug]);

  // When demoPage loads, reset chat “welcome” message to match record
  useEffect(() => {
    if (!demoPage) return;
    setChatMsgs([{ role: 'assistant', content: demoPage.first_message || `Hey ${displayName}, how can I help?` }]);
    setPreviousChatId(undefined);
  }, [demoPage, displayName]);

  // Auto-scroll chat
  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMsgs, chatLoading]);

  // When opening chat modal, focus input
  useEffect(() => {
    if (openModal === 'chat') {
      setTimeout(() => chatInputRef.current?.focus(), 50);
    }
  }, [openModal]);

  // Voice: when opening voice modal, start call immediately (no second click)
  useEffect(() => {
    if (openModal !== 'voice') return;
    if (!demoPage?.assistant_id) return;

    let canceled = false;

    const startVoice = async () => {
      try {
        setVoiceError(null);
        setVoiceStatus('connecting');

        // Create SDK instance per open (keeps it clean)
        const vapi = new Vapi(VAPI_PUBLIC_KEY);
        vapiRef.current = vapi;

        vapi.on('call-start', () => {
          if (canceled) return;
          setVoiceStatus('in-call');
        });

        vapi.on('call-end', () => {
          if (canceled) return;
          setVoiceStatus('ended');
        });

        // If the SDK emits errors as messages, still show a generic error
        vapi.on('error' as any, (e: any) => {
          if (canceled) return;
          setVoiceStatus('error');
          setVoiceError(e?.message || 'Voice call error');
        });

        // Start call using assistant ID from demo_pages record
        await vapi.start(demoPage.assistant_id);

        // Immediately speak the “first_message” from the record (so it’s in sync)
        if (demoPage.first_message?.trim()) {
          try {
            // say(message, endCallAfterSpoken?)
            await (vapi as any).say(demoPage.first_message.trim(), false);
          } catch {
            // If say() isn’t available in your SDK version, ignore safely
          }
        }
      } catch (err: any) {
        if (canceled) return;
        setVoiceStatus('error');
        setVoiceError(err?.message || 'Failed to start voice call');
      }
    };

    startVoice();

    return () => {
      canceled = true;
      try {
        vapiRef.current?.stop();
      } catch {
        // ignore
      }
      vapiRef.current = null;
      setVoiceStatus('idle');
      setVoiceError(null);
    };
  }, [openModal, demoPage]);

  const fetchDemoPage = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('demo_pages')
        .select('*')
        .eq('slug', targetSlug)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError(`Demo page "${targetSlug}" not found`);
        setDemoPage(null);
      } else {
        setDemoPage(data);
      }
    } catch (err) {
      console.error('Error fetching demo page:', err);
      setError('Failed to load demo page');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    // Stop voice if closing voice modal
    if (openModal === 'voice') {
      try {
        vapiRef.current?.stop();
      } catch {
        // ignore
      }
      vapiRef.current = null;
      setVoiceStatus('idle');
      setVoiceError(null);
    }
    setOpenModal(null);
  };

  const sendChat = async () => {
    if (!demoPage?.assistant_id) return;
    const msg = chatInput.trim();
    if (!msg) return;

    setChatError(null);
    setChatLoading(true);

    // optimistic add user msg
    setChatMsgs((prev) => [...prev, { role: 'user', content: msg }]);
    setChatInput('');

    try {
      const res = await fetch(publicChatFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assistantId: demoPage.assistant_id,
          input: msg,
          previousChatId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || 'Chat request failed');
      }

      const responseText =
        data?.response ||
        data?.output?.[0]?.content ||
        '…';

      const nextChatId = data?.chatId || data?.id;
      if (nextChatId) setPreviousChatId(nextChatId);

      setChatMsgs((prev) => [...prev, { role: 'assistant', content: responseText }]);
    } catch (e: any) {
      setChatError(e?.message || 'Chat failed');
      // show assistant error bubble
      setChatMsgs((prev) => [...prev, { role: 'assistant', content: 'Sorry — something went wrong. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const onChatKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') sendChat();
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white overflow-x-hidden flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_rgba(255,215,0,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(255,255,255,0.05),transparent_55%),linear-gradient(135deg,#0b0b0b,#101214,#050505)]">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-yellow-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading demo page...</p>
        </div>
      </div>
    );
  }

  if (error || !demoPage) {
    return (
      <div className="min-h-screen text-white overflow-x-hidden bg-[radial-gradient(ellipse_at_top,_rgba(255,215,0,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(255,255,255,0.05),transparent_55%),linear-gradient(135deg,#0b0b0b,#101214,#050505)]">
        <header className="relative z-10 py-8 px-4 sm:px-6 lg:px-8 border-b border-gray-800/60">
          <div className="max-w-7xl mx-auto">
            <Link to="/" className="flex items-center space-x-2 text-gray-400 hover:text-gray-300 transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </header>

        <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-red-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-12 w-12 text-red-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Demo Page Not Found</h2>
            <p className="text-xl text-gray-300 mb-8">
              {error || `The demo page "${targetSlug}" does not exist or is not active.`}
            </p>
            <Link
              to="/"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Return to Home</span>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white overflow-x-hidden bg-[radial-gradient(ellipse_at_top,_rgba(255,215,0,0.10),transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(255,255,255,0.06),transparent_55%),linear-gradient(135deg,#0b0b0b,#101214,#050505)]">
      <header className="relative z-10 py-8 px-4 sm:px-6 lg:px-8 border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 text-gray-400 hover:text-gray-300 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>

          <div className="text-center">
            <p className="text-xs tracking-widest uppercase text-gray-400">Demo</p>
            <h1 className="text-xl sm:text-2xl font-bold">
              Hey <span className="text-yellow-400">{displayName}</span>,
            </h1>
          </div>

          <div className="w-16" />
        </div>
      </header>

      <main className="relative z-10 px-4 sm:px-6 lg:px-8 py-14">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gray-300 text-lg sm:text-xl mb-6">
            I built a tool that <span className="text-yellow-400 font-semibold">answers your customer calls</span> for you.
          </p>

          <div className="mx-auto max-w-2xl bg-white/5 border border-gray-700/40 backdrop-blur-xl rounded-2xl p-6 sm:p-7 shadow-[0_10px_60px_rgba(0,0,0,0.6)]">
            <p className="text-gray-200 text-base sm:text-lg leading-relaxed">
              It&apos;s a robot that talks to your customers on the phone, answers their questions, and helps them get what they need — automatically.
            </p>
          </div>

          <p className="mt-10 text-gray-300 text-lg font-semibold">
            Choose how you&apos;d like to try it:
          </p>

          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setOpenModal('voice')}
              className="w-full sm:w-[240px] bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-2xl transition-all shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
            >
              Call Me
            </button>

            <button
              onClick={() => setOpenModal('chat')}
              className="w-full sm:w-[240px] bg-gray-900/60 hover:bg-gray-900/80 border border-gray-600/60 text-yellow-400 font-bold py-4 rounded-2xl transition-all shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
            >
              Text Me
            </button>
          </div>

          <div className="text-center mt-12">
            <a
              href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/25"
            >
              Schedule a Consultation
            </a>
          </div>
        </div>
      </main>

      {/* MODAL */}
      {openModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          />

          <div className="relative w-full max-w-[520px] rounded-2xl border border-gray-700/50 bg-black/55 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.75)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/40">
              <h3 className="text-lg font-bold">
                {openModal === 'voice' ? 'Call Me' : 'Text Me'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-200" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {openModal === 'voice' ? (
                <div className="min-h-[520px] flex flex-col items-center justify-center">
                  <div className="mb-4 text-center">
                    <p className="text-yellow-400 font-semibold">AI Voice Agent</p>
                    <p className="text-gray-300 text-sm">
                      {voiceStatus === 'connecting' && 'Connecting...'}
                      {voiceStatus === 'in-call' && 'Live — speak normally.'}
                      {voiceStatus === 'ended' && 'Call ended.'}
                      {voiceStatus === 'idle' && 'Ready.'}
                      {voiceStatus === 'error' && 'Something went wrong.'}
                    </p>
                    {voiceError && (
                      <p className="mt-2 text-sm text-red-300">{voiceError}</p>
                    )}
                  </div>

                  {/* Big center mic-style button to end call (optional) */}
                  <button
                    onClick={() => {
                      try {
                        vapiRef.current?.stop();
                      } catch {
                        // ignore
                      }
                      setVoiceStatus('ended');
                    }}
                    className="mt-3 w-40 h-40 rounded-full bg-gray-900/60 border border-gray-700/60 flex items-center justify-center hover:bg-gray-900/80 transition-all"
                    title="End call"
                  >
                    <div className="w-16 h-16 rounded-full bg-yellow-500/90 flex items-center justify-center shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
                      <span className="text-black font-bold">End</span>
                    </div>
                  </button>

                  <p className="mt-6 text-gray-400 text-sm text-center max-w-sm">
                    This starts automatically as soon as you click “Call Me”.
                  </p>
                </div>
              ) : (
                <div className="min-h-[520px] flex flex-col">
                  <div
                    ref={chatScrollRef}
                    className="flex-1 overflow-y-auto rounded-xl border border-gray-700/40 bg-black/30 p-4"
                  >
                    {chatMsgs.map((m, idx) => (
                      <div
                        key={idx}
                        className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            m.role === 'user'
                              ? 'bg-yellow-500 text-black'
                              : 'bg-white/10 text-gray-100 border border-gray-700/40'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))}

                    {chatLoading && (
                      <div className="mb-3 flex justify-start">
                        <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-white/10 text-gray-200 border border-gray-700/40">
                          Typing…
                        </div>
                      </div>
                    )}
                  </div>

                  {chatError && (
                    <div className="mt-3 text-sm text-red-300">
                      {chatError}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <input
                      ref={chatInputRef}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={onChatKeyDown}
                      placeholder="Type your message..."
                      className="flex-1 rounded-xl bg-black/40 border border-gray-700/50 px-4 py-3 text-gray-100 placeholder:text-gray-500 outline-none focus:border-yellow-500/60"
                    />
                    <button
                      onClick={sendChat}
                      disabled={chatLoading || !chatInput.trim()}
                      className="rounded-xl bg-yellow-500 text-black font-bold px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-400 transition"
                    >
                      Send
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Chat is powered by your demo_pages assistant_id via a secure server-side proxy.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="relative z-10 py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-800/60 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-500 text-sm">
            © 2024 Infinite Wealth Solutions. Transforming businesses with premium digital solutions.
          </p>
        </div>
      </footer>
    </div>
  );
}