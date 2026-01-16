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

// ✅ Use the same script URL your project already uses (works reliably)
const VAPI_WIDGET_SRC = 'https://unpkg.com/@vapi-ai/client-sdk-react/dist/embed/widget.umd.js';

// ✅ Updated public key (your new one)
const VAPI_PUBLIC_KEY = 'ebb2120b-ac56-4ce9-b1d5-17966931c665';

export function DynamicDemoPage() {
  const { slug } = useParams<{ slug: string }>();
  const targetSlug = useMemo(() => (slug || 'demo').trim(), [slug]);

  const [demoPage, setDemoPage] = useState<DemoPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const voiceRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Inject HTML + force <script> tags to execute
  const renderWidget = (code: string, containerRef: React.RefObject<HTMLDivElement>) => {
    if (!containerRef.current || !code.trim()) return;

    containerRef.current.innerHTML = code;

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

  // Render TWO widgets (voice + chat), centered + NOT floating
  useEffect(() => {
    if (!demoPage) return;

    const assistantId = demoPage.assistant_id;
    const firstMessage = (demoPage.first_message || '').replace(/"/g, '&quot;');

    // 🔥 Key fix: force INLINE position + disable floating CTA behavior on demo pages
    // Different Vapi builds accept different attributes, but `position="inline"` + removing any "bottom-right" behavior
    // prevents that yellow “Try Our AI Phone Agent” bubble.
    const voiceCode = `
      <div class="w-full flex justify-center overflow-visible">
        <vapi-widget
          public-key="${VAPI_PUBLIC_KEY}"
          assistant-id="${assistantId}"
          mode="voice"
          position="inline"
          theme="dark"
          base-bg-color="#000000"
          accent-color="#007510"
          cta-button-color="#c7a317"
          cta-button-text-color="#000000"
          border-radius="large"
          size="compact"
          title="AI Voice Agent"
          start-button-text="Start"
          end-button-text="End Call"
          cta-subtitle="Tap to speak.."
          chat-first-message="${firstMessage}"
          chat-placeholder="Type your message..."
          voice-show-transcript="true"
          consent-required="false"
        ></vapi-widget>
      </div>
      <script src="${VAPI_WIDGET_SRC}" async type="text/javascript"></script>
    `;

    const chatCode = `
      <div class="w-full flex justify-center overflow-visible">
        <vapi-widget
          public-key="${VAPI_PUBLIC_KEY}"
          assistant-id="${assistantId}"
          mode="chat"
          position="inline"
          theme="dark"
          base-bg-color="#000000"
          accent-color="#007510"
          cta-button-color="#c7a317"
          cta-button-text-color="#000000"
          border-radius="large"
          size="compact"
          title="AI Chat Agent"
          start-button-text="Start"
          end-button-text="End"
          cta-subtitle="Tap to chat.."
          chat-first-message="${firstMessage}"
          chat-placeholder="Type your message..."
          voice-show-transcript="true"
          consent-required="false"
        ></vapi-widget>
      </div>
      <script src="${VAPI_WIDGET_SRC}" async type="text/javascript"></script>
    `;

    renderWidget(voiceCode, voiceRef);
    renderWidget(chatCode, chatRef);
  }, [demoPage]);

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
        <div className="max-w-6xl mx-auto">
          {/* Record preview */}
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
              </div>
            </div>
          </div>

          {/* ✅ Layout fix: give the widgets more room + allow overflow so nothing is clipped */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 overflow-visible">
              <h2 className="text-lg font-semibold mb-4">Voice</h2>
              <div className="w-full overflow-visible min-h-[520px] flex items-start justify-center">
                <div ref={voiceRef} className="w-full flex justify-center overflow-visible" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 overflow-visible">
              <h2 className="text-lg font-semibold mb-4">Chat</h2>
              <div className="w-full overflow-visible min-h-[520px] flex items-start justify-center">
                <div ref={chatRef} className="w-full flex justify-center overflow-visible" />
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