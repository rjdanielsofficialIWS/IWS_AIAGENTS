import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader, AlertCircle, X } from 'lucide-react';
import { supabase } from '../services/vapiAI';

/* ----------------------------------------
   Types
---------------------------------------- */
interface DemoPage {
  slug: string;
  assistant_id: string;
  system_prompt: string;
  first_message: string;
  is_active: boolean;
}

type ChatMsg = {
  role: 'assistant' | 'user';
  content: string;
};

type ModalMode = 'voice' | 'chat' | null;

/* ----------------------------------------
   Vapi SDK (loaded via CDN to avoid Vite issues)
---------------------------------------- */
declare global {
  interface Window {
    Vapi?: any;
  }
}

const VAPI_PUBLIC_KEY = 'ebb2120b-ac56-4ce9-b1d5-17966931c665';
const VAPI_SDK_SRC = 'https://unpkg.com/@vapi-ai/web/dist/vapi.min.js';

function loadVapiSdk(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.Vapi) {
      resolve(window.Vapi);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${VAPI_SDK_SRC}"]`
    );

    if (existing) {
      existing.addEventListener('load', () => resolve(window.Vapi));
      return;
    }

    const script = document.createElement('script');
    script.src = VAPI_SDK_SRC;
    script.async = true;
    script.onload = () => resolve(window.Vapi);
    script.onerror = () => reject(new Error('Failed to load Vapi SDK'));
    document.body.appendChild(script);
  });
}

/* ----------------------------------------
   Component
---------------------------------------- */
export function DynamicDemoPage() {
  const { slug } = useParams<{ slug: string }>();
  const targetSlug = useMemo(() => (slug || 'demo').trim(), [slug]);

  const [demoPage, setDemoPage] = useState<DemoPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalMode>(null);

  /* Voice */
  const vapiRef = useRef<any>(null);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'live' | 'ended'>('idle');

  /* Chat */
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const displayName = useMemo(() => {
    return targetSlug
      .split('-')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }, [targetSlug]);

  /* ----------------------------------------
     Fetch demo page
  ---------------------------------------- */
  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('demo_pages')
          .select('*')
          .eq('slug', targetSlug)
          .eq('is_active', true)
          .maybeSingle();

        if (error || !data) {
          setError('Demo page not found');
          setDemoPage(null);
        } else {
          setDemoPage(data);
          setChatMsgs([
            {
              role: 'assistant',
              content: data.first_message || `Hey ${displayName}, how can I help?`,
            },
          ]);
        }
      } catch {
        setError('Failed to load demo page');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [targetSlug, displayName]);

  /* ----------------------------------------
     Auto-scroll chat
  ---------------------------------------- */
  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMsgs, chatLoading]);

  /* ----------------------------------------
     Start voice call immediately
  ---------------------------------------- */
  useEffect(() => {
    if (modal !== 'voice' || !demoPage?.assistant_id) return;

    let cancelled = false;

    const startVoice = async () => {
      try {
        setVoiceStatus('connecting');
        const VapiCtor = await loadVapiSdk();
        if (cancelled) return;

        const vapi = new VapiCtor(VAPI_PUBLIC_KEY);
        vapiRef.current = vapi;

        vapi.on('call-start', () => setVoiceStatus('live'));
        vapi.on('call-end', () => setVoiceStatus('ended'));

        await vapi.start(demoPage.assistant_id);

        if (demoPage.first_message) {
          try {
            await vapi.say(demoPage.first_message, false);
          } catch {}
        }
      } catch {
        setVoiceStatus('ended');
      }
    };

    startVoice();

    return () => {
      cancelled = true;
      try {
        vapiRef.current?.stop();
      } catch {}
      vapiRef.current = null;
      setVoiceStatus('idle');
    };
  }, [modal, demoPage]);

  /* ----------------------------------------
     Send chat
  ---------------------------------------- */
  const sendChat = async () => {
    if (!demoPage?.assistant_id || !chatInput.trim()) return;

    const msg = chatInput.trim();
    setChatInput('');
    setChatLoading(true);
    setChatMsgs((prev) => [...prev, { role: 'user', content: msg }]);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vapi-public-chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assistantId: demoPage.assistant_id,
            input: msg,
          }),
        }
      );

      const json = await res.json();
      setChatMsgs((prev) => [
        ...prev,
        { role: 'assistant', content: json.response || '…' },
      ]);
    } catch {
      setChatMsgs((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  /* ----------------------------------------
     UI STATES
  ---------------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        <Loader className="h-10 w-10 animate-spin text-yellow-400" />
      </div>
    );
  }

  if (error || !demoPage) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <AlertCircle className="h-8 w-8 text-red-400 mr-2" />
        {error}
      </div>
    );
  }

  /* ----------------------------------------
     RENDER
  ---------------------------------------- */
  return (
    <div className="min-h-screen text-white bg-[radial-gradient(1200px_600px_at_50%_-200px,rgba(255,215,0,0.15),transparent_60%),linear-gradient(to_bottom,#2a2a2a,#0b0b0b,#000)]">
      {/* Header */}
      <header className="px-6 py-6">
        <Link to="/" className="flex items-center text-gray-400 hover:text-white">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back
        </Link>
      </header>

      {/* Hero */}
      <main className="max-w-3xl mx-auto text-center px-6">
        <h1 className="text-5xl font-extrabold mt-10">
          Hey <span className="text-yellow-400">{displayName}</span>,
        </h1>

        <p className="mt-6 text-xl text-gray-200">
          I built a tool that{' '}
          <span className="text-yellow-400 font-semibold">
            answers your customer calls
          </span>{' '}
          for you.
        </p>

        <div className="mt-10 bg-white/5 border border-gray-700/50 rounded-2xl p-6">
          It&apos;s a robot that talks to your customers on the phone, answers their
          questions, and helps them get what they need — automatically.
        </div>

        <p className="mt-10 text-lg font-semibold">
          Choose how you&apos;d like to try it:
        </p>

        <div className="mt-6 flex gap-4 justify-center">
          <button
            onClick={() => setModal('voice')}
            className="px-8 py-4 bg-yellow-400 text-black font-bold rounded-2xl hover:bg-yellow-300"
          >
            Call Me
          </button>

          <button
            onClick={() => setModal('chat')}
            className="px-8 py-4 border border-yellow-400 text-yellow-400 rounded-2xl hover:bg-yellow-400/10"
          >
            Text Me
          </button>
        </div>
      </main>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-black border border-gray-700 rounded-2xl w-full max-w-md p-6 relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              onClick={() => setModal(null)}
            >
              <X />
            </button>

            {modal === 'voice' ? (
              <div className="text-center">
                <h3 className="text-xl font-bold mb-4">AI Voice Agent</h3>
                <p className="text-gray-300">
                  {voiceStatus === 'connecting' && 'Connecting…'}
                  {voiceStatus === 'live' && 'Live — speak normally.'}
                  {voiceStatus === 'ended' && 'Call ended.'}
                </p>

                <button
                  className="mt-8 w-32 h-32 rounded-full bg-yellow-400 text-black font-bold"
                  onClick={() => {
                    vapiRef.current?.stop();
                    setVoiceStatus('ended');
                  }}
                >
                  End
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-[420px]">
                <div
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto border border-gray-700 rounded-xl p-4"
                >
                  {chatMsgs.map((m, i) => (
                    <div
                      key={i}
                      className={`mb-2 ${
                        m.role === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <span
                        className={`inline-block px-4 py-2 rounded-xl ${
                          m.role === 'user'
                            ? 'bg-yellow-400 text-black'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        {m.content}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                    className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-2 text-white"
                    placeholder="Type your message…"
                  />
                  <button
                    onClick={sendChat}
                    disabled={chatLoading}
                    className="px-4 py-2 bg-yellow-400 text-black rounded-xl"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}