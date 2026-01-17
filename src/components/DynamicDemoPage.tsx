import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader, AlertCircle, X, Phone, MessageSquare } from 'lucide-react';
import { supabase } from '../services/vapiAI';
import Vapi from '@vapi-ai/web';

interface DemoPage {
  slug: string;
  assistant_id: string;
  system_prompt: string;
  first_message: string;
  is_active: boolean;
}

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

  const displayName = useMemo(() => {
    return targetSlug
      .split('-')
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }, [targetSlug]);

  /**
   * Remove ONLY floating/launcher Vapi widgets.
   * Do NOT remove anything inside our modal.
   */
  const nukeVapiLauncher = () => {
    // If there is a floating widget somewhere else, remove it.
    // But never remove widgets inside our modal container.
    document.querySelectorAll('vapi-widget').forEach((node) => {
      const el = node as HTMLElement;
      if (el.closest('[data-demo-modal="true"]')) return;

      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') {
        el.remove();
      }
    });

    // Also remove random fixed launchers (same rule: not inside modal)
    const candidates = document.querySelectorAll(
      '[class*="vapi"], [id*="vapi"], [data-vapi], [class*="Vapi"], [id*="Vapi"]'
    );

    candidates.forEach((node) => {
      const el = node as HTMLElement;
      if (el.closest('[data-demo-modal="true"]')) return;

      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') {
        el.remove();
      }
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

  // Fetch record
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
  }, [targetSlug]);

  // Realtime updates so changes in Supabase update the page
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetSlug]);

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
      <header className="px-6 py-6">
        <Link to="/" className="flex items-center text-gray-400 hover:text-white">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back
        </Link>
      </header>

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

                  <button
                    className="mt-8 w-32 h-32 rounded-full bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition"
                    onClick={() => {
                      try {
                        vapiRef.current?.stop();
                      } catch {}
                      setVoiceStatus('ended');
                    }}
                  >
                    End
                  </button>
                </div>
              ) : (
                <div className="min-h-[420px]">
                  <h3 className="text-xl font-bold mb-3 text-white">AI Chat Agent</h3>

                  {/* ✅ IMPORTANT: force a real height so the widget can render */}
                  <div className="h-[520px] border border-gray-700/60 rounded-xl bg-black/40 overflow-hidden">
                    {/* ✅ Official Vapi widget web component */}
                    <vapi-widget
                      public-key={VAPI_PUBLIC_KEY}
                      assistant-id={demoPage.assistant_id}
                      mode="chat"
                      theme="dark"
                      size="full"
                      style={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                      } as any}
                    ></vapi-widget>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Chat is powered directly by Vapi (no Supabase Edge Function).
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