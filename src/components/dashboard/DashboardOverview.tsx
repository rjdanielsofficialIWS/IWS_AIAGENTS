import React, { useState, useEffect } from 'react';
import { 
  Brain, Phone, MessageSquare, TrendingUp, Clock, DollarSign,
  Users, Zap, Activity, Calendar, Target, AlertCircle
} from 'lucide-react';
import { vapiAI } from '../../services/vapiAI';
import { VapiAnalytics, VapiCall, VapiAssistant } from '../../types/vapi';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export const DashboardOverview: React.FC = () => {
  const [analytics, setAnalytics] = useState<VapiAnalytics | null>(null);
  const [recentCalls, setRecentCalls] = useState<VapiCall[]>([]);
  const [assistants, setAssistants] = useState<VapiAssistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(endDate, dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90));
      
      // Load analytics, recent calls, and assistants in parallel
      const [analyticsData, callsData, assistantsData] = await Promise.all([
        vapiAI.getAnalytics(startDate.toISOString(), endDate.toISOString()),
        vapiAI.getCalls(10), // Get last 10 calls
        vapiAI.getAssistants()
      ]);

      setAnalytics(analyticsData);
      setRecentCalls(callsData);
      setAssistants(assistantsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ended': return 'text-green-400 bg-green-400/10';
      case 'in-progress': return 'text-blue-400 bg-blue-400/10';
      case 'queued': return 'text-yellow-400 bg-yellow-400/10';
      case 'ringing': return 'text-purple-400 bg-purple-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
          <p className="text-gray-400">Monitor your AI agents' performance and activity</p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Calls</p>
              <p className="text-3xl font-bold text-white mt-1">
                {analytics?.totalCalls || 0}
              </p>
            </div>
            <div className="bg-blue-400/10 p-3 rounded-lg">
              <Phone className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
            <span className="text-green-400">+12%</span>
            <span className="text-gray-400 ml-1">vs last period</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Minutes</p>
              <p className="text-3xl font-bold text-white mt-1">
                {Math.round((analytics?.totalMinutes || 0) / 60)}h
              </p>
            </div>
            <div className="bg-green-400/10 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-green-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
            <span className="text-green-400">+8%</span>
            <span className="text-gray-400 ml-1">vs last period</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Success Rate</p>
              <p className="text-3xl font-bold text-white mt-1">
                {Math.round(analytics?.successRate || 0)}%
              </p>
            </div>
            <div className="bg-yellow-400/10 p-3 rounded-lg">
              <Target className="h-6 w-6 text-yellow-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
            <span className="text-green-400">+5%</span>
            <span className="text-gray-400 ml-1">vs last period</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Cost</p>
              <p className="text-3xl font-bold text-white mt-1">
                {formatCurrency(analytics?.totalCost || 0)}
              </p>
            </div>
            <div className="bg-purple-400/10 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-400">Avg per call: </span>
            <span className="text-white ml-1">
              {formatCurrency((analytics?.totalCost || 0) / Math.max(analytics?.totalCalls || 1, 1))}
            </span>
          </div>
        </div>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Calls */}
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-blue-400" />
              Recent Calls
            </h3>
            <button
              onClick={() => onPageChange('calls')}
              className="text-yellow-400 hover:text-yellow-300 text-sm font-medium"
            >
              View All
            </button>
          </div>

          <div className="space-y-4">
            {recentCalls.length === 0 ? (
              <div className="text-center py-8">
                <Phone className="h-12 w-12 mx-auto mb-4 text-gray-500 opacity-50" />
                <p className="text-gray-400">No recent calls</p>
                <p className="text-gray-500 text-sm">Start making calls with your AI agents</p>
              </div>
            ) : (
              recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg border border-gray-700/30">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(call.status).split(' ')[1]}`}></div>
                    <div>
                      <p className="text-white font-medium">{call.customer.number}</p>
                      <p className="text-gray-400 text-sm">
                        {format(new Date(call.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium capitalize ${getStatusColor(call.status).split(' ')[0]}`}>
                      {call.status}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {call.endedAt && call.startedAt 
                        ? formatDuration(Math.floor((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000))
                        : '--:--'
                      }
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Assistants */}
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center">
              <Brain className="h-5 w-5 mr-2 text-yellow-400" />
              AI Assistants
            </h3>
            <button
              onClick={() => onPageChange('assistants')}
              className="text-yellow-400 hover:text-yellow-300 text-sm font-medium"
            >
              Manage All
            </button>
          </div>

          <div className="space-y-4">
            {assistants.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-gray-500 opacity-50" />
                <p className="text-gray-400">No AI assistants created</p>
                <button
                  onClick={() => onPageChange('assistants')}
                  className="mt-3 text-yellow-400 hover:text-yellow-300 text-sm font-medium"
                >
                  Create Your First Assistant
                </button>
              </div>
            ) : (
              assistants.slice(0, 5).map((assistant) => (
                <div key={assistant.id} className="flex items-center justify-between p-4 bg-gray-900/30 rounded-lg border border-gray-700/30">
                  <div className="flex items-center space-x-3">
                    <div className="bg-yellow-400/10 p-2 rounded-lg">
                      <Brain className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{assistant.name}</p>
                      <p className="text-gray-400 text-sm">
                        {assistant.voice.provider} • {assistant.model.provider}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-green-400 text-sm font-medium">Active</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Call Status Distribution */}
      <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-green-400" />
          Call Status Distribution
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {analytics?.callsByStatus && Object.entries(analytics.callsByStatus).map(([status, count]) => (
            <div key={status} className="text-center p-4 bg-gray-900/30 rounded-lg">
              <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                status === 'ended' ? 'bg-green-400/10' :
                status === 'in-progress' ? 'bg-blue-400/10' :
                status === 'queued' ? 'bg-yellow-400/10' :
                'bg-gray-400/10'
              }`}>
                <div className={`w-6 h-6 rounded-full ${
                  status === 'ended' ? 'bg-green-400' :
                  status === 'in-progress' ? 'bg-blue-400' :
                  status === 'queued' ? 'bg-yellow-400' :
                  'bg-gray-400'
                }`}></div>
              </div>
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-gray-400 text-sm capitalize">{status.replace('-', ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-yellow-400" />
          Quick Actions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onPageChange('assistants')}
            className="p-6 bg-gradient-to-br from-yellow-400/10 to-yellow-500/10 border border-yellow-400/30 rounded-xl hover:border-yellow-400/50 transition-all group"
          >
            <Brain className="h-8 w-8 text-yellow-400 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="text-white font-semibold mb-2">Create AI Assistant</h4>
            <p className="text-gray-400 text-sm">Build a new AI agent for your business</p>
          </button>

          <button
            onClick={() => onPageChange('phone-numbers')}
            className="p-6 bg-gradient-to-br from-blue-400/10 to-blue-500/10 border border-blue-400/30 rounded-xl hover:border-blue-400/50 transition-all group"
          >
            <Phone className="h-8 w-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="text-white font-semibold mb-2">Add Phone Number</h4>
            <p className="text-gray-400 text-sm">Configure inbound phone numbers</p>
          </button>

          <button
            onClick={() => onPageChange('calls')}
            className="p-6 bg-gradient-to-br from-green-400/10 to-green-500/10 border border-green-400/30 rounded-xl hover:border-green-400/50 transition-all group"
          >
            <MessageSquare className="h-8 w-8 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="text-white font-semibold mb-2">Make Test Call</h4>
            <p className="text-gray-400 text-sm">Test your AI agents with a live call</p>
          </button>
        </div>
      </div>

      {/* Performance Insights */}
      {analytics && (
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-purple-400" />
            Performance Insights
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {formatDuration(Math.round(analytics.averageCallDuration))}
              </div>
              <p className="text-gray-400">Average Call Duration</p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {formatCurrency((analytics.totalCost / Math.max(analytics.totalCalls, 1)))}
              </div>
              <p className="text-gray-400">Cost Per Call</p>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {assistants.length}
              </div>
              <p className="text-gray-400">Active Assistants</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};