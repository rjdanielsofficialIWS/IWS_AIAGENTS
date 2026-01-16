import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/vapiAI';

// Update these variables:
// <public_key> = {{YOUR_VAPI_PUBLIC_KEY}}
// <assistant_ID> = {{YOUR_ASSISTANT_ID}}
//
// Note: Update only the specified variables in the provided webpage code,
// ensuring that no other parts of the code, including structure, content, or functionality, are modified.

const PUBLIC_KEY = 'ebb2120b-ac56-4ce9-b1d5-17966931c665';

const normalizeRouteName = (raw: string) => {
  const decoded = decodeURIComponent(raw);
  // Common patterns people type:
  //  - /John-Doe  -> "John Doe"
  //  - /john_doe  -> "john doe"
  //  - /John%20Doe -> "John Doe"
  return decoded.replace(/[-_]+/g, ' ').trim();
};

declare global {
  interface Window {
    vapiSDK?: any;
  }

  // TSX support for custom element
  namespace JSX {
    interface IntrinsicElements {
      'vapi-widget': any;
    }
  }
}

interface VisitorData {
  name: string;
  assistant_id: string;
  system_prompt: string;
  first_message: string;
}

export function DemoPage() {
  const params = useParams();
  const routeName = useMemo(() => {
    const raw = params?.name;
    return raw ? normalizeRouteName(raw) : null;
  }, [params]);

  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voiceVapi, setVoiceVapi] = useState<any>(null);
  const [chatWidgetReady, setChatWidgetReady] = useState(false);

  useEffect(() => {
    // Load Vapi SDK (for web voice calls)
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@2.3.11/dist/index.umd.min.js';
    script.async = true;
    script.onload = () => {
      if (window.vapiSDK) {
        const voiceInstance = new window.vapiSDK.default(PUBLIC_KEY);
        setVoiceVapi(voiceInstance);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    fetchVisitorData();
  }, [routeName]);

  const fetchVisitorData = async () => {
    try {
      const query = supabase
        .from('visitors')
        .select('name, assistant_id, system_prompt, first_message');

      // If visiting /:name, load the matching record.
      // Otherwise, fall back to the first record (your default demo visitor).
      const { data, error } = routeName
        ? await query.ilike('name', routeName).limit(1).maybeSingle()
        : await query.limit(1).single();

      if (error) throw error;

      // If /:name doesn't exist, fall back to the first record.
      const resolved = data
        ? data
        : (await query.limit(1).single()).data;

      if (resolved) {
        setVisitorData({
          name: resolved.name || 'Visitor',
          assistant_id: resolved.assistant_id,
          system_prompt: resolved.system_prompt,
          first_message: resolved.first_message,
        });
      }
    } catch (error) {
      console.error('Error fetching visitor data:', error);
      setVisitorData({
        name: 'Visitor',
        assistant_id: '{{YOUR_ASSISTANT_ID}}',
        system_prompt: '',
        first_message: '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load the Web Widget (chat UI)
    const id = 'vapi-widget-script';
    if (document.getElementById(id)) {
      setChatWidgetReady(true);
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = 'https://unpkg.com/@vapi-ai/client-sdk-react/dist/embed/widget.umd.js';
    script.async = true;
    script.onload = () => setChatWidgetReady(true);
    script.onerror = () => setChatWidgetReady(false);
    document.body.appendChild(script);

    return () => {
      // Keep the widget script around so navigation between /:name routes doesn't reload it.
    };
  }, []);

  const handleCallMe = () => {
    if (!voiceVapi) {
      alert('Vapi SDK is still loading. Please try again in a moment.');
      return;
    }

    if (!visitorData || visitorData.assistant_id === '{{YOUR_ASSISTANT_ID}}') {
      alert('Please configure your assistant ID in the database.');
      return;
    }

    const assistantOverrides: Record<string, any> = {
      firstMessage: visitorData.first_message || undefined,
      model: visitorData.system_prompt
        ? {
            messages: [{ role: 'system', content: visitorData.system_prompt }],
          }
        : undefined,
      // Handy for agents that use variables inside prompts / firstMessage.
      variableValues: {
        name: visitorData.name || 'Visitor',
      },
    };

    voiceVapi.start(visitorData.assistant_id, assistantOverrides);
  };

  const handleTextMe = () => {
    if (!visitorData || visitorData.assistant_id === '{{YOUR_ASSISTANT_ID}}') {
      alert('Please configure your assistant ID in the database.');
      return;
    }

    if (!chatWidgetReady) {
      alert('Chat widget is still loading. Please try again in a moment.');
      return;
    }

    // Try to programmatically open the widget.
    // This is intentionally defensive because the widget renders inside a shadow DOM.
    const widget = document.querySelector('vapi-widget') as any;
    if (!widget) {
      alert('Chat widget failed to initialize.');
      return;
    }

    try {
      // Most versions expose a clickable launcher button in shadow DOM.
      const launcher = widget.shadowRoot?.querySelector('button');
      launcher?.click();
    } catch {
      // If we can't open it programmatically, the user can still click the floating widget.
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Vapi Web Widget (Chat). Renders as a floating button; we open it via "Text Me". */}
      <vapi-widget
        public-key={PUBLIC_KEY}
        assistant-id={visitorData?.assistant_id || ''}
        mode="chat"
        theme="dark"
        size="full"
        assistant-overrides={JSON.stringify({
          variableValues: {
            name: visitorData?.name || 'Visitor',
            // Use these as {{system}} and {{firstMessage}} variables inside your Vapi assistant
            // so the widget can be fully driven by the Supabase record.
            system: visitorData?.system_prompt || '',
            firstMessage: visitorData?.first_message || '',
          },
        })}
      ></vapi-widget>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center space-y-12">
          {/* Hero Section */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              Hey {visitorData?.name || 'Visitor'},
            </h1>

            <h2 className="text-3xl md:text-4xl font-semibold text-gray-300">
              I built a tool that answers your customer calls for you.
            </h2>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              It's an AI voice assistant that talks to your customers on the phone,
              answers their questions, and helps them get what they need — automatically.
            </p>
          </div>

          {/* CTA Section */}
          <div className="space-y-8 pt-12">
            <p className="text-2xl text-gray-300 font-medium">
              Choose how you'd like to try it:
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button
                onClick={handleCallMe}
                className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-4 px-12 rounded-lg transition-all duration-300 transform hover:scale-105 text-lg shadow-lg shadow-yellow-500/20"
              >
                Call Me
              </button>

              <button
                onClick={handleTextMe}
                className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-12 rounded-lg transition-all duration-300 transform hover:scale-105 text-lg border border-gray-600"
              >
                Text Me
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}