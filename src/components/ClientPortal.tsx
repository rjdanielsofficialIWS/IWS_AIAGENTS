import React, { useState, useEffect } from 'react';
import { 
  Brain, Settings, User, LogOut, Save, Play, Pause, Edit3, Trash2, Plus,
  CheckCircle, AlertCircle, Loader, Volume2, Mic, Zap, Target, Users
} from 'lucide-react';
import { blandAI, AIAgent } from '../services/blandAI';

interface ClientPortalProps {
  onLogout: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ onLogout }) => {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [agentConfig, setAgentConfig] = useState({
    name: '',
    prompt_instructions: 'You are a professional sales agent. Your goal is to qualify leads and book meetings. Be friendly, professional, and helpful. Ask relevant questions to understand their needs and determine if they would benefit from our AI agent services.',
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

  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Load agents on component mount
  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const agentsData = await blandAI.getAgents();
      setAgents(agentsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

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
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      return;
    }

    try {
      await blandAI.deleteAgent(agentId);
      setAgents(agents.filter(agent => agent.id !== agentId));
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
        setShowForm(false);
      }
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
      setShowForm(false);
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
      prompt_instructions: 'You are a professional sales agent. Your goal is to qualify leads and book meetings. Be friendly, professional, and helpful. Ask relevant questions to understand their needs and determine if they would benefit from our AI agent services.',
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

  const startCreatingAgent = () => {
    setSelectedAgent(null);
    resetAgentConfig();
    setShowForm(true);
  };

  const editAgent = (agent: AIAgent) => {
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
    setShowForm(true);
  };

  const cancelForm = () => {
    setSelectedAgent(null);
    setShowForm(false);
    resetAgentConfig();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-yellow-400/5 to-transparent rounded-full animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-yellow-400" />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
                  AI Agent Studio
                </h1>
                <p className="text-xs text-gray-400">Create & Manage Your AI Sales Agents</p>
              </div>
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center space-x-3">
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

        {/* Main Content */}
        <div className="space-y-8">
          {/* Header Section */}
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">
              Your AI Sales Agents
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Create, configure, and manage intelligent AI agents that handle your sales calls
            </p>
            
            {!showForm && (
              <button 
                onClick={startCreatingAgent}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-8 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-yellow-400/25 flex items-center space-x-2 mx-auto"
              >
                <Plus className="h-5 w-5" />
                <span>Create New AI Agent</span>
              </button>
            )}
          </div>

          {/* Agent Configuration Form */}
          {showForm && (
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold mb-2">
                  {selectedAgent ? `Configure Agent: ${selectedAgent.name}` : 'Create New AI Agent'}
                </h3>
                <p className="text-gray-300">
                  {selectedAgent ? 'Update your agent\'s configuration and behavior' : 'Design your perfect AI sales agent from scratch'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Basic Configuration */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-4 flex items-center">
                      <Settings className="h-5 w-5 mr-2 text-blue-400" />
                      Basic Configuration
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Agent Name *</label>
                        <input
                          type="text"
                          value={agentConfig.name}
                          onChange={(e) => setAgentConfig({...agentConfig, name: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
                          placeholder="e.g., Sales Agent Pro, Lead Qualifier, Meeting Booker"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Voice Selection</label>
                        <select
                          value={agentConfig.voice_id}
                          onChange={(e) => setAgentConfig({...agentConfig, voice_id: e.target.value})}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
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
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                        <select
                          value={agentConfig.status}
                          onChange={(e) => setAgentConfig({...agentConfig, status: e.target.value as 'active' | 'paused' | 'training'})}
                          className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
                        >
                          <option value="active">Active - Ready to take calls</option>
                          <option value="paused">Paused - Temporarily disabled</option>
                          <option value="training">Training - Learning mode</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Personality Configuration */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4 flex items-center">
                      <Volume2 className="h-5 w-5 mr-2 text-purple-400" />
                      Personality Traits
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Communication Tone</label>
                        <select
                          value={agentConfig.personality_traits.tone}
                          onChange={(e) => setAgentConfig({
                            ...agentConfig,
                            personality_traits: { ...agentConfig.personality_traits, tone: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                        >
                          <option value="professional">Professional & Business-like</option>
                          <option value="friendly">Friendly & Approachable</option>
                          <option value="casual">Casual & Relaxed</option>
                          <option value="authoritative">Authoritative & Confident</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Energy Level</label>
                        <select
                          value={agentConfig.personality_traits.energy}
                          onChange={(e) => setAgentConfig({
                            ...agentConfig,
                            personality_traits: { ...agentConfig.personality_traits, energy: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                        >
                          <option value="low">Low - Calm & Measured</option>
                          <option value="medium">Medium - Balanced</option>
                          <option value="high">High - Enthusiastic & Dynamic</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Speaking Pace</label>
                        <select
                          value={agentConfig.personality_traits.pace}
                          onChange={(e) => setAgentConfig({
                            ...agentConfig,
                            personality_traits: { ...agentConfig.personality_traits, pace: e.target.value }
                          })}
                          className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                        >
                          <option value="slow">Slow - Deliberate & Clear</option>
                          <option value="normal">Normal - Natural Pace</option>
                          <option value="fast">Fast - Quick & Efficient</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Configuration */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold mb-4 flex items-center">
                      <Brain className="h-5 w-5 mr-2 text-yellow-400" />
                      Agent Instructions & Behavior
                    </h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Detailed Instructions *
                      </label>
                      <textarea
                        value={agentConfig.prompt_instructions}
                        onChange={(e) => setAgentConfig({...agentConfig, prompt_instructions: e.target.value})}
                        rows={8}
                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 resize-vertical"
                        placeholder="Describe in detail how your AI agent should behave, what its goals are, how it should interact with callers, what questions to ask, how to handle objections, when to book meetings, etc. Be as specific as possible for best results."
                      />
                      <p className="text-xs text-gray-400 mt-2">
                        💡 Tip: The more detailed and specific your instructions, the better your AI agent will perform. Include examples of conversations, common objections, and desired outcomes.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-4 flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-green-400" />
                      System Integrations
                    </h4>
                    
                    <div className="space-y-3">
                      {Object.entries(agentConfig.integration_settings).map(([key, value]) => (
                        <label key={key} className="flex items-center space-x-3 p-3 bg-gray-900/30 rounded-lg hover:bg-gray-900/50 transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => setAgentConfig({
                              ...agentConfig,
                              integration_settings: { ...agentConfig.integration_settings, [key]: e.target.checked }
                            })}
                            className="w-5 h-5 text-yellow-400 bg-gray-900 border-gray-600 rounded focus:ring-yellow-400 focus:ring-2"
                          />
                          <div className="flex-1">
                            <span className="text-gray-300 font-medium capitalize">{key} Integration</span>
                            <p className="text-xs text-gray-400">
                              {key === 'crm' && 'Connect to your CRM system for lead management'}
                              {key === 'calendar' && 'Enable automatic meeting scheduling'}
                              {key === 'email' && 'Send follow-up emails automatically'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-gray-700/50">
                <button
                  onClick={saveAgentConfig}
                  disabled={isCreatingAgent || !agentConfig.name.trim() || !agentConfig.prompt_instructions.trim()}
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/25 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isCreatingAgent ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      <span>Creating Agent...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>{selectedAgent ? 'Update Agent' : 'Create Agent'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={cancelForm}
                  className="px-6 py-3 bg-gray-600 text-white font-medium rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Existing Agents List */}
          {!showForm && (
            <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6 flex items-center">
                <Users className="h-6 w-6 mr-3 text-blue-400" />
                Your AI Agents ({agents.length})
              </h3>
              
              {agents.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="h-16 w-16 mx-auto mb-6 text-gray-500 opacity-50" />
                  <h4 className="text-xl font-semibold mb-2 text-gray-400">No AI Agents Yet</h4>
                  <p className="text-gray-500 mb-6">
                    Create your first AI agent to start automating your sales calls and lead qualification process.
                  </p>
                  <button 
                    onClick={startCreatingAgent}
                    className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/25 flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Create Your First Agent</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {agents.map(agent => (
                    <div key={agent.id} className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-6 hover:border-yellow-400/30 transition-all group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full ${
                            agent.status === 'active' ? 'bg-green-400 shadow-lg shadow-green-400/50' : 
                            agent.status === 'paused' ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' : 
                            'bg-blue-400 shadow-lg shadow-blue-400/50'
                          }`}></div>
                          <div>
                            <h4 className="font-bold text-lg">{agent.name}</h4>
                            <p className="text-sm text-gray-400">Voice: {agent.voice_id}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                          agent.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                          agent.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' : 
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm text-gray-300 line-clamp-3">
                          {agent.prompt_instructions}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 mb-4">
                        <div>
                          <span className="block">Phone:</span>
                          <span className="font-medium text-gray-300">{agent.phone_number || 'Not set'}</span>
                        </div>
                        <div>
                          <span className="block">Updated:</span>
                          <span className="font-medium text-gray-300">{new Date(agent.updated_at || '').toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => editAgent(agent)}
                          className="flex-1 bg-blue-500/20 text-blue-400 py-2 px-3 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => toggleAgentStatus(agent.id!)}
                          className={`py-2 px-3 rounded-lg transition-colors flex items-center justify-center ${
                            agent.status === 'active' 
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          }`}
                        >
                          {agent.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => deleteAgent(agent.id!)}
                          className="bg-red-500/20 text-red-400 py-2 px-3 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};