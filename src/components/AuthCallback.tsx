import React, { useEffect, useState } from 'react';
import { Brain, CheckCircle, AlertCircle, Loader, ArrowLeft } from 'lucide-react';

interface AuthCallbackProps {
  onReturn: () => void;
}

export const AuthCallback: React.FC<AuthCallbackProps> = ({ onReturn }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');
  const [authCode, setAuthCode] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Parse URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');

        if (error) {
          setStatus('error');
          setMessage(`Authentication failed: ${error}`);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received from Google');
          return;
        }

        setAuthCode(code);
        console.log('Authorization code received:', code);
        console.log('Service state:', state);

        // TODO: Send the authorization code to backend (Supabase Edge Function)
        // For now, we'll simulate the process
        setMessage('Authorization code received successfully!');
        
        // Simulate backend processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setStatus('success');
        setMessage(`Successfully connected to Google ${state || 'services'}!`);

        // Auto-redirect back to portal after 3 seconds
        setTimeout(() => {
          onReturn();
        }, 3000);

      } catch (err) {
        console.error('Error processing callback:', err);
        setStatus('error');
        setMessage('An unexpected error occurred during authentication');
      }
    };

    processCallback();
  }, [onReturn]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 text-center">
          {/* Header */}
          <div className="flex items-center justify-center space-x-3 mb-6">
            <Brain className="h-10 w-10 text-yellow-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-blue-400 bg-clip-text text-transparent">
              Google Integration
            </h1>
          </div>

          {/* Status Icon */}
          <div className="mb-6">
            {status === 'loading' && (
              <div className="bg-blue-400/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <Loader className="h-10 w-10 text-blue-400 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="bg-green-400/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-400" />
              </div>
            )}
            {status === 'error' && (
              <div className="bg-red-400/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-10 w-10 text-red-400" />
              </div>
            )}
          </div>

          {/* Message */}
          <h2 className="text-xl font-semibold mb-4">
            {status === 'loading' && 'Connecting to Google...'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </h2>

          <p className="text-gray-300 mb-6">{message}</p>

          {/* Debug Info (only show in development) */}
          {authCode && import.meta.env.DEV && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6 text-left">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Debug Info:</h3>
              <p className="text-xs text-gray-500 break-all">
                Auth Code: {authCode.substring(0, 20)}...
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {status === 'success' && (
              <p className="text-sm text-gray-400">
                Redirecting to portal in a few seconds...
              </p>
            )}
            
            <button
              onClick={onReturn}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-medium py-3 px-6 rounded-lg transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Portal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};