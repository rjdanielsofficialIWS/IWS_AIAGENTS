import React, { useState } from 'react';
import { 
  Brain, Settings, BarChart3, Phone, MessageSquare, Calendar, 
  User, LogOut, Save, Play, Pause, Edit3, Trash2, Plus,
  TrendingUp, Clock, CheckCircle, AlertCircle, Volume2,
  Mic, PhoneCall, Mail, Zap, Target, Users, DollarSign
} from 'lucide-react';

interface AIAgent {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'training';
  type: 'sales' | 'support' | 'booking';
  callsToday: number;
  conversionsToday: number;
  lastActive: string;
}

interface ClientPortalProps {
  onLogout: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [agents, setAgents] = useState<AIAgent[]>([
    {
      id: '1',
      name: 'Sales Agent Pro',
      status: 'active',
      type: 'sales',
      callsToday: 47,
      conversionsToday: 12,
      lastActive: '2 minutes ago'
    },
    {
      id: '2',
      name: 'Support Assistant',
      status: 'paused',
      type: 'support',
      callsToday: 23,
      conversionsToday: 8,
      lastActive: '1 hour ago'
    }
  ]);

  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [agentConfig, setAgentConfig] = useState({
    name: '',
    personality: 'professional',
    voice: 'sarah',
    responseTime: 'immediate',
    workingHours: '9am-5pm',
    script: '',
    objectives: '',
    escalationRules: '',
    integrations: {
      crm: false,
      calendar: false,
      email: false
    }
  });

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'agents', label: 'AI Agents', icon: Brain },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const toggleAgentStatus = (agentId: string) => {
    setAgents(agents.map(agent => 
      agent.id === agentId 
        ? { ...agent, status: agent.status === 'active' ? 'paused' : 'active' }
        : agent
    ));
  };

  const deleteAgent = (agentId: string) => {
    setAgents(agents.filter(agent => agent.id !== agentId));
  };

  const saveAgentConfig = () => {
    if (selectedAgent) {
      setAgents(agents.map(agent => 
        agent.id === selectedAgent.id 
          ? { ...agent, name: agentConfig.name || agent.name }
          : agent
      ));
      setSelectedAgent(null);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Phone className="h-8 w-8 text-blue-400" />
            <span className="text-2xl font-bold text-blue-400">247</span>
          </div>
          <p className="text-gray-300">Total Calls Today</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Target className="h-8 w-8 text-green-400" />
            <span className="text-2xl font-bold text-green-400">34</span>
          </div>
          <p className="text-gray-300">Conversions Today</p>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 text-yellow-400" />
            <span className="text-2xl font-bold text-yellow-400">$12.4k</span>
          </div>
          <p className="text-gray-300">Revenue Generated</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold text-purple-400">89</span>
          </div>
          <p className="text-gray-300">Leads Qualified</p>
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
                    {agent.callsToday} calls • {agent.conversionsToday} conversions
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">{agent.lastActive}</span>
                <button
                  onClick={() => toggleAgentStatus(agent.id)}
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
        </div>
      </div>
    </div>
  );

  const renderAgents = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">AI Agents Management</h2>
        <button className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-medium py-2 px-4 rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all flex items-center space-x-2">
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
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    agent.type === 'sales' ? 'bg-blue-500/20 text-blue-400' :
                    agent.type === 'support' ? 'bg-green-500/20 text-green-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {agent.type}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedAgent(agent);
                      setAgentConfig({
                        name: agent.name,
                        personality: 'professional',
                        voice: 'sarah',
                        responseTime: 'immediate',
                        workingHours: '9am-5pm',
                        script: '',
                        objectives: '',
                        escalationRules: '',
                        integrations: { crm: false, calendar: false, email: false }
                      });
                    }}
                    className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleAgentStatus(agent.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      agent.status === 'active' 
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    {agent.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => deleteAgent(agent.id)}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Calls Today:</span>
                  <span className="ml-2 font-medium">{agent.callsToday}</span>
                </div>
                <div>
                  <span className="text-gray-400">Conversions:</span>
                  <span className="ml-2 font-medium">{agent.conversionsToday}</span>
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
                  <span className="text-gray-400">Last Active:</span>
                  <span className="ml-2 font-medium">{agent.lastActive}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedAgent && (
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-6">Configure Agent: {selectedAgent.name}</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Agent Name</label>
                <input
                  type="text"
                  value={agentConfig.name}
                  onChange={(e) => setAgentConfig({...agentConfig, name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Personality</label>
                <select
                  value={agentConfig.personality}
                  onChange={(e) => setAgentConfig({...agentConfig, personality: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="consultative">Consultative</option>
                  <option value="assertive">Assertive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Voice</label>
                <select
                  value={agentConfig.voice}
                  onChange={(e) => setAgentConfig({...agentConfig, voice: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                >
                  <option value="sarah">Sarah (Female, Professional)</option>
                  <option value="david">David (Male, Confident)</option>
                  <option value="emma">Emma (Female, Friendly)</option>
                  <option value="james">James (Male, Authoritative)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Working Hours</label>
                <input
                  type="text"
                  value={agentConfig.workingHours}
                  onChange={(e) => setAgentConfig({...agentConfig, workingHours: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                  placeholder="e.g., 9am-5pm EST"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Call Script</label>
                <textarea
                  value={agentConfig.script}
                  onChange={(e) => setAgentConfig({...agentConfig, script: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                  placeholder="Enter your custom call script..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Objectives</label>
                <textarea
                  value={agentConfig.objectives}
                  onChange={(e) => setAgentConfig({...agentConfig, objectives: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                  placeholder="What should this agent achieve?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Integrations</label>
                <div className="space-y-3">
                  {Object.entries(agentConfig.integrations).map(([key, value]) => (
                    <label key={key} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setAgentConfig({
                          ...agentConfig,
                          integrations: { ...agentConfig.integrations, [key]: e.target.checked }
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
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-medium py-2 px-4 rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all flex items-center justify-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Configuration</span>
                </button>
                <button
                  onClick={() => setSelectedAgent(null)}
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

  const renderAnalytics = () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Analytics & Performance</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Call Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Calls This Month</span>
              <span className="font-bold text-blue-400">1,247</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Average Call Duration</span>
              <span className="font-bold text-green-400">4:32</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Conversion Rate</span>
              <span className="font-bold text-yellow-400">23.4%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Revenue Generated</span>
              <span className="font-bold text-purple-400">$47,890</span>
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
                  <div className="font-bold text-blue-400">{agent.callsToday} calls</div>
                  <div className="text-sm text-gray-400">{((agent.conversionsToday / agent.callsToday) * 100).toFixed(1)}% conversion</div>
                </div>
              </div>
            ))}
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
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        </div>
      </div>
    </div>
  );
};