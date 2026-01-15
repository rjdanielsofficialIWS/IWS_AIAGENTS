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

interface VisitorData {
  name: string;
  assistant_id: string;
  system_prompt: string;
  first_message: string;
}

export function DemoPage() {
  const [visitorData, setVisitorData] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voiceVapi, setVoiceVapi] = useState<any>(null);
  const [chatVapi, setChatVapi] = useState<any>(null);

  useEffect(() => {
    // Load Vapi SDK
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@2.3.11/dist/index.umd.min.js';
    script.async = true;
    script.onload = () => {
      if (window.vapiSDK) {
        const voiceInstance = new window.vapiSDK.default(PUBLIC_KEY);
        const chatInstance = new window.vapiSDK.default(PUBLIC_KEY);
        setVoiceVapi(voiceInstance);
        setChatVapi(chatInstance);
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
        .select('name, assistant_id, system_prompt, first_message')
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setVisitorData({
          name: data.name || 'Visitor',
          assistant_id: data.assistant_id,
          system_prompt: data.system_prompt,
          first_message: data.first_message,
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

  const handleCallMe = () => {
    if (!voiceVapi) {
      alert('Vapi SDK is still loading. Please try again in a moment.');
      return;
    }

    if (!visitorData || visitorData.assistant_id === '{{YOUR_ASSISTANT_ID}}') {
      alert('Please configure your assistant ID in the database.');
      return;
    }

    voiceVapi.start(visitorData.assistant_id, {
      messageConversationHistory: [
        {
          role: 'assistant',
          message: visitorData.first_message,
        },
      ],
    });
  };

  const handleTextMe = () => {
    if (!chatVapi) {
      alert('Vapi SDK is still loading. Please try again in a moment.');
      return;
    }

    if (!visitorData || visitorData.assistant_id === '{{YOUR_ASSISTANT_ID}}') {
      alert('Please configure your assistant ID in the database.');
      return;
    }

    chatVapi.start(visitorData.assistant_id, {
      messageConversationHistory: [
        {
          role: 'assistant',
          message: visitorData.first_message,
        },
      ],
    });
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
