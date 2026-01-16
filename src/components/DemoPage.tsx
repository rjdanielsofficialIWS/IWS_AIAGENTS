import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

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

const normalizeRouteName = (raw: string) => {
  const decoded = decodeURIComponent(raw);
  return decoded.replace(/[-_]+/g, " ").trim();
};

export function DemoPage() {
  const params = useParams();

  const visitorName = useMemo(() => {
    const raw = params?.name;
    if (!raw) return "Visitor";
    const n = normalizeRouteName(raw);
    return n || "Visitor";
  }, [params]);

  const [voiceVapi, setVoiceVapi] = useState<any>(null);

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

  const handleCallMe = () => {
    alert(
      `Call button works. Now we just need to decide which assistant ID should be used for "${visitorName}".`
    );
  };

  const handleTextMe = () => {
    // Opens the widget if possible (best effort)
    const widget = document.querySelector("vapi-widget") as any;
    if (!widget) {
      alert("Chat widget failed to initialize.");
      return;
    }
    try {
      const launcher = widget.shadowRoot?.querySelector("button");
      launcher?.click();
    } catch {
      // user can click the floating widget manually
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <vapi-widget
        public-key={PUBLIC_KEY}
        assistant-id=""   // <-- We can plug in a real assistant id later
        mode="chat"
        theme="dark"
        size="full"
        assistant-overrides={JSON.stringify({
          variableValues: { name: visitorName },
        })}
      ></vapi-widget>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center space-y-12">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              Hey {visitorName},
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

            <p className="text-sm text-gray-500">
              Current URL visitor: <span className="text-gray-300">{visitorName}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}