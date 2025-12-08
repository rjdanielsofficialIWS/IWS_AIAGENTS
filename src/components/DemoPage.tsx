import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageSquare, ArrowLeft } from 'lucide-react';

export function DemoPage() {
  const voiceCode = `<vapi-widget
  public-key="ebb2120b-ac56-4ce9-b1d5-17966931c665"
  assistant-id="41d53961-c2dc-4a1f-a8b4-4afa4eca62f9"
  mode="voice"
  theme="dark"
  base-bg-color="#000000"
  accent-color="#1da9e9"
  cta-button-color="#000000"
  cta-button-text-color="#ffffff"
  border-radius="medium"
  size="compact"
  position="top-right"
  title="AI Voice Agent"
  start-button-text="Start"
  end-button-text="End Call"
  cta-subtitle="Tap to speak.."
  chat-first-message="Hey Josh, hows it going?"
  chat-placeholder="Type your message..."
  voice-show-transcript="true"
  consent-required="false"
></vapi-widget>

<script src="https://unpkg.com/@vapi-ai/client-sdk-react/dist/embed/widget.umd.js" async type="text/javascript"></script>`;

  const chatCode = `<vapi-widget
  public-key="ebb2120b-ac56-4ce9-b1d5-17966931c665"
  assistant-id="41d53961-c2dc-4a1f-a8b4-4afa4eca62f9"
  mode="chat"
  theme="dark"
  base-bg-color="#000000"
  accent-color="#1da9e9"
  cta-button-color="#000000"
  cta-button-text-color="#ffffff"
  border-radius="medium"
  size="compact"
  position="top-right"
  title="AI Chat Agent"
  start-button-text="Start"
  end-button-text="End Call"
  cta-subtitle="Tap to chat.."
  chat-first-message="Hey, Josh hows it going?"
  chat-placeholder="Type your message..."
  voice-show-transcript="true"
  consent-required="false"
></vapi-widget>

<script src="https://unpkg.com/@vapi-ai/client-sdk-react/dist/embed/widget.umd.js" async type="text/javascript"></script>`;

  const voiceRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (voiceCode && voiceRef.current) {
      renderWidget(voiceCode, voiceRef);
    }
  }, [voiceCode]);

  useEffect(() => {
    if (chatCode && chatRef.current) {
      renderWidget(chatCode, chatRef);
    }
  }, [chatCode]);

  const renderWidget = (code: string, containerRef: React.RefObject<HTMLDivElement>) => {
    if (!containerRef.current || !code.trim()) return;

    containerRef.current.innerHTML = code;

    const scripts = containerRef.current.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.textContent) {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  };

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
              Experience Our AI Agents
            </h1>
            <div className="w-24"></div>
          </div>
        </div>
      </header>

      <section className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Try Our <span className="bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">AI Agents Live</span>
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Interact with our AI agents and see them in action instantly. No login required.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-yellow-400/10 w-16 h-16 rounded-xl flex items-center justify-center">
                  <Phone className="h-8 w-8 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Voice Agent</h3>
                  <p className="text-gray-400">AI phone assistant</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  Experience natural, human-like conversations with our AI voice agent.
                </p>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                    <span>Natural voice interactions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                    <span>Instant responses</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                    <span>24/7 availability</span>
                  </li>
                </ul>
              </div>

              <div ref={voiceRef} className="min-h-[200px]"></div>
            </div>

            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-blue-400/10 w-16 h-16 rounded-xl flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Chat Agent</h3>
                  <p className="text-gray-400">AI chat assistant</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  Interact with our intelligent chat agent for instant support.
                </p>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span>Context-aware conversations</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span>Multi-language support</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span>Seamless integration</span>
                  </li>
                </ul>
              </div>

              <div ref={chatRef} className="min-h-[200px]"></div>
            </div>
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
