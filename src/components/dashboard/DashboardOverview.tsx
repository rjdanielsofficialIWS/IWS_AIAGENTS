import React from 'react';
import { Brain, Phone, MessageSquare, TrendingUp } from 'lucide-react';

export function DashboardOverview() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Brain className="h-8 w-8 text-yellow-400" />
            <span className="text-2xl font-bold">0</span>
          </div>
          <p className="text-gray-400">Active Assistants</p>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Phone className="h-8 w-8 text-blue-400" />
            <span className="text-2xl font-bold">0</span>
          </div>
          <p className="text-gray-400">Phone Numbers</p>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <MessageSquare className="h-8 w-8 text-green-400" />
            <span className="text-2xl font-bold">0</span>
          </div>
          <p className="text-gray-400">Total Calls</p>
        </div>

        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold">0</span>
          </div>
          <p className="text-gray-400">Call Minutes</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
        <p className="text-gray-400">No recent activity to display</p>
      </div>
    </div>
  );
}
