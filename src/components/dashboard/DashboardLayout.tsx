import React from 'react';
import { Brain, Phone, MessageSquare, Users, CreditCard, Key, Settings, LogOut, Code } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export function DashboardLayout({ children, currentPage, onPageChange }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Brain },
    { id: 'assistants', label: 'Assistants', icon: Brain },
    { id: 'widgets', label: 'Widget Manager', icon: Code },
    { id: 'phone-numbers', label: 'Phone Numbers', icon: Phone },
    { id: 'calls', label: 'Calls', icon: MessageSquare },
    { id: 'webhooks', label: 'Webhooks', icon: MessageSquare },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-gray-800/30 backdrop-blur-xl border-r border-gray-700/50 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
              IWS AI
            </h1>
            <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    currentPage === item.id
                      ? 'bg-yellow-400/20 text-yellow-400'
                      : 'text-gray-400 hover:bg-gray-700/30 hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={signOut}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors mt-4"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
