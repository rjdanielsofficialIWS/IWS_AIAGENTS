import React from 'react';
import { Brain, Phone, MessageSquare, Settings, Users, CreditCard, Key, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, currentPage, onPageChange }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'assistants', icon: Brain, label: 'Assistants' },
    { id: 'phone-numbers', icon: Phone, label: 'Phone Numbers' },
    { id: 'calls', icon: MessageSquare, label: 'Calls' },
    { id: 'team', icon: Users, label: 'Team' },
    { id: 'billing', icon: CreditCard, label: 'Billing' },
    { id: 'api-keys', icon: Key, label: 'API Keys' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-gray-800/50 border-r border-gray-700/50 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
              IWS AI
            </h1>
            <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  currentPage === item.id
                    ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            ))}

            <button
              onClick={() => logout()}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors mt-8"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
