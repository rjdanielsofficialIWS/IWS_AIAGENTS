import React, { useState, useEffect, useRef } from 'react';
import { Brain, Phone, MessageSquare, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/vapiAI';

interface Widget {
  id: string;
  widget_type: string;
  widget_code: string;
  is_active: boolean;
}

export function DemoPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const voiceRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWidgets();
  }, []);

  useEffect(() => {
    if (widgets.length > 0) {
      renderWidgets();
    }
  }, [widgets]);

  const fetchWidgets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('widgets')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      if (data) {
        setWidgets(data);
      }
    } catch (error) {
      console.error('Error fetching widgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderWidgets = () => {
    widgets.forEach((widget) => {
      let containerRef: HTMLDivElement | null = null;

      if (widget.widget_type === 'voice' && voiceRef.current) {
        containerRef = voiceRef.current;
      } else if (widget.widget_type === 'chat' && chatRef.current) {
        containerRef = chatRef.current;
      } else if (widget.widget_type === 'custom' && customRef.current) {
        containerRef = customRef.current;
      }

      if (containerRef) {
        containerRef.innerHTML = widget.widget_code;

        const scripts = containerRef.querySelectorAll('script');
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
      }
    });
  };

  const getWidgetByType = (type: string) => {
    return widgets.find((w) => w.widget_type === type);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-x-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-yellow-400/5 to-transparent rounded-full animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
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
              AI Agent Demos
            </h1>
            <div className="w-24"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Experience Our <span className="bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">AI Agents</span>
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Try our voice and chat agents live. Click the buttons below to interact with our AI technology.
            </p>
          </div>

          {/* Demo Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Phone Agent Demo Card */}
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-yellow-400/10 w-16 h-16 rounded-xl flex items-center justify-center">
                  <Phone className="h-8 w-8 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Voice Agent Demo</h3>
                  <p className="text-gray-400">Test our AI phone assistant</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  Experience natural, human-like conversations with our AI voice agent. Perfect for customer service, bookings, and sales calls.
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

              <div id="voice-widget-container" className="relative">
                <div ref={voiceRef}>
                  {loading ? (
                    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-8 min-h-[200px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                    </div>
                  ) : !getWidgetByType('voice') ? (
                    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-8 min-h-[200px] flex items-center justify-center">
                      <div className="text-center">
                        <Phone className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 text-sm">No voice widget configured</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Chat Agent Demo Card */}
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-blue-400/10 w-16 h-16 rounded-xl flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Chat Agent Demo</h3>
                  <p className="text-gray-400">Test our AI chat assistant</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-300 mb-4">
                  Interact with our intelligent chat agent that understands context and provides helpful, accurate responses.
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

              <div id="chat-widget-container" className="relative">
                <div ref={chatRef}>
                  {loading ? (
                    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-8 min-h-[200px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    </div>
                  ) : !getWidgetByType('chat') ? (
                    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-8 min-h-[200px] flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 text-sm">No chat widget configured</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Demo Section */}
          <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-green-400/10 w-16 h-16 rounded-xl flex items-center justify-center">
                <Brain className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Custom Agent Demo</h3>
                <p className="text-gray-400">Specialized AI assistant showcase</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              This section can be customized for industry-specific demos or advanced features. Add additional widgets here to showcase different use cases.
            </p>

            <div id="custom-widget-container" className="relative">
              <div ref={customRef}>
                {loading ? (
                  <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-8 min-h-[200px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                  </div>
                ) : !getWidgetByType('custom') ? (
                  <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-8 min-h-[200px] flex items-center justify-center">
                    <div className="text-center">
                      <Brain className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">No custom widget configured</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* CTA Section */}
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

      {/* Footer */}
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
