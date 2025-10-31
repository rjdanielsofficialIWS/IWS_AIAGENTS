import React, { useState, useRef } from 'react';
import { Brain, Phone, MessageSquare, ArrowLeft, Code, X } from 'lucide-react';

export function DemoPage() {
  const [voiceCode, setVoiceCode] = useState('');
  const [chatCode, setChatCode] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const voiceRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLDivElement>(null);

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

  const handleVoiceSubmit = () => {
    renderWidget(voiceCode, voiceRef);
    setShowVoiceInput(false);
  };

  const handleChatSubmit = () => {
    renderWidget(chatCode, chatRef);
    setShowChatInput(false);
  };

  const handleCustomSubmit = () => {
    renderWidget(customCode, customRef);
    setShowCustomInput(false);
  };

  const WidgetInputModal = ({
    title,
    code,
    setCode,
    onSubmit,
    onClose,
  }: {
    title: string;
    code: string;
    setCode: (code: string) => void;
    onSubmit: () => void;
    onClose: () => void;
  }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 border border-gray-700/50 rounded-2xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <p className="text-gray-400 mb-4 text-sm">
          Paste your Vapi widget embed code below and click submit to display it.
        </p>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder='Paste your widget embed code here (e.g., <script src="..."></script>)'
          className="w-full h-64 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all resize-vertical mb-4"
        />

        <div className="flex items-center space-x-3">
          <button
            onClick={onSubmit}
            disabled={!code.trim()}
            className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Submit & Display Widget
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-x-hidden">
      {showVoiceInput && (
        <WidgetInputModal
          title="Add Voice Widget"
          code={voiceCode}
          setCode={setVoiceCode}
          onSubmit={handleVoiceSubmit}
          onClose={() => setShowVoiceInput(false)}
        />
      )}

      {showChatInput && (
        <WidgetInputModal
          title="Add Chat Widget"
          code={chatCode}
          setCode={setChatCode}
          onSubmit={handleChatSubmit}
          onClose={() => setShowChatInput(false)}
        />
      )}

      {showCustomInput && (
        <WidgetInputModal
          title="Add Custom Widget"
          code={customCode}
          setCode={setCustomCode}
          onSubmit={handleCustomSubmit}
          onClose={() => setShowCustomInput(false)}
        />
      )}

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-yellow-400/5 to-transparent rounded-full animate-pulse delay-1000"></div>
      </div>

      <header className="relative z-10 py-8 px-4 sm:px-6 lg:px-8 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <a
              href="/"
              className="flex items-center space-x-2 text-gray-400 hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Home</span>
            </a>
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
              Paste your Vapi widget code and see it in action instantly. No login required.
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

              <div ref={voiceRef} className="mb-4 min-h-[200px]">
                {!voiceCode && (
                  <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-8 min-h-[200px] flex items-center justify-center">
                    <div className="text-center">
                      <Phone className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">No agent added yet</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowVoiceInput(true)}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-2"
              >
                <Code className="h-5 w-5" />
                <span>Add AI Agent</span>
              </button>
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

              <div ref={chatRef} className="mb-4 min-h-[200px]">
                {!chatCode && (
                  <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-8 min-h-[200px] flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">No agent added yet</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowChatInput(true)}
                className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-2"
              >
                <Code className="h-5 w-5" />
                <span>Add AI Agent</span>
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-green-400/10 w-16 h-16 rounded-xl flex items-center justify-center">
                <Brain className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Custom Agent</h3>
                <p className="text-gray-400">Specialized AI assistant</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Showcase industry-specific demos or advanced features with custom widgets.
            </p>

            <div ref={customRef} className="mb-4 min-h-[200px]">
              {!customCode && (
                <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-8 min-h-[200px] flex items-center justify-center">
                  <div className="text-center">
                    <Brain className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No widget added yet</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowCustomInput(true)}
              className="w-full bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center space-x-2"
            >
              <Code className="h-5 w-5" />
              <span>Add AI Agent</span>
            </button>
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
