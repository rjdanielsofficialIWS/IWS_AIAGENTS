import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requirePremium?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requirePremium = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requirePremium && user.membership_status !== 'premium' && user.membership_status !== 'enterprise') {
    return null;
  }

  return <>{children}</>;
};
