import React from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/vapiAI';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'vapi-widget': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'public-key'?: string;
        'assistant-id'?: string;
        mode?: string;
        theme?: string;
        size?: string;
        'assistant-overrides'?: string;
        'empty-chat-message'?: string;
        'empty-voice-message'?: string;
      };
    }
  }
}

type VisitorRow = {
  id?: string;
  name: string | null;
  assistant_id: string | null;
  system_prompt: string | null;
  first_message: string | null;
};

function normalizeUrlName(raw: string) {
  const decoded = decodeURIComponent(raw).trim();

  // Turn "CaliforniaPlumbing" into "California Plumbing"
  const withSpaces = decoded.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Normalize dashes/underscores into spaces
  const cleaned = withSpaces.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Build a fuzzy ilike pattern: "%California%Plumbing%"
  const parts = cleaned.split(' ').filter(Boolean);
  const ilikePattern = `%${parts.join('%')}%`;

  return { decoded, cleaned, ilikePattern };
}

export function DemoPage() {
  const params = useParams<{ name?: string }>();
  const urlName = params.name;

  const VAPI_PUBLIC_KEY =
    (import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined) || '';

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [visitor, setVisitor] = React.useState<VisitorRow | null>(null);

  const [widgetMode, setWidgetMode] = React.useState<'chat' | 'voice'>('chat');
  const [autoOpenWidget, setAutoOpenWidget] = React.useState(false);
  const widgetRef = React.useRef<HTMLElement | null>(null);

  const assistantId = visitor?.assistant_id || '';

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        let data: VisitorRow | null = null;

        if (urlName) {
          const { ilikePattern } = normalizeUrlName(urlName);

          const res = await supabase
            .from('visitors')
            .select('id,name,assistant_id,system_prompt,first_message')
            .ilike('name', ilikePattern)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (res.error) throw res.error;
          data = (res.data as VisitorRow | null) ?? null;
        } else {
          // If no /:name, try a default row first, else just grab the newest row
          const resDefault = await supabase
            .from('visitors')
            .select('id,name,assistant_id,system_prompt,first_message')
            .eq('name', 'Default Visitor')
            .limit(1)
            .maybeSingle();

          if (resDefault.error) throw resDefault.error;

          data = (resDefault.data as VisitorRow | null) ?? null;

          if (!data) {
            const resNewest = await supabase
              .from('visitors')
              .select('id,name,assistant_id,system_prompt,first_message')
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (resNewest.error) throw resNewest.error;
            data = (resNewest.data as VisitorRow | null) ?? null;
          }
        }

        if (cancelled) return;

        setVisitor(data);

        // If you want: auto-switch to chat by default when page loads
        setWidgetMode('chat');
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load demo config from Supabase.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [urlName]);

  // Attempt to auto-open the widget after we switch modes
  React.useEffect(() => {
    if (!autoOpenWidget) return;
    if (!assistantId) return;

    const el = widgetRef.current;
    if (!el) return;

    const t = window.setTimeout(() => {
      try {
        // Try to click the widget's internal button (works in most builds)
        const anyEl = el as any;
        const shadow = anyEl.shadowRoot as ShadowRoot | undefined;
        const btn = shadow?.querySelector('button') as HTMLButtonElement | null;

        if (btn) {
          btn.click();
        } else {
          // fallback
          el.click();
        }
      } catch {
        // worst case: user clicks widget bubble manually
      } finally {
        setAutoOpenWidget(false);
      }
    }, 50);

    return () => window.clearTimeout(t);
  }, [autoOpenWidget, assistantId, widgetMode]);

  const displayName = visitor?.name || (urlName ? decodeURIComponent(urlName) : 'there');

  const firstMessage = visitor?.first_message || 'Hey! How can I help you today?';

  const assistantOverrides = JSON.stringify({
    variableValues: {
      visitor_name: displayName,
      system_prompt: visitor?.system_prompt || '',
      first_message: visitor?.first_message || '',
    },
  });

  const handleCall = () => {
    if (!assistantId) {
      alert(`No assistant_id loaded for "${urlName || 'this visitor'}". Add assistant_id in Supabase.`);
      return;
    }
    if (!VAPI_PUBLIC_KEY) {
      alert('Missing VITE_VAPI_PUBLIC_KEY env var.');
      return;
    }

    setWidgetMode('voice');
    setAutoOpenWidget(true);
  };

  const handleText = () => {
    if (!assistantId) {
      alert(`No assistant_id loaded for "${urlName || 'this visitor'}". Add assistant_id in Supabase.`);
      return;
    }
    if (!VAPI_PUBLIC_KEY) {
      alert('Missing VITE_VAPI_PUBLIC_KEY env var.');
      return;
    }

    setWidgetMode('chat');
    setAutoOpenWidget(true);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Hey {displayName},
          </h1>

          <p className="text-gray-300 text-lg md:text-xl mt-4">
            I built a tool that answers your customer calls for you.
          </p>

          <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
            It&apos;s an AI voice assistant that talks to your customers on the phone, answers their questions,
            and helps them get what they need — automatically.
          </p>

          <div className="mt-10">
            <p className="text-gray-400 mb-6">Choose how you&apos;d like to try it:</p>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleCall}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-8 py-3 rounded-xl transition"
              >
                Call Me
              </button>

              <button
                onClick={handleText}
                className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-8 py-3 rounded-xl transition border border-gray-700"
              >
                Text Me
              </button>
            </div>

            <div className="mt-6 text-sm text-gray-500">
              Current URL visitor: {urlName ? decodeURIComponent(urlName) : 'Default'}
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center text-gray-400">
            Loading visitor settings...
          </div>
        )}

        {!loading && error && (
          <div className="max-w-2xl mx-auto text-center bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-200">
            {error}
            <div className="mt-2 text-xs text-red-200/70">
              If you see ERR_NAME_NOT_RESOLVED, your VITE_SUPABASE_URL is wrong in Netlify.
            </div>
          </div>
        )}

        {!loading && !error && !assistantId && (
          <div className="max-w-2xl mx-auto text-center bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-200">
            No assistant_id found for this visitor. Add it in Supabase → <code className="text-yellow-100">public.visitors</code>.
          </div>
        )}
      </div>

      {/* Vapi Widget (dynamic mode) */}
      {assistantId && VAPI_PUBLIC_KEY && (
        <vapi-widget
          ref={(el) => {
            widgetRef.current = el;
          }}
          public-key={VAPI_PUBLIC_KEY}
          assistant-id={assistantId}
          mode={widgetMode}
          theme="dark"
          size="full"
          assistant-overrides={assistantOverrides}
          empty-chat-message={firstMessage}
          empty-voice-message={firstMessage}
        />
      )}
    </div>
  );
}