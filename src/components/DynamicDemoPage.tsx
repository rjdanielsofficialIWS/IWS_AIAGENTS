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

export function DynamicDemoPage() {
  const { slug } = useParams<{ slug: string }>();

  const [demoPage, setDemoPage] = useState<DemoPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const widgetRef = useRef<HTMLDivElement>(null);

  // Normalize slug from URL (fixes casing + whitespace issues)
  const targetSlug = useMemo(() => {
    return (slug || 'demo').trim().toLowerCase();
  }, [slug]);

  // Block reserved routes so nobody can accidentally create demo pages that conflict with real pages
  const reservedSlugs = useMemo(
    () =>
      new Set([
        '',
        'demos',
        'onboarding-booking',
        'privacy-policy',
        'login',
        'register',
        'dashboard',
      ]),
    []
  );

  const ensureVapiWidgetScriptLoaded = () => {
    const SCRIPT_ID = 'vapi-widget-script';

    return new Promise<void>((resolve, reject) => {
      if (document.getElementById(SCRIPT_ID)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://unpkg.com/@vapi-ai/client-sdk-react/dist/embed/widget.umd.js';
      script.async = true;
      script.type = 'text/javascript';

      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Vapi widget script'));

      document.body.appendChild(script);
    });
  };

  const renderWidget = async (page: DemoPage) => {
    if (!widgetRef.current) return;

    // Prevent duplicate widgets on updates
    widgetRef.current.innerHTML = '';

    try {
      await ensureVapiWidgetScriptLoaded();
    } catch (e) {
      console.error(e);
      return;
    }

    const widget = document.createElement('vapi-widget');
    widget.setAttribute('public-key', '4481e2b6-4294-4cac-8a20-54d51f2e24dc');
    widget.setAttribute('assistant-id', page.assistant_id);
    widget.setAttribute('mode', 'voice');
    widget.setAttribute('theme', 'dark');
    widget.setAttribute('base-bg-color', '#000000');
    widget.setAttribute('accent-color', '#007510');
    widget.setAttribute('cta-button-color', '#c7a317');
    widget.setAttribute('cta-button-text-color', '#000000');
    widget.setAttribute('border-radius', 'medium');
    widget.setAttribute('size', 'compact');
    widget.setAttribute('position', 'bottom-right');
    widget.setAttribute('title', 'AI Voice Agent');
    widget.setAttribute('start-button-text', 'Start');
    widget.setAttribute('end-button-text', 'End Call');
    widget.setAttribute('cta-subtitle', 'Tap to speak..');
    widget.setAttribute('chat-first-message', page.first_message || '');
    widget.setAttribute('chat-placeholder', 'Type your message...');
    widget.setAttribute('voice-show-transcript', 'true');
    widget.setAttribute('consent-required', 'false');

    widgetRef.current.appendChild(widget);
  };

  const fetchDemoPage = async () => {
    try {
      setLoading(true);
      setError(null);

      if (reservedSlugs.has(targetSlug)) {
        setDemoPage(null);
        setError(`"${targetSlug}" is a reserved route and can't be used as a demo page slug.`);
        return;
      }

      // ✅ IMPORTANT FIX:
      // Use ilike() so "John" in DB will match "/john" in URL (case-insensitive)
      const { data, error: fetchError } = await supabase
        .from('demo_pages')
        .select('*')
        .ilike('slug', targetSlug)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setDemoPage(null);
        setError(`Demo page "${targetSlug}" not found`);
        return;
      }

      setDemoPage(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching demo page:', err);
      setDemoPage(null);
      setError('Failed to load demo page');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on slug change
  useEffect(() => {
    void fetchDemoPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSlug]);

  // Render widget when demoPage changes
  useEffect(() => {
    if (!demoPage) return;
    void renderWidget(demoPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoPage?.assistant_id, demoPage?.first_message, demoPage?.system_prompt]);

  // ✅ REALTIME FIX:
  // We subscribe to demo_pages changes WITHOUT slug filter,
  // then match by lowercasing payload slug. This works even if DB slug is "John".
  useEffect(() => {
    if (reservedSlugs.has(targetSlug)) return;

    const channel = supabase
      .channel(`demo_pages:watch:${targetSlug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demo_pages' },
        (payload) => {
          const newRow = (payload.new ?? null) as DemoPage | null;

          // If row is gone / deleted etc
          if (!newRow) return;

          const incomingSlug = (newRow.slug || '').trim().toLowerCase();
          if (incomingSlug !== targetSlug) return;

          // If it becomes inactive, show not found
          if (newRow.is_active !== true) {
            setDemoPage(null);
            setError(`Demo page "${targetSlug}" not found`);
            return;
          }

          setError(null);
          setDemoPage(newRow);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetSlug, reservedSlugs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-x-hidden flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-yellow-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading demo page...</p>
        </div>
      </div>
    );
  }

  if (error || !demoPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-x-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-full animate-pulse"></div>
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-yellow-400/5 to-transparent rounded-full animate-pulse delay-1000"></div>
        </div>

        <header className="relative z-10 py-8 px-4 sm:px-6 lg:px-8 border-b border-gray-800">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <Link
                to="/"
                className="flex items-center space-x-2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Home</span>
              </Link>
            </div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-yellow-400/5 to-transparent rounded-full animate-pulse delay-1000"></div>
      </div>

      <header className="relative z-10 py-8 px-4 sm:px-6 lg:px-8 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center space-x-2 text-gray-400 hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Home</span>
            </Link>

            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
              Experience Our AI Agent
            </h1>

            <div className="w-24" />
          </div>
        </div>
      </header>

      <section className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Try Our{' '}
              <span className="bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
                AI Agent Live
              </span>
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              This page updates live when you edit the matching record in Supabase.
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
            {demoPage.system_prompt && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-300 mb-2">Assistant Configuration</h3>
                <p className="text-sm text-gray-300">{demoPage.system_prompt}</p>
              </div>
            )}

            <div ref={widgetRef} className="min-h-[200px]" />
          </div>

          <div className="text-center mt-12">
            <p className="text-lg text-gray-300 mb-6">
              Impressed with what you've seen? Let's build a custom solution for your business.
            </p>
            <a
              href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-3 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/25"
            >
              <span>Schedule a Consultation</span>
            </a>
          </div>
        </div>
      </section>

      <footer className="relative z-10 py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400 text-sm">
            © 2024 Infinite Wealth Solutions. Transforming businesses with premium digital solutions.
          </p>
        </div>
      </footer>
    </div>
  );
}