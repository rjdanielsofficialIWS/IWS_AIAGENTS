import React, { useState } from 'react';
import { 
  Brain, Settings, Phone, MessageSquare, Calendar, 
  User, LogOut, CheckCircle, AlertCircle
} from 'lucide-react';

interface ClientPortalProps {
  onLogout: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('connections');
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isZoomConnected, setIsZoomConnected] = useState(false);

  const tabs = [
    { id: 'connections', label: 'Connections', icon: Settings }
  ];

  const renderConnections = () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Manage Your Connections</h2>

      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 space-y-6">
        {/* Google Integration */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <img src="https://www.google.com/images/branding/googleg/2x/googleg_standard_color_64dp.png" alt="Google" className="h-6 w-6 mr-2" />
            Google Integration
          </h3>
          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
            <div className="flex items-center space-x-3">
              {isGoogleConnected ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              )}
              <span className="font-medium">
                Status: {isGoogleConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsGoogleConnected(true)}
                disabled={isGoogleConnected}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect
              </button>
              <button
                onClick={() => setIsGoogleConnected(false)}
                disabled={!isGoogleConnected}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>

        {/* Zoom Integration */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Zoom_Logo.svg/1200px-Zoom_Logo.svg.png" alt="Zoom" className="h-6 w-6 mr-2" />
            Zoom Integration
          </h3>
          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
            <div className="flex items-center space-x-3">
              {isZoomConnected ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              )}
              <span className="font-medium">
                Status: {isZoomConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsZoomConnected(true)}
                disabled={isZoomConnected}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect
              </button>
              <button
                onClick={() => setIsZoomConnected(false)}
                disabled={!isZoomConnected}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Disconnect
              </button>
            </div>
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
            {renderConnections()}
          </div>
        </div>
      </div>
    </div>
  );
};