import React, { useState, useEffect } from 'react';
import { supabase } from '../services/vapiAI';

// Update these variables:
// <public_key> = {{YOUR_VAPI_PUBLIC_KEY}}
// <assistant_ID> = {{YOUR_ASSISTANT_ID}}
//
// Note: Update only the specified variables in the provided webpage code,
// ensuring that no other parts of the code, including structure, content, or functionality, are modified.

const PUBLIC_KEY = 'ebb2120b-ac56-4ce9-b1d5-17966931c665';

declare global {
  interface Window {
    vapiSDK?: any;
  }
}

export function DemoPage() {
  const [assistantId, setAssistantId] = useState<string>('{{YOUR_ASSISTANT_ID}}');
  const [loading, setLoading] = useState(true);
  const [vapiInstance, setVapiInstance] = useState<any>(null);

  useEffect(() => {
    // Load Vapi SDK
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@2.3.11/dist/index.umd.min.js';
    script.async = true;
    script.onload = () => {
      if (window.vapiSDK) {
        const vapi = new window.vapiSDK.default(PUBLIC_KEY);
        setVapiInstance(vapi);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    fetchVisitorData();
  }, []);

  const fetchVisitorData = async () => {
    try {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;

      if (data && data.assistant_id) {
        setAssistantId(data.assistant_id);
      }
    } catch (error) {
      console.error('Error fetching visitor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallMe = () => {
    if (!vapiInstance) {
      alert('Vapi SDK is still loading. Please try again in a moment.');
      return;
    }

    if (assistantId === '{{YOUR_ASSISTANT_ID}}') {
      alert('Please configure your assistant ID in the database.');
      return;
    }

    vapiInstance.start(assistantId);
  };

  const handleTestInBrowser = () => {
    if (!vapiInstance) {
      alert('Vapi SDK is still loading. Please try again in a moment.');
      return;
    }

    if (assistantId === '{{YOUR_ASSISTANT_ID}}') {
      alert('Please configure your assistant ID in the database.');
      return;
    }

    vapiInstance.start(assistantId);
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
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center space-y-12">
          {/* Hero Section */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-white">
              Hey Visitor,
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
                onClick={handleTestInBrowser}
                className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-12 rounded-lg transition-all duration-300 transform hover:scale-105 text-lg border border-gray-600"
              >
                Test in Browser
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
