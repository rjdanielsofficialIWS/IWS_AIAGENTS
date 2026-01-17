import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader, AlertCircle, X } from 'lucide-react';
import { supabase } from '../services/vapiAI';

interface DemoPage {
  slug: string;
  assistant_id: string;
  system_prompt: string;
  first_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const VAPI_WIDGET_SRC = 'https://unpkg.com/@vapi-ai/client-sdk-react/dist/embed/widget.umd.js';
const VAPI_PUBLIC_KEY = 'ebb2120b-ac56-4ce9-b1d5-17966931c665';

type DemoMode = 'voice' | 'chat' | null;

export function DynamicDemoPage() {
  const { slug } = useParams<{ slug: string }>();
  const targetSlug = useMemo(() => (slug || 'demo').trim(), [slug]);

  const [demoPage, setDemoPage] = useState<DemoPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openMode, setOpenMode] = useState<DemoMode>(null);

  const voiceMountRef = useRef<HTMLDivElement>(null);
  const chatMountRef = useRef<HTMLDivElement>(null);

  const renderWidget = (code: string, containerRef: React.RefObject<HTMLDivElement>) => {
    if (!containerRef.current || !code.trim()) return;

    containerRef.current.innerHTML = code;

    // Force <script> execution (same technique as your DemoPage.tsx)
    const scripts = containerRef.current.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.textContent) newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  };

  // Removes any Vapi widgets that are NOT our embedded modal widgets (kills bottom-right launcher)
  const removeNonEmbeddedVapiWidgets = () => {
    const voiceContainer = voiceMountRef.current;
    const chatContainer = chatMountRef.current;

    const embedded = new Set<HTMLElement>();
    if (voiceContainer) voiceContainer.querySelectorAll('vapi-widget').forEach((el) => embedded.add(el as HTMLElement));
    if (chatContainer) chatContainer.querySelectorAll('vapi-widget').forEach((el) => embedded.add(el as HTMLElement));

    document.querySelectorAll('vapi-widget').forEach((el) => {
      if (!embedded.has(el as HTMLElement)) el.remove();
    });

    const possible = document.querySelectorAll(
      '[class*="vapi"][class*="launcher"], [class*="Vapi"][class*="launcher"], [data-vapi], [id*="vapi"]'
    );
    possible.forEach((node) => {
      const insideVoice = voiceContainer ? voiceContainer.contains(node) : false;
      const insideChat = chatContainer ? chatContainer.contains(node) : false;
      if (!insideVoice && !insideChat) {
        const style = window.getComputedStyle(node as Element);
        if (style.position === 'fixed') (node as HTMLElement).remove();
      }
    });
  };

  // Extra CSS guard: hide any fixed Vapi launcher/bubble on demo pages
  useEffect(() => {
    const style = document.createElement('style');
    style.setAttribute('data-demo-vapi-guard', 'true');
    style.textContent = `
      body [style*="position: fixed"][class*="vapi"],
      body [class*="vapi"][class*="launcher"],
      body [class*="Vapi"][class*="launcher"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Fetch record for slug
  useEffect(() => {
    let isMounted = true;

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
          if (!isMounted) return;
          setDemoPage(null);
          setError(`Demo page "${targetSlug}" not found`);
          return;
        }

        if (!isMounted) return;
        setDemoPage(data);
      } catch (err) {
        console.error('Error fetching demo page:', err);
        if (!isMounted) return;
        setDemoPage(null);
        setError('Failed to load demo page');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    fetchDemoPage();
    return () => {
      isMounted = false;
    };
  }, [targetSlug]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`demo_pages:${targetSlug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demo_pages', filter: `slug=eq.${targetSlug}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setDemoPage(null);
            setError(`Demo page "${targetSlug}" not found`);
            return;
          }

          const next = payload.new as DemoPage | null;
          if (!next || !next.is_active) {
            setDemoPage(null);
            setError(`Demo page "${targetSlug}" does not exist or is not active.`);
            return;
          }

          setError(null);
          setDemoPage(next);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetSlug]);

  // Auto-open the widget UI inside the modal (so you don’t see the pill button)
  const autoOpenWidget = (container: HTMLDivElement | null) => {
    if (!container) return;

    const deepQuery = (root: Document | ShadowRoot | HTMLElement, selectors: string[]) => {
      for (const sel of selectors) {
        const el = (root as any).querySelector?.(sel);
        if (el) return el as HTMLElement;
      }
      return null;
    };

    const tryOpen = () => {
      // Light DOM attempt
      const light = deepQuery(container, ['button', '[role="button"]', 'a', 'vapi-widget']);
      if (light) {
        light.click();
        return true;
      }

      // Shadow DOM attempt (if open)
      const widget = container.querySelector('vapi-widget') as any;
      if (widget?.shadowRoot) {
        const shadowBtn = deepQuery(widget.shadowRoot, [
          'button',
          '[role="button"]',
          'div[role="button"]',
          'span[role="button"]',
        ]);
        if (shadowBtn) {
          shadowBtn.click();
          return true;
        }
      }

      return false;
    };

    const timers = [120, 280, 520, 900, 1400].map((ms) =>
      window.setTimeout(() => {
        tryOpen();
      }, ms)
    );

    return () => timers.forEach((t) => window.clearTimeout(t));
  };

  // Build widgets when modal opens
  useEffect(() => {
    if (!demoPage) return;

    if (voiceMountRef.current) voiceMountRef.current.innerHTML = '';
    if (chatMountRef.current) chatMountRef.current.innerHTML = '';

    if (!openMode) return;

    const assistantId = demoPage.assistant_id;
    const firstMessage = (demoPage.first_message || '').replace(/"/g, '&quot;');

    const commonAttrs = `
      public-key="${VAPI_PUBLIC_KEY}"
      assistant-id="${assistantId}"
      theme="dark"
      base-bg-color="#000000"
      accent-color="#b8860b"
      cta-button-color="#b8860b"
      cta-button-text-color="#000000"
      border-radius="large"
      size="compact"
      position="inline"
      chat-first-message="${firstMessage}"
      chat-placeholder="Type your message..."
      consent-required="false"
    `;

    const voiceCode = `
      <div style="width:100%; display:flex; justify-content:center;">
        <div style="width:100%; max-width:440px; overflow:hidden; border-radius:16px;">
          <vapi-widget
            ${commonAttrs}
            mode="voice"
            title="AI Voice Agent"
            start-button-text="Start"
            end-button-text="End Call"
            cta-subtitle="Tap to speak.."
            voice-show-transcript="true"
          ></vapi-widget>
        </div>
      </div>
      <script src="${VAPI_WIDGET_SRC}" async type="text/javascript"></script>
    `;

    const chatCode = `
      <div style="width:100%; display:flex; justify-content:center;">
        <div style="width:100%; max-width:440px; overflow:hidden; border-radius:16px;">
          <vapi-widget
            ${commonAttrs}
            mode="chat"
            title="AI Chat Agent"
            start-button-text="Start"
            end-button-text="End"
            cta-subtitle="Tap to chat.."
          ></vapi-widget>
        </div>
      </div>
      <script src="${VAPI_WIDGET_SRC}" async type="text/javascript"></script>
    `;

    if (openMode === 'voice') renderWidget(voiceCode, voiceMountRef);
    if (openMode === 'chat') renderWidget(chatCode, chatMountRef);

    // Kill any floating launcher that sneaks in
    const t1 = window.setTimeout(removeNonEmbeddedVapiWidgets, 200);
    const t2 = window.setTimeout(removeNonEmbeddedVapiWidgets, 800);
    const t3 = window.setTimeout(removeNonEmbeddedVapiWidgets, 1600);

    // ✅ Auto-open UI
    const cleanupAuto =
      openMode === 'voice' ? autoOpenWidget(voiceMountRef.current) : autoOpenWidget(chatMountRef.current);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      if (typeof cleanupAuto === 'function') cleanupAuto();
    };
  }, [openMode, demoPage]);

  // Close modal with ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMode(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-yellow-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading demo...</p>
        </div>
      </div>
    );
  }

  if (error || !demoPage) {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="py-6 px-4 border-b border-gray-800">
          <div className="max-w-6xl mx-auto">
            <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-gray-200">
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </Link>
          </div>
        </header>

        <section className="py-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-red-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-12 w-12 text-red-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Demo Page Not Found</h2>
            <p className="text-xl text-gray-300 mb-8">{error}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Return to Home</span>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const niceSlug = demoPage.slug
    ? demoPage.slug.charAt(0).toUpperCase() + demoPage.slug.slice(1)
    : 'Demo';

  return (
    <div className="min-h-screen text-white overflow-x-hidden bg-[radial-gradient(1200px_700px_at_50%_-200px,rgba(255,215,0,0.10),transparent_60%),linear-gradient(to_bottom,#2a2a2a_0%,#0b0b0b_45%,#000_100%)]">
      <header className="py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200">
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
        </div>
      </header>

      <main className="px-4 pb-16">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mt-6">
            Hey{' '}
            <span className="text-yellow-400 drop-shadow-[0_0_20px_rgba(255,215,0,0.10)]">
              {niceSlug}
            </span>
            ,
          </h1>

          <div className="mt-4 h-1 w-24 rounded-full bg-yellow-400/80" />

          <p className="mt-8 text-xl sm:text-2xl text-gray-200">
            I built a tool that{' '}
            <span className="text-yellow-400 font-semibold">answers your customer calls</span> for you.
          </p>

          <div className="mt-10 w-full max-w-3xl rounded-2xl border border-gray-800 bg-gradient-to-b from-zinc-900/40 to-zinc-950/40 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.45)] px-6 sm:px-10 py-8">
            <p className="text-lg sm:text-xl text-gray-200 leading-relaxed">
              It&apos;s a robot that talks to your customers on the phone, answers their questions, and helps them get what
              they need — automatically.
            </p>
          </div>

          <p className="mt-12 text-xl sm:text-2xl font-semibold text-gray-200">
            Choose how you&apos;d like to try it:
          </p>

          <div className="mt-8 w-full max-w-2xl flex flex-row gap-4 justify-center">
            <button
              onClick={() => setOpenMode('voice')}
              className="flex-1 rounded-2xl bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-6 shadow-[0_16px_40px_rgba(255,215,0,0.12)] transition-transform active:scale-[0.99]"
            >
              Call Me
            </button>

            <button
              onClick={() => setOpenMode('chat')}
              className="flex-1 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-yellow-400 border border-yellow-400/40 font-bold py-4 px-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition-transform active:scale-[0.99]"
            >
              Text Me
            </button>
          </div>
        </div>
      </main>

      {openMode && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpenMode(null);
          }}
        >
          <div className="w-full max-w-[560px] rounded-2xl border border-gray-800 bg-gradient-to-b from-zinc-900/70 to-black/70 shadow-[0_30px_120px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div className="text-sm font-semibold text-gray-200">
                {openMode === 'voice' ? 'Call Me' : 'Text Me'}
              </div>
              <button
                onClick={() => setOpenMode(null)}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              {openMode === 'voice' && (
                <div className="min-h-[520px] flex items-start justify-center">
                  <div ref={voiceMountRef} className="w-full flex justify-center" />
                </div>
              )}

              {openMode === 'chat' && (
                <div className="min-h-[520px] flex items-start justify-center">
                  <div ref={chatMountRef} className="w-full flex justify-center" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}