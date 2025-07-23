import React, { useState } from 'react';
import {
  Brain, Settings, Phone, MessageSquare, Calendar,
  User, LogOut, CheckCircle, AlertCircle
} from 'lucide-react';

interface ClientPortalProps {
  onLogout: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('connections'); // Changed initial tab
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isZoomConnected, setIsZoomConnected] = useState(false);

  const tabs = [
    { id: 'connections', label: 'Connections', icon: Settings }
  ];

  const renderConnections = () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Manage Your Connections</h2>

      {/* Google Integration */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Settings className="h-6 w-6 mr-2 text-blue-400" />
          Google Integration
        </h3>
        <div className="flex items-center space-x-3 mb-4">
          {isGoogleConnected ? (
            <span className="flex items-center text-green-400">
              <CheckCircle className="h-5 w-5 mr-2" /> Connected
            </span>
          ) : (
            <span className="flex items-center text-yellow-400">
              <AlertCircle className="h-5 w-5 mr-2" /> Not Connected
            </span>
          )}
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => setIsGoogleConnected(true)}
            disabled={isGoogleConnected}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect Google
          </button>
          <button
            onClick={() => setIsGoogleConnected(false)}
            disabled={!isGoogleConnected}
            className="flex-1 bg-gray-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Disconnect Google
          </button>
        </div>
      </div>

      {/* Zoom Integration */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Settings className="h-6 w-6 mr-2 text-blue-400" />
          Zoom Integration
        </h3>
        <div className="flex items-center space-x-3 mb-4">
          {isZoomConnected ? (
            <span className="flex items-center text-green-400">
              <CheckCircle className="h-5 w-5 mr-2" /> Connected
            </span>
          ) : (
            <span className="flex items-center text-yellow-400">
              <AlertCircle className="h-5 w-5 mr-2" /> Not Connected
            </span>
          )}
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => setIsZoomConnected(true)}
            disabled={isZoomConnected}
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect Zoom
          </button>
          <button
            onClick={() => setIsZoomConnected(false)}
            disabled={!isZoomConnected}
            className="flex-1 bg-gray-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Disconnect Zoom
          </button>
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
            {renderConnections()} {/* Directly render connections */}
          </div>
        </div>
      </div>
    </div>
  );
};
