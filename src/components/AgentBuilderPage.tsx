import React, { useState } from 'react';
import { Brain, Sparkles, Phone, MessageSquare, ArrowLeft, Loader, CheckCircle, Play, Calendar, Edit3 } from 'lucide-react';
import { WebCallInterface } from './WebCallInterface';
import { WebChatInterface } from './WebChatInterface';

interface AgentBuilderPageProps {
  onBack: () => void;
}

export const AgentBuilderPage: React.FC<AgentBuilderPageProps> = ({ onBack }) => {
  const [agentName, setAgentName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [agentCreated, setAgentCreated] = useState(false);
  const [vapiAssistantId, setVapiAssistantId] = useState<string | null>(null);
  const [showWebCall, setShowWebCall] = useState(false);
  const [showWebChat, setShowWebChat] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      alert('OpenAI API key is not configured. Please check your environment variables.');
      return;
    }

    setIsEnhancing(true);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at creating detailed, effective prompts for AI voice assistants. Enhance the user\'s prompt by making it more specific, professional, and effective for a conversational AI agent. Keep the core intent but add helpful details about tone, behavior, and conversation flow.'
            },
            {
              role: 'user',
              content: `Enhance this AI voice assistant prompt: "${prompt}"`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.choices && data.choices[0]?.message?.content) {
        setPrompt(data.choices[0].message.content);
      } else {
        throw new Error('Invalid response format from OpenAI API');
      }
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      alert(`Failed to enhance prompt: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!agentName.trim() || !prompt.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('https://api.vapi.ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer b561d669-07ff-479e-a5f0-fcb94111d2fc`
        },
        body: JSON.stringify({
          name: agentName,
          model: {
            provider: 'openai',
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: prompt
              }
            ]
          },
          voice: {
            provider: 'vapi',
            voiceId: 'paige'
          },
          firstMessage: 'Hello! How can I help you today?'
        })
      });

      const data = await response.json();
      if (data.id) {
        setVapiAssistantId(data.id);
        setAgentCreated(true);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error creating agent:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateAgent = async () => {
    if (!vapiAssistantId || !agentName.trim() || !prompt.trim()) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`https://api.vapi.ai/assistant/${vapiAssistantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer b561d669-07ff-479e-a5f0-fcb94111d2fc`
        },
        body: JSON.stringify({
          name: agentName,
          model: {
            provider: 'openai',
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: prompt
              }
            ]
          },
          voice: {
            provider: 'vapi',
            voiceId: 'paige'
          },
          firstMessage: 'Hello! How can I help you today?'
        })
      });

      if (response.ok) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating agent:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTestWebCall = () => {
    setShowWebCall(true);
    setShowWebChat(false);
  };

  const handleTestWebChat = () => {
    setShowWebChat(true);
    setShowWebCall(false);
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
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Home</span>
            </button>

            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-yellow-400" />
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
                AI Agent Builder
              </h1>
            </div>

            <div className="w-24"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Agent Configuration */}
          <div className="space-y-6">
            {/* Agent Creation/Edit Card */}
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="bg-green-400/10 w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Brain className="h-10 w-10 text-green-400" />
                </div>
                <h2 className="text-3xl font-bold mb-2">
                  {agentCreated && !isEditing ? 'Your AI Agent' : 'Create Your AI Agent'}
                </h2>
                <p className="text-gray-400">
                  {agentCreated && !isEditing
                    ? 'Test your agent with web calls and chats'
                    : 'Build a custom AI phone agent for your business'}
                </p>
              </div>

              {(!agentCreated || isEditing) && (
                <div className="space-y-6">
                  {/* Agent Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Agent Name
                    </label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="e.g., Sales Assistant, Support Bot"
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all"
                    />
                  </div>

                  {/* Agent Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Agent Instructions
                      </label>
                      <button
                        onClick={handleEnhancePrompt}
                        disabled={isEnhancing || !prompt.trim()}
                        className="flex items-center space-x-1 text-sm text-yellow-400 hover:text-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isEnhancing ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin" />
                            <span>Enhancing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            <span>Enhance Prompt</span>
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe how your AI agent should behave, what it should help with, and its personality..."
                      rows={8}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all resize-vertical"
                    />
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={isEditing ? handleUpdateAgent : handleCreateAgent}
                    disabled={(isEditing ? isUpdating : isCreating) || !agentName.trim() || !prompt.trim()}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
                  >
                    {(isEditing ? isUpdating : isCreating) ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin" />
                        <span>{isEditing ? 'Updating Agent...' : 'Creating Agent...'}</span>
                      </>
                    ) : (
                      <>
                        <Brain className="h-5 w-5" />
                        <span>{isEditing ? 'Update Agent' : 'Create Agent'}</span>
                      </>
                    )}
                  </button>

                  {isEditing && (
                    <button
                      onClick={() => setIsEditing(false)}
                      className="w-full text-gray-400 hover:text-gray-300 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}

              {agentCreated && !isEditing && (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                    <div>
                      <p className="text-green-300 font-medium">Agent Created Successfully!</p>
                      <p className="text-sm text-gray-400">Name: {agentName}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/25 flex items-center justify-center space-x-2"
                  >
                    <Edit3 className="h-5 w-5" />
                    <span>Update Agent</span>
                  </button>
                </div>
              )}
            </div>

            {/* 7-Day Trial CTA */}
            {agentCreated && (
              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-8">
                <div className="text-center mb-6">
                  <div className="bg-yellow-400/10 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-yellow-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Ready to Go Live?</h3>
                  <p className="text-gray-300 text-sm">
                    Activate your AI Agent and test it within your business for 7 days FREE!
                  </p>
                </div>

                <a
                  href="https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/25 text-center"
                >
                  Start Your 7-Day Free Trial
                </a>
              </div>
            )}
          </div>

          {/* Right Column - Testing Interface */}
          <div className="space-y-6">
            {agentCreated && vapiAssistantId && (
              <>
                {/* Test Controls */}
                <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
                  <h3 className="text-2xl font-bold mb-6 text-center">Test Your Agent</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={handleTestWebCall}
                      className={`flex flex-col items-center justify-center space-y-3 p-6 rounded-xl border-2 transition-all ${
                        showWebCall
                          ? 'bg-blue-500/20 border-blue-400'
                          : 'bg-gray-800/50 border-gray-700 hover:border-blue-400/50'
                      }`}
                    >
                      <Phone className="h-8 w-8 text-blue-400" />
                      <span className="font-medium">Web Call</span>
                    </button>

                    <button
                      onClick={handleTestWebChat}
                      className={`flex flex-col items-center justify-center space-y-3 p-6 rounded-xl border-2 transition-all ${
                        showWebChat
                          ? 'bg-green-500/20 border-green-400'
                          : 'bg-gray-800/50 border-gray-700 hover:border-green-400/50'
                      }`}
                    >
                      <MessageSquare className="h-8 w-8 text-green-400" />
                      <span className="font-medium">Web Chat</span>
                    </button>
                  </div>
                </div>

                {/* Testing Interface */}
                {showWebCall && (
                  <WebCallInterface
                    assistantId={vapiAssistantId}
                    publicKey="ebb2120b-ac56-4ce9-b1d5-17966931c665"
                  />
                )}

                {showWebChat && (
                  <WebChatInterface
                    assistantId={vapiAssistantId}
                    publicKey="ebb2120b-ac56-4ce9-b1d5-17966931c665"
                  />
                )}
              </>
            )}

            {!agentCreated && (
              <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 text-center">
                <Play className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Agent Yet</h3>
                <p className="text-gray-500">
                  Create your AI agent to start testing with web calls and chats
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};