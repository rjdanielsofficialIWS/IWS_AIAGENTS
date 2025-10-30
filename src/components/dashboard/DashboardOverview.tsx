import React from 'react';
import { Brain, Phone, MessageSquare, TrendingUp } from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  const stats = [
    { icon: Brain, label: 'Total Assistants', value: '0', color: 'yellow' },
    { icon: Phone, label: 'Total Calls', value: '0', color: 'blue' },
    { icon: MessageSquare, label: 'Active Conversations', value: '0', color: 'green' },
    { icon: TrendingUp, label: 'Success Rate', value: '0%', color: 'purple' }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Dashboard Overview</h2>
        <p className="text-gray-400">Monitor your AI agents and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
          >
            <div className={`bg-${stat.color}-400/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
              <stat.icon className={`h-6 w-6 text-${stat.color}-400`} />
            </div>
            <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 text-center">
        <Brain className="h-16 w-16 mx-auto mb-4 text-yellow-400 opacity-50" />
        <h3 className="text-xl font-semibold mb-2">Welcome to Your Dashboard</h3>
        <p className="text-gray-400 mb-6">
          Create your first AI assistant to get started with automated calls and conversations
        </p>
        <button className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all">
          Create Your First Assistant
        </button>
      </div>
    </div>
  );
};
