import React, { useState, useEffect } from 'react';
import { 
  Brain, Save, Play, Settings, Volume2, Mic, MessageSquare, 
  Zap, Phone, ArrowLeft, Loader, CheckCircle, AlertCircle,
  Copy, Trash2, Edit3
} from 'lucide-react';
import { vapiAI } from '../../services/vapiAI';
import { VapiAssistant, VapiTool } from '../../types/vapi';

interface AssistantBuilderProps {
  assistantId?: string;
  onBack: () => void;
  onSave: (assistant: VapiAssistant) => void;
}

export const AssistantBuilder: React.FC<AssistantBuilderProps> = ({
  assistantId,
  onBack,
  onSave
}) => {
  const [assistant, setAssistant] = useState<Partial<VapiAssistant>>({
    name: '',
    model: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 500,
      systemMessage: 'You are a helpful AI assistant. Be professional, friendly, and concise in your responses.'
    },
    voice: {
      provider: 'elevenlabs',
      voiceId: 'sarah',
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0.0,
      useSpeakerBoost: true
    },
    firstMessage: 'Hello! How can I help you today?',
    firstMessageMode: 'assistant-speaks-first',
    recordingEnabled: true,
    hipaaEnabled: false,
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 1800,
    backgroundSound: 'none',
    backchannelingEnabled: true,
    backgroundDenoisingEnabled: true,
    modelOutputInMessagesEnabled: false,
    metadata: {}
  });

  const [tools, setTools] = useState<VapiTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testResult, setTestResult] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'basic' | 'model' | 'voice' | 'tools' | 'advanced'>('basic');

  const [availableVoices, setAvailableVoices] = useState<Array<{
    id: string;
    name: string;
    provider: string;
    language: string;
    gender: string;
    preview_url?: string;
  }>>([]);

  const [availableModels, setAvailableModels] = useState<Array<{
    id: string;
    name: string;
    provider: string;
    maxTokens: number;
    costPer1kTokens: number;
  }>>([]);

  useEffect(() => {
    loadAssistantData();
    loadAvailableOptions();
  }, [assistantId]);

  const loadAssistantData = async () => {
    if (!assistantId) return;

    try {
      setLoading(true);
      const assistantData = await vapiAI.getAssistant(assistantId);
      setAssistant(assistantData);
    } catch (error) {
      console.error('Failed to load assistant:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableOptions = async () => {
    try {
      const [voices, models] = await Promise.all([
        vapiAI.getAvailableVoices(),
        vapiAI.getAvailableModels()
      ]);
      setAvailableVoices(voices);
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to load available options:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (assistantId) {
        const updatedAssistant = await vapiAI.updateAssistant(assistantId, assistant);
        onSave(updatedAssistant);
      } else {
        const newAssistant = await vapiAI.createAssistant(assistant as Omit<VapiAssistant, 'id' | 'created_at' | 'updated_at'>);
        onSave(newAssistant);
      }
    } catch (error) {
      console.error('Failed to save assistant:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testPhoneNumber.trim()) {
      setTestResult('Please enter a phone number to test');
      return;
    }

    try {
      setTesting(true);
      setTestResult('');
      
      const testCall = await vapiAI.createCall({
        assistant: assistant as VapiAssistant,
        customer: {
          number: testPhoneNumber,
          name: 'Test Call'
        },
        metadata: {
          isTest: true,
          assistantName: assistant.name || 'Test Assistant'
        }
      });

      setTestResult(`✅ Test call initiated successfully! Call ID: ${testCall.id}`);
    } catch (error) {
      console.error('Test call failed:', error);
      setTestResult(`❌ Failed to initiate test call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  const updateAssistant = (path: string, value: any) => {
    setAssistant(prev => {
      const keys = path.split('.');
      const newAssistant = { ...prev };
      let current: any = newAssistant;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newAssistant;
    });
  };

  const addTool = () => {
    const newTool: VapiTool = {
      type: 'function',
      function: {
        name: 'new_function',
        description: 'A new function tool',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    };
    setTools([...tools, newTool]);
  };

  const removeTool = (index: number) => {
    setTools(tools.filter((_, i) => i !== index));
  };

  const tabs = [
    { id: 'basic', label: 'Basic', icon: Settings },
    { id: 'model', label: 'AI Model', icon: Brain },
    { id: 'voice', label: 'Voice', icon: Volume2 },
    { id: 'tools', label: 'Tools', icon: Zap },
    { id: 'advanced', label: 'Advanced', icon: MessageSquare },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {assistantId ? 'Edit Assistant' : 'Create New Assistant'}
            </h1>
            <p className="text-gray-400">
              {assistantId ? 'Modify your AI assistant configuration' : 'Build your perfect AI assistant from scratch'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={saving || !assistant.name?.trim()}
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-2 px-6 rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
          >
            {saving ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{assistantId ? 'Update' : 'Create'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-400/5'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Assistant Name *
                </label>
                <input
                  type="text"
                  value={assistant.name || ''}
                  onChange={(e) => updateAssistant('name', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
                  placeholder="e.g., Sales Assistant Pro, Customer Support Agent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Message
                </label>
                <textarea
                  value={assistant.firstMessage || ''}
                  onChange={(e) => updateAssistant('firstMessage', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 resize-vertical"
                  placeholder="Hello! How can I help you today?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Message Mode
                </label>
                <select
                  value={assistant.firstMessageMode || 'assistant-speaks-first'}
                  onChange={(e) => updateAssistant('firstMessageMode', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
                >
                  <option value="assistant-speaks-first">Assistant speaks first</option>
                  <option value="assistant-waits-for-user">Wait for user to speak</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Duration (seconds)
                  </label>
                  <input
                    type="number"
                    value={assistant.maxDurationSeconds || 1800}
                    onChange={(e) => updateAssistant('maxDurationSeconds', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
                    min="60"
                    max="3600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Silence Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={assistant.silenceTimeoutSeconds || 30}
                    onChange={(e) => updateAssistant('silenceTimeoutSeconds', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
                    min="5"
                    max="120"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'model' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  AI Model Provider
                </label>
                <select
                  value={assistant.model?.provider || 'openai'}
                  onChange={(e) => updateAssistant('model.provider', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="together-ai">Together AI</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Model
                </label>
                <select
                  value={assistant.model?.model || 'gpt-4'}
                  onChange={(e) => updateAssistant('model.model', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
                >
                  {assistant.model?.provider === 'openai' && (
                    <>
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </>
                  )}
                  {assistant.model?.provider === 'anthropic' && (
                    <>
                      <option value="claude-3-opus">Claude 3 Opus</option>
                      <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                      <option value="claude-3-haiku">Claude 3 Haiku</option>
                    </>
                  )}
                  {assistant.model?.provider === 'together-ai' && (
                    <>
                      <option value="llama-2-70b">Llama 2 70B</option>
                      <option value="mixtral-8x7b">Mixtral 8x7B</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  System Message
                </label>
                <textarea
                  value={assistant.model?.systemMessage || ''}
                  onChange={(e) => updateAssistant('model.systemMessage', e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 resize-vertical"
                  placeholder="Define your assistant's role, personality, and behavior. Be specific about goals, conversation style, and how to handle different scenarios."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Temperature ({assistant.model?.temperature || 0.7})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={assistant.model?.temperature || 0.7}
                    onChange={(e) => updateAssistant('model.temperature', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Focused</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={assistant.model?.maxTokens || 500}
                    onChange={(e) => updateAssistant('model.maxTokens', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
                    min="50"
                    max="4000"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Voice Provider
                </label>
                <select
                  value={assistant.voice?.provider || 'elevenlabs'}
                  onChange={(e) => updateAssistant('voice.provider', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
                >
                  <option value="elevenlabs">ElevenLabs</option>
                  <option value="playht">PlayHT</option>
                  <option value="rime-ai">Rime AI</option>
                  <option value="deepgram">Deepgram</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Voice Selection
                </label>
                <select
                  value={assistant.voice?.voiceId || 'sarah'}
                  onChange={(e) => updateAssistant('voice.voiceId', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
                >
                  {availableVoices
                    .filter(voice => voice.provider === assistant.voice?.provider)
                    .map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} ({voice.gender}, {voice.language})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Stability ({assistant.voice?.stability || 0.5})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={assistant.voice?.stability || 0.5}
                    onChange={(e) => updateAssistant('voice.stability', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Variable</span>
                    <span>Stable</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Similarity Boost ({assistant.voice?.similarityBoost || 0.8})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={assistant.voice?.similarityBoost || 0.8}
                    onChange={(e) => updateAssistant('voice.similarityBoost', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assistant.voice?.useSpeakerBoost || false}
                    onChange={(e) => updateAssistant('voice.useSpeakerBoost', e.target.checked)}
                    className="w-5 h-5 text-yellow-400 bg-gray-900 border-gray-600 rounded focus:ring-yellow-400 focus:ring-2"
                  />
                  <span className="text-gray-300">Use Speaker Boost</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-white">Function Tools</h4>
                <button
                  onClick={addTool}
                  className="bg-yellow-400/20 text-yellow-400 px-4 py-2 rounded-lg hover:bg-yellow-400/30 transition-colors flex items-center space-x-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>Add Tool</span>
                </button>
              </div>

              {tools.length === 0 ? (
                <div className="text-center py-8 bg-gray-900/30 rounded-lg border border-gray-700/50">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-gray-500 opacity-50" />
                  <p className="text-gray-400">No tools configured</p>
                  <p className="text-gray-500 text-sm">Add function tools to extend your assistant's capabilities</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tools.map((tool, index) => (
                    <div key={index} className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-white">Tool {index + 1}</h5>
                        <button
                          onClick={() => removeTool(index)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Function Name</label>
                          <input
                            type="text"
                            value={tool.function?.name || ''}
                            onChange={(e) => {
                              const newTools = [...tools];
                              if (newTools[index].function) {
                                newTools[index].function!.name = e.target.value;
                                setTools(newTools);
                              }
                            }}
                            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                            placeholder="function_name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Description</label>
                          <input
                            type="text"
                            value={tool.function?.description || ''}
                            onChange={(e) => {
                              const newTools = [...tools];
                              if (newTools[index].function) {
                                newTools[index].function!.description = e.target.value;
                                setTools(newTools);
                              }
                            }}
                            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                            placeholder="What this function does"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white">Call Settings</h4>
                  
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assistant.recordingEnabled || false}
                      onChange={(e) => updateAssistant('recordingEnabled', e.target.checked)}
                      className="w-5 h-5 text-yellow-400 bg-gray-900 border-gray-600 rounded focus:ring-yellow-400 focus:ring-2"
                    />
                    <span className="text-gray-300">Enable Call Recording</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assistant.hipaaEnabled || false}
                      onChange={(e) => updateAssistant('hipaaEnabled', e.target.checked)}
                      className="w-5 h-5 text-yellow-400 bg-gray-900 border-gray-600 rounded focus:ring-yellow-400 focus:ring-2"
                    />
                    <span className="text-gray-300">HIPAA Compliance</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assistant.backchannelingEnabled || false}
                      onChange={(e) => updateAssistant('backchannelingEnabled', e.target.checked)}
                      className="w-5 h-5 text-yellow-400 bg-gray-900 border-gray-600 rounded focus:ring-yellow-400 focus:ring-2"
                    />
                    <span className="text-gray-300">Enable Backchanneling</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assistant.backgroundDenoisingEnabled || false}
                      onChange={(e) => updateAssistant('backgroundDenoisingEnabled', e.target.checked)}
                      className="w-5 h-5 text-yellow-400 bg-gray-900 border-gray-600 rounded focus:ring-yellow-400 focus:ring-2"
                    />
                    <span className="text-gray-300">Background Noise Reduction</span>
                  </label>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white">Audio Settings</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Background Sound
                    </label>
                    <select
                      value={assistant.backgroundSound || 'none'}
                      onChange={(e) => updateAssistant('backgroundSound', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
                    >
                      <option value="none">None</option>
                      <option value="office">Office Environment</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Section */}
      <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <Phone className="h-5 w-5 mr-2 text-green-400" />
          Test Your Assistant
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Test Phone Number
            </label>
            <input
              type="tel"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-green-400"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleTest}
              disabled={testing || !testPhoneNumber.trim() || !assistant.name?.trim()}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
            >
              {testing ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Initiating Call...</span>
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  <span>Start Test Call</span>
                </>
              )}
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`mt-4 p-4 rounded-lg border ${
            testResult.includes('✅') 
              ? 'bg-green-500/10 border-green-500/50 text-green-300' 
              : 'bg-red-500/10 border-red-500/50 text-red-300'
          }`}>
            <p className="text-sm font-medium">{testResult}</p>
          </div>
        )}
      </div>
    </div>
  );
};