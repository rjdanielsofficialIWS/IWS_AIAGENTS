import React, { useState } from 'react';
import { useEffect } from 'react';
import { 
  Brain, Settings, BarChart3, Phone, MessageSquare, Calendar, 
  User, LogOut, Save, Play, Pause, Edit3, Trash2, Plus,
  TrendingUp, Clock, CheckCircle, AlertCircle, Volume2,
  Mic, PhoneCall, Mail, Zap, Target, Users, DollarSign
} from 'lucide-react';
import { blandAI, AIAgent, CallRecord } from '../services/blandAI';

interface ClientPortalProps {
  onLogout: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [agentConfig, setAgentConfig] = useState({
    name: 'name',
    prompt_instructions: 'You are a professional sales agent. Your goal is to qualify leads and book meetings.',
    voice_id: 'sarah',
    personality_traits: {
      tone: 'professional',
      energy: 'medium',
      pace: 'normal'
    },
    integration_settings: {
      crm: false,
      calendar: false,
      email: false
    },
    phone_number: '',
    status: 'active' as const
  });

  const [callForm, setCallForm] = useState({
    phone_number: '',
    task: 'Qualify this lead and book a meeting if they are interested in our AI agent services.',
    agent_id: ''
  });

  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [isMakingCall, setIsMakingCall] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [agentsData, callsData, analyticsData] = await Promise.all([
        blandAI.getAgents(),
        blandAI.getCalls(),
        blandAI.getCallAnalytics()
      ]);
      
      setAgents(agentsData);
      setCalls(callsData);
      setAnalytics(analyticsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'agents', label: 'AI Agents', icon: Brain },
    { id: 'calls', label: 'Call Center', icon: Phone },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const toggleAgentStatus = async (agentId: string) => {
    try {
      const agent = agents.find(a => a.id === agentId);
      if (!agent) return;

      const newStatus = agent.status === 'active' ? 'paused' : 'active';
      await blandAI.updateAgent(agentId, { status: newStatus });
      
      setAgents(agents.map(a => 
        a.id === agentId ? { ...a, status: newStatus } : a
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent status');
    }
  };

  const deleteAgent = async (agentId: string) => {
    try {
      await blandAI.deleteAgent(agentId);
      setAgents(agents.filter(agent => agent.id !== agentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
    }
  };

  const saveAgentConfig = async () => {
    try {
      if (selectedAgent) {
        // Update existing agent
        const updatedAgent = await blandAI.updateAgent(selectedAgent.id!, agentConfig);
        setAgents(agents.map(agent => 
          agent.id === selectedAgent.id ? updatedAgent : agent
        ));
      } else {
        // Create new agent
        setIsCreatingAgent(true);
        const newAgent = await blandAI.createAgent(agentConfig);
        setAgents([...agents, newAgent]);
      }
      setSelectedAgent(null);
      resetAgentConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save agent');
    } finally {
      setIsCreatingAgent(false);
    }
  };

  const resetAgentConfig = () => {
    setAgentConfig({
      name: '',
      prompt_instructions: 'You are a professional sales agent. Your goal is to qualify leads and book meetings.',
      voice_id: 'sarah',
      personality_traits: {
        tone: 'professional',
        energy: 'medium',
        pace: 'normal'
      },
      integration_settings: {
        crm: false,
        calendar: false,
        email: false
      },
      phone_number: '',
      status: 'active' as const
    });
  };

  const makeCall = async () => {
    try {
      setIsMakingCall(true);
      const result = await blandAI.initiateCall({
        phone_number: callForm.phone_number,
        task: callForm.task,
        voice_id: callForm.agent_id ? agents.find(a => a.id === callForm.agent_id)?.voice_id : 'sarah',
        agent_id: callForm.agent_id || undefined
      });
      
      // Refresh calls list
      const updatedCalls = await blandAI.getCalls();
      setCalls(updatedCalls);
      
      // Reset form
      setCallForm({
        phone_number: '',
        task: 'Qualify this lead and book a meeting if they are interested in our AI agent services.',
        agent_id: ''
      });
      
      alert(`Call initiated successfully! Call ID: ${result.call_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate call');
    } finally {
      setIsMakingCall(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading your AI agents...</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="h-6 w-6 text-red-400" />
          <p className="text-red-300">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Phone className="h-8 w-8 text-blue-400" />
            <span className="text-2xl font-bold text-blue-400">{analytics?.totalCalls || 0}</span>
          </div>
          <p className="text-gray-300">Total Calls Today</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Target className="h-8 w-8 text-green-400" />
            <span className="text-2xl font-bold text-green-400">{analytics?.completedCalls || 0}</span>
          </div>
          <p className="text-gray-300">Completed Calls</p>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Clock className="h-8 w-8 text-yellow-400" />
            <span className="text-2xl font-bold text-yellow-400">{Math.round(analytics?.averageDuration || 0)}s</span>
          </div>
          <p className="text-gray-300">Avg Call Duration</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold text-purple-400">{agents.filter(a => a.status === 'active').length}</span>
          </div>
          <p className="text-gray-300">Active Agents</p>
        </div>
      </div>

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          <Brain className="h-6 w-6 mr-2 text-yellow-400" />
          Active AI Agents
        </h3>
        <div className="space-y-4">
          {agents.map(agent => (
            <div key={agent.id} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  agent.status === 'active' ? 'bg-green-400' : 
                  agent.status === 'paused' ? 'bg-yellow-400' : 'bg-blue-400'
                }`}></div>
                <div>
                  <h4 className="font-medium">{agent.name}</h4>
                  <p className="text-sm text-gray-400">
                    Voice: {agent.voice_id} • Status: {agent.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">{new Date(agent.updated_at || '').toLocaleDateString()}</span>
                <button
                  onClick={() => toggleAgentStatus(agent.id!)}
                  className={`p-2 rounded-lg transition-colors ${
                    agent.status === 'active' 
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {agent.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
          {agents.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No AI agents created yet. Create your first agent to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAgents = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Agents Management</h2>
        <button 
          onClick={() => {
            setSelectedAgent(null);
            resetAgentConfig();
          }}
          className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-medium py-2 px-4 rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Create New Agent</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your AI Agents</h3>
          {agents.map(agent => (
            <div key={agent.id} className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    agent.status === 'active' ? 'bg-green-400' : 
                    agent.status === 'paused' ? 'bg-yellow-400' : 'bg-blue-400'
                  }`}></div>
                  <h4 className="font-semibold">{agent.name}</h4>
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
                    {agent.voice_id}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedAgent(agent);
                      setAgentConfig({
                        name: agent.name,
                        prompt_instructions: agent.prompt_instructions,
                        voice_id: agent.voice_id,
                        personality_traits: agent.personality_traits || {
                          tone: 'professional',
                          energy: 'medium',
                          pace: 'normal'
                        },
                        integration_settings: agent.integration_settings || {
                          crm: false,
                          calendar: false,
                          email: false
                        },
                        phone_number: agent.phone_number || '',
                        status: agent.status
                      });
                    }}
                    className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleAgentStatus(agent.id!)}
                    className={`p-2 rounded-lg transition-colors ${
                      agent.status === 'active' 
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    {agent.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => deleteAgent(agent.id!)}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Voice:</span>
                  <span className="ml-2 font-medium">{agent.voice_id}</span>
                </div>
                <div>
                  <span className="text-gray-400">Phone:</span>
                  <span className="ml-2 font-medium">{agent.phone_number || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className={`ml-2 font-medium capitalize ${
                    agent.status === 'active' ? 'text-green-400' : 
                    agent.status === 'paused' ? 'text-yellow-400' : 'text-blue-400'
                  }`}>
                    {agent.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Updated:</span>
                  <span className="ml-2 font-medium">{new Date(agent.updated_at || '').toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
          {agents.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No AI agents created yet. Click "Create New Agent" to get started!</p>
            </div>
          )}
        </div>

        {(selectedAgent || !selectedAgent) && (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-6">
              {selectedAgent ? `Configure Agent: ${selectedAgent.name}` : 'Create New Agent'}
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Agent Name</label>
                <input
                  type="text"
                  value={agentConfig.name}
                  onChange={(e) => setAgentConfig({...agentConfig, name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                  placeholder="e.g., Sales Agent Pro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Voice</label>
                <select
                  value={agentConfig.voice_id}
                  onChange={(e) => setAgentConfig({...agentConfig, voice_id: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                >
                  {blandAI.getAvailableVoices().map(voice => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={agentConfig.phone_number}
                  onChange={(e) => setAgentConfig({...agentConfig, phone_number: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={agentConfig.status}
                  onChange={(e) => setAgentConfig({...agentConfig, status: e.target.value as 'active' | 'paused' | 'training'})}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="training">Training</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Agent Instructions</label>
                <textarea
                  value={agentConfig.prompt_instructions}
                  onChange={(e) => setAgentConfig({...agentConfig, prompt_instructions: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                  placeholder="Describe how the AI agent should behave, what its goals are, and how it should interact with callers..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Personality Traits</label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Tone</label>
                    <select
                      value={agentConfig.personality_traits.tone}
                      onChange={(e) => setAgentConfig({
                        ...agentConfig,
                        personality_traits: { ...agentConfig.personality_traits, tone: e.target.value }
                      })}
                      className="w-full px-2 py-1 bg-gray-900/50 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="casual">Casual</option>
                      <option value="authoritative">Authoritative</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Energy</label>
                    <select
                      value={agentConfig.personality_traits.energy}
                      onChange={(e) => setAgentConfig({
                        ...agentConfig,
                        personality_traits: { ...agentConfig.personality_traits, energy: e.target.value }
                      })}
                      className="w-full px-2 py-1 bg-gray-900/50 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Pace</label>
                    <select
                      value={agentConfig.personality_traits.pace}
                      onChange={(e) => setAgentConfig({
                        ...agentConfig,
                        personality_traits: { ...agentConfig.personality_traits, pace: e.target.value }
                      })}
                      className="w-full px-2 py-1 bg-gray-900/50 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-yellow-400/50"
                    >
                      <option value="slow">Slow</option>
                      <option value="normal">Normal</option>
                      <option value="fast">Fast</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Integrations</label>
                <div className="space-y-3">
                  {Object.entries(agentConfig.integration_settings).map(([key, value]) => (
                    <label key={key} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setAgentConfig({
                          ...agentConfig,
                          integration_settings: { ...agentConfig.integration_settings, [key]: e.target.checked }
                        })}
                        className="w-4 h-4 text-yellow-400 bg-gray-900 border-gray-600 rounded focus:ring-yellow-400"
                      />
                      <span className="text-gray-300 capitalize">{key} Integration</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={saveAgentConfig}
                  disabled={isCreatingAgent || !agentConfig.name.trim()}
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-medium py-2 px-4 rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all flex items-center justify-center space-x-2"
                >
                  {isCreatingAgent ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{selectedAgent ? 'Update Agent' : 'Create Agent'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedAgent(null);
                    resetAgentConfig();
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCalls = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Call Center</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Make a Call */}
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Phone className="h-6 w-6 mr-2 text-green-400" />
            Make Outbound Call
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
              <input
                type="tel"
                value={callForm.phone_number}
                onChange={(e) => setCallForm({...callForm, phone_number: e.target.value})}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Agent</label>
              <select
                value={callForm.agent_id}
                onChange={(e) => setCallForm({...callForm, agent_id: e.target.value})}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              >
                <option value="">Default Agent</option>
                {agents.filter(a => a.status === 'active').map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.voice_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Call Task/Instructions</label>
              <textarea
                value={callForm.task}
                onChange={(e) => setCallForm({...callForm, task: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                placeholder="What should the AI agent accomplish on this call?"
              />
            </div>

            <button
              onClick={makeCall}
              disabled={isMakingCall || !callForm.phone_number.trim()}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-medium py-3 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMakingCall ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Initiating Call...</span>
                </>
              ) : (
                <>
                  <PhoneCall className="h-4 w-4" />
                  <span>Make Call</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recent Calls */}
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Clock className="h-6 w-6 mr-2 text-blue-400" />
            Recent Calls
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {calls.slice(0, 10).map(call => (
              <div key={call.id} className="p-3 bg-gray-900/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{call.phone_number}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    call.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    call.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {call.status}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  <p>Duration: {call.call_length}s</p>
                  <p>Date: {new Date(call.created_at).toLocaleString()}</p>
                  {call.summary && <p className="mt-1 text-gray-300">Summary: {call.summary}</p>}
                </div>
              </div>
            ))}
            {calls.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No calls made yet. Make your first call to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Analytics & Performance</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Call Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Calls This Month</span>
              <span className="font-bold text-blue-400">{analytics?.totalCalls || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Average Call Duration</span>
              <span className="font-bold text-green-400">{Math.round(analytics?.averageDuration || 0)}s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Completion Rate</span>
              <span className="font-bold text-yellow-400">{analytics?.completionRate?.toFixed(1) || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Duration</span>
              <span className="font-bold text-purple-400">{Math.round((analytics?.totalDuration || 0) / 60)}m</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Agent Performance</h3>
          <div className="space-y-4">
            {agents.map(agent => (
              <div key={agent.id} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                <span className="text-gray-300">{agent.name}</span>
                <div className="text-right">
                  <div className="font-bold text-blue-400">{agent.status}</div>
                  <div className="text-sm text-gray-400">Voice: {agent.voice_id}</div>
                </div>
              </div>
            ))}
            {agents.length === 0 && (
              <div className="text-center py-4 text-gray-400">
                <p>No agents created yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Account Settings</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Subscription Details</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Plan</span>
              <span className="font-bold text-yellow-400">Premium</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Monthly Cost</span>
              <span className="font-bold">$499/month</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Next Billing</span>
              <span className="font-bold">Feb 15, 2024</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Status</span>
              <span className="font-bold text-green-400">Active</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Account Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
              <input
                type="text"
                defaultValue="Your Company"
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                defaultValue="you@company.com"
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
              <input
                type="tel"
                defaultValue="+1 (555) 123-4567"
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
              />
            </div>
            <button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-medium py-2 px-4 rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all">
              Update Information
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-yellow-400" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
                Client Portal
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <User className="h-4 w-4" />
                <span>Premium Account</span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                      : 'text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'agents' && renderAgents()}
            {activeTab === 'calls' && renderCalls()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        </div>
      </div>
    </div>
  );
};