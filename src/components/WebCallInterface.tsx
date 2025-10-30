import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Loader } from 'lucide-react';

interface WebCallInterfaceProps {
  assistantId: string;
  publicKey: string;
}

declare global {
  interface Window {
    vapiSDK?: any;
  }
}

export const WebCallInterface: React.FC<WebCallInterfaceProps> = ({
  assistantId,
  publicKey
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [vapiInstance, setVapiInstance] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<string>('Ready to call');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/index.js';
    script.async = true;

    script.onload = () => {
      if (window.vapiSDK) {
        const vapi = new window.vapiSDK(publicKey);

        vapi.on('call-start', () => {
          setIsCallActive(true);
          setCallStatus('Call started');
        });

        vapi.on('call-end', () => {
          setIsCallActive(false);
          setCallStatus('Call ended');
        });

        vapi.on('speech-start', () => {
          setCallStatus('Listening...');
        });

        vapi.on('speech-end', () => {
          setCallStatus('Processing...');
        });

        vapi.on('error', (error: any) => {
          console.error('Vapi error:', error);
          setCallStatus('Error occurred');
          setIsCallActive(false);
        });

        setVapiInstance(vapi);
        setIsLoading(false);
      }
    };

    document.body.appendChild(script);

    return () => {
      if (vapiInstance) {
        vapiInstance.stop();
      }
      const existingScript = document.querySelector('script[src*="vapi-ai"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, [publicKey]);

  const startCall = async () => {
    if (!vapiInstance || isCallActive) return;

    try {
      setCallStatus('Starting call...');
      await vapiInstance.start(assistantId);
    } catch (error) {
      console.error('Error starting call:', error);
      setCallStatus('Failed to start call');
      setIsCallActive(false);
    }
  };

  const endCall = () => {
    if (!vapiInstance || !isCallActive) return;

    try {
      vapiInstance.stop();
      setCallStatus('Ending call...');
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8">
      <div className="text-center">
        <div className="bg-blue-400/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <Phone className="h-12 w-12 text-blue-400" />
        </div>

        <h3 className="text-2xl font-bold mb-2">Web Call Testing</h3>
        <p className="text-gray-400 mb-6">
          Test your AI agent with a live web call
        </p>

        {/* Call Status */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-400 mb-1">Status</p>
          <p className="text-lg font-medium text-white">{callStatus}</p>
        </div>

        {/* Call Controls */}
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2 text-gray-400">
            <Loader className="h-5 w-5 animate-spin" />
            <span>Loading call interface...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {!isCallActive ? (
              <button
                onClick={startCall}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/25 flex items-center justify-center space-x-2"
              >
                <Phone className="h-5 w-5" />
                <span>Start Call</span>
              </button>
            ) : (
              <button
                onClick={endCall}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-red-500/25 flex items-center justify-center space-x-2"
              >
                <PhoneOff className="h-5 w-5" />
                <span>End Call</span>
              </button>
            )}

            <p className="text-xs text-gray-500">
              Click the button above to start a live call with your AI agent
            </p>
          </div>
        )}
      </div>
    </div>
  );
};