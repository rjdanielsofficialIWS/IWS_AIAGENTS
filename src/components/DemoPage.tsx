import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../services/vapiAI";

const PUBLIC_KEY = "ebb2120b-ac56-4ce9-b1d5-17966931c665";

declare global {
  interface Window {
    vapiSDK?: any;
  }
  namespace JSX {
    interface IntrinsicElements {
      "vapi-widget": any;
    }
  }
}

type VisitorRow = {
  id: string;
  name: string | null;
  assistant_id: string | null;
  system_prompt: string | null;
  first_message: string | null;
};

const normalizeRouteName = (raw: string) => {
  const decoded = decodeURIComponent(raw);
  return decoded.replace(/[-_]+/g, " ").trim();
};

export function DemoPage() {
  const params = useParams();
  const routeName = useMemo(() => {
    const raw = params?.name;
    return raw ? normalizeRouteName(raw) : null;
  }, [params]);

  const [row, setRow] = useState<VisitorRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [voiceVapi, setVoiceVapi] = useState<any>(null);
  const [chatWidgetReady, setChatWidgetReady] = useState(false);

  // Load Vapi Web SDK for voice calls
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@vapi-ai/web@2.3.11/dist/index.umd.min.js";
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

  // Load Vapi chat widget script once
  useEffect(() => {
    const id = "vapi-widget-script";
    if (document.getElementById(id)) {
      setChatWidgetReady(true);
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src =
      "https://unpkg.com/@vapi-ai/client-sdk-react/dist/embed/widget.umd.js";
    script.async = true;
    script.onload = () => setChatWidgetReady(true);
    script.onerror = () => setChatWidgetReady(false);
    document.body.appendChild(script);
  }, []);

  // Fetch the visitor record based on /:name
  useEffect(() => {
    const run = async () => {
      setLoading(true);

      try {
        // 1) If we have /:name, try exact-ish match first (case-insensitive)
        if (routeName) {
          const { data, error } = await supabase
            .from("visitors")
            .select("id, name, assistant_id, system_prompt, first_message")
            .ilike("name", routeName)
            .limit(1)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            setRow(data as VisitorRow);
            setLoading(false);
            return;
          }
        }

        // 2) Fallback to your "Default Visitor" row if present
        const { data: defaultData, error: defaultError } = await supabase
          .from("visitors")
          .select("id, name, assistant_id, system_prompt, first_message")
          .ilike("name", "Default Visitor")
          .limit(1)
          .maybeSingle();

        if (defaultError) throw defaultError;

        if (defaultData) {
          setRow(defaultData as VisitorRow);
          setLoading(false);
          return;
        }

        // 3) Final fallback: first record
        const { data: firstData, error: firstError } = await supabase
          .from("visitors")
          .select("id, name, assistant_id, system_prompt, first_message")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstError) throw firstError;

        setRow((firstData as VisitorRow) ?? null);
      } catch (e) {
        console.error("Supabase read failed (likely RLS):", e);
        setRow(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [routeName]);

  const name = row?.name?.trim() || "Visitor";
  const assistantId = row?.assistant_id?.trim() || "";
  const systemPrompt = row?.system_prompt || "";
  const firstMessage = row?.first_message || "";

  const handleCallMe = () => {
    if (!voiceVapi) {
      alert("Voice is still loading. Try again in a second.");
      return;
    }
    if (!assistantId) {
      alert("No assistant_id found for this visitor record.");
      return;
    }

    // Start Vapi voice call using the assistant + overrides
    voiceVapi.start(assistantId, {
      firstMessage: firstMessage || undefined,
      model: systemPrompt
        ? { messages: [{ role: "system", content: systemPrompt }] }
        : undefined,
      variableValues: {
        name,
        system: systemPrompt,
        firstMessage,
      },
    });
  };

  const handleTextMe = () => {
    if (!assistantId) {
      alert("No assistant_id found for this visitor record.");
      return;
    }
    if (!chatWidgetReady) {
      alert("Chat widget is still loading. Try again in a second.");
      return;
    }

    // Attempt to open widget programmatically (best effort)
    const widget = document.querySelector("vapi-widget") as any;
    if (!widget) {
      alert("Chat widget failed to initialize.");
      return;
    }

    try {
      const launcher = widget.shadowRoot?.querySelector("button");
      launcher?.click();
    } catch {
      // User can click the floating widget manually if this fails
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
      {/* Vapi chat widget */}
      <vapi-widget
        public-key={PUBLIC_KEY}
        assistant-id={assistantId}
        mode="chat"
        theme="dark"
        size="full"
        assistant-overrides={JSON.stringify({
          variableValues: {
            name,
            system: systemPrompt,
            firstMessage,
          },
        })}
      ></vapi-widget>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center space-y-12">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              Hey {name},
            </h1>

            <h2 className="text-3xl md:text-4xl font-semibold text-gray-300">
              I built a tool that answers your customer calls for you.
            </h2>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              It's an AI voice assistant that talks to your customers on the
              phone, answers their questions, and helps them get what they need
              — automatically.
            </p>
          </div>

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

          {/* Helpful debug line (remove later if you want) */}
          {!assistantId && (
            <p className="text-sm text-red-400">
              No assistant_id loaded. This usually means your Supabase SELECT is
              blocked by RLS or the row is missing assistant_id.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}