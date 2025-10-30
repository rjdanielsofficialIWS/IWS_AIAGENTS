import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Loader, Brain } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user' | 'viewer';
  requiredMembership?: 'free' | 'premium' | 'enterprise';
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredRole = 'user',
  requiredMembership = 'free',
  fallback
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4">
            <Brain className="h-12 w-12 text-yellow-400 animate-pulse" />
          </div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return fallback || (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-16 w-16 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-300">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  // Check role permissions
  const roleHierarchy = { viewer: 0, user: 1, admin: 2 };
  const userRoleLevel = roleHierarchy[user.role];
  const requiredRoleLevel = roleHierarchy[requiredRole];

  if (userRoleLevel < requiredRoleLevel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-16 w-16 text-red-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-300">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Check membership requirements
  const membershipHierarchy = { free: 0, premium: 1, enterprise: 2 };
  const userMembershipLevel = membershipHierarchy[user.membership_status];
  const requiredMembershipLevel = membershipHierarchy[requiredMembership];

  if (userMembershipLevel < requiredMembershipLevel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-16 w-16 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Upgrade Required</h2>
          <p className="text-gray-300 mb-6">
            You need a {requiredMembership} membership to access this feature.
          </p>
          <button
            onClick={() => window.location.href = '/pricing'}
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};