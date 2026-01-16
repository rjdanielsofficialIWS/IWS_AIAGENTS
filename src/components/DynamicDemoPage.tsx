import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader, AlertCircle } from 'lucide-react';
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

// Your Vapi Public Key
const VAPI_PUBLIC_KEY = '4481e2b6-4294-4cac-8a20-54d51f2e24dc';

// ✅ Correct Vapi WEB widget script (this registers <vapi-widget/>)
const VAPI_WIDGET_SRC = 'https://unpkg.com/@vapi-ai/web/dist/widget.js';

function ensureVapiWidgetScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already registered
    if (customElements.get('vapi-widget')) {
      resolve();
      return;
    }

    // Already injected
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${VAPI_WIDGET_SRC}"]`
    );
    if (existing) {
      // If it hasn't loaded yet, wait for load
      if ((existing as any)._vapiLoaded) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Vapi widget script')), {
          once: true,
        });
      }
      return;
    }

    // Inject script
    const script = document.createElement('script');
    script.src = VAPI_WIDGET_SRC;
    script.async = true;

    script.onload = () => {
      (script as any)._vapiLoaded = true;

      // Give the browser a tick to register the custom element
      requestAnimationFrame(() => {
        if (customElements.get('vapi-widget')) resolve();
        else reject(new Error('Vapi widget script loaded but <vapi-widget> was not registered.'));
      });
    };

    script.onerror = () => reject(new Error('Failed to load Vapi widget script'));
    document.body.appendChild(script);
  });
}

function createVapiWidgetEl(opts: {
  mode: 'voice' | 'chat';
  publicKey: string;
  assistantId: string;
  firstMessage?: string;
}) {
  const el = document.createElement('vapi-widget');

  el.setAttribute('public-key', opts.publicKey);
  el.setAttribute('assistant-id', opts.assistantId);
  el.setAttribute('mode', opts.mode);

  // Theme / styling
  el.setAttribute('theme', 'dark');
  el.setAttribute('base-bg-color', '#000000');
  el.setAttribute('accent-color', '#007510');
  el.setAttribute('cta-button-color', '#c7a317');
  el.setAttribute('cta-button-text-color', '#000000');
  el.setAttribute('border-radius', 'large');
  el.setAttribute('size', 'compact');

  // Try to prevent floating positioning
  el.setAttribute('position', 'inline');

  // Copy from DB
  if (opts.firstMessage) el.setAttribute('chat-first-message', opts.firstMessage);

  // Labels
  el.setAttribute('title', opts.mode === 'voice' ? 'Voice Demo' : 'Chat Demo');
  el.setAttribute('start-button-text', 'Start');
  el.setAttribute('end-button-text', 'End');
  el.setAttribute('cta-subtitle', opts.mode === 'voice' ? 'Tap to speak' : 'Tap to chat');
  el.setAttribute('chat-placeholder', 'Type your message...');
  el.setAttribute('voice-show-transcript', 'true');
  el.setAttribute('consent-required', 'false');

  return el;
}

export function DynamicDemoPage() {
  const { slug } = useParams<{ slug: string }>();
  const targetSlug = useMemo(() => (slug || 'demo').trim(), [slug]);

  const [demoPage, setDemoPage] = useState<DemoPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);

  const voiceMountRef = useRef<HTMLDivElement>(null);
  const chatMountRef = useRef<HTMLDivElement>(null);

  // Load Vapi script (once)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureVapiWidgetScript();
        if (!cancelled) {
          setWidgetReady(true);
          setWidgetError(null);
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setWidgetReady(false);
          setWidgetError(e?.message || 'Vapi widgets failed to initialize.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
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

  // Realtime updates (edits in DB update page live)
  useEffect(() => {
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

  // Render Voice + Chat widgets centered whenever demoPage changes AND widgets are ready
  useEffect(() => {
    if (!widgetReady) return;
    if (!demoPage) return;
    if (!voiceMountRef.current || !chatMountRef.current) return;

    // Clear mounts to prevent duplicates on updates
    voiceMountRef.current.innerHTML = '';
    chatMountRef.current.innerHTML = '';

    const firstMessage = (demoPage.first_message || '').toString();

    // Voice widget
    const voiceEl = createVapiWidgetEl({
      mode: 'voice',
      publicKey: VAPI_PUBLIC_KEY,
      assistantId: demoPage.assistant_id,
      firstMessage,
    });

    // Chat widget
    const chatEl = createVapiWidgetEl({
      mode: 'chat',
      publicKey: VAPI_PUBLIC_KEY,
      assistantId: demoPage.assistant_id,
      firstMessage,
    });

    voiceMountRef.current.appendChild(voiceEl);
    chatMountRef.current.appendChild(chatEl);
  }, [widgetReady, demoPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center px-4">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-yellow-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading demo page...</p>
        </div>
      </div>
    );
  }

  if (error || !demoPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
        <header className="py-8 px-4 sm:px-6 lg:px-8 border-b border-gray-800">
          <div className="max-w-6xl mx-auto">
            <Link to="/" className="flex items-center space-x-2 text-gray-400 hover:text-gray-300 transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </header>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
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
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-xl transition-all duration-300"
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-x-hidden">
      <header className="relative z-10 py-8 px-4 sm:px-6 lg:px-8 border-b border-gray-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 text-gray-400 hover:text-gray-300 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>

          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
              {demoPage.slug} Demo
            </h1>
            <p className="text-sm text-gray-400 mt-1">/{demoPage.slug}</p>
          </div>

          <div className="w-16" />
        </div>
      </header>

      <main className="relative z-10 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Record preview so you can confirm the correct row is being used */}
          <div className="mb-8 bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Assistant ID</div>
                <div className="text-sm text-gray-200 break-all">{demoPage.assistant_id}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">First Message</div>
                <div className="text-sm text-gray-200">{demoPage.first_message}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">System Prompt</div>
                <div className="text-sm text-gray-200 line-clamp-3">{demoPage.system_prompt}</div>
                <div className="text-xs text-gray-500 mt-2">
                  Note: system_prompt is displayed here, but Vapi behavior changes only if the assistant’s prompt is updated in Vapi.
                </div>
              </div>
            </div>

            {widgetError && (
              <div className="mt-6 p-4 border border-red-500/30 bg-red-500/10 rounded-xl text-sm text-red-200">
                {widgetError}
              </div>
            )}
          </div>

          {/* Centered widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Voice</h2>
              <div className="flex justify-center">
                <div ref={voiceMountRef} className="w-full flex justify-center" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Chat</h2>
              <div className="flex justify-center">
                <div ref={chatMountRef} className="w-full flex justify-center" />
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <a
              href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300"
            >
              Schedule a Consultation
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}