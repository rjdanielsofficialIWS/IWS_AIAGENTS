import React, { useEffect, useState } from 'react';
import { Brain, Plus, Edit, Trash, Phone, MessageSquare, X } from 'lucide-react';
import { vapiAI } from '../../services/vapiAI';
import { VapiAssistant } from '../../types/vapi';
import { WebCallInterface } from '../WebCallInterface';
import { WebChatInterface } from '../WebChatInterface';

interface AssistantsListProps {
  onCreateNew: () => void;
  onEdit: (assistant: VapiAssistant) => void;
}

export const AssistantsList: React.FC<AssistantsListProps> = ({ onCreateNew, onEdit }) => {
  const [assistants, setAssistants] = useState<VapiAssistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingAssistant, setTestingAssistant] = useState<VapiAssistant | null>(null);
  const [testMode, setTestMode] = useState<'call' | 'chat'>('call');

  useEffect(() => {
    loadAssistants();
  }, []);

  const loadAssistants = async () => {
    try {
      setLoading(true);
      const data = await vapiAI.getAssistants();
      setAssistants(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load assistants');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assistant?')) return;

    try {
      await vapiAI.deleteAssistant(id);
      setAssistants(assistants.filter((a) => a.id !== id));
    } catch (err: any) {
      alert('Failed to delete assistant: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p className="text-gray-300">Loading assistants...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadAssistants}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const handleTestAssistant = (assistant: VapiAssistant) => {
    setTestingAssistant(assistant);
    setTestMode('call');
  };

  const closeTestModal = () => {
    setTestingAssistant(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">AI Assistants</h2>
          <p className="text-gray-400">Manage your AI voice agents</p>
        </div>
        <button
          onClick={onCreateNew}
          className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Create Assistant</span>
        </button>
      </div>

      {assistants.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-12 text-center">
          <Brain className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
          <h3 className="text-xl font-semibold mb-2 text-gray-400">No Assistants Yet</h3>
          <p className="text-gray-500 mb-6">Create your first AI assistant to get started</p>
          <button
            onClick={onCreateNew}
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all"
          >
            Create Your First Assistant
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assistants.map((assistant) => (
            <div
              key={assistant.id}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-yellow-400/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-yellow-400/10 w-12 h-12 rounded-lg flex items-center justify-center">
                  <Brain className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(assistant)}
                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(assistant.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">{assistant.name}</h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                {assistant.firstMessage || 'No description'}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Phone className="h-3 w-3" />
                  <span>Voice: {assistant.voice?.provider || 'Default'}</span>
                </div>
                <button
                  onClick={() => handleTestAssistant(assistant)}
                  className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium px-3 py-1 rounded-lg transition-all text-xs"
                >
                  Test Agent
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {testingAssistant && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700 shadow-2xl">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold">Test Your Agent</h3>
                <p className="text-gray-400 text-sm mt-1">{testingAssistant.name}</p>
              </div>
              <button
                onClick={closeTestModal}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="mb-6 flex space-x-4">
                <button
                  onClick={() => setTestMode('call')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                    testMode === 'call'
                      ? 'bg-blue-500/30 border-2 border-blue-400 text-blue-400'
                      : 'bg-gray-800/50 border border-gray-700 hover:border-blue-400/50 text-gray-400'
                  }`}
                >
                  <Phone className="h-5 w-5" />
                  <span>Web Call</span>
                </button>
                <button
                  onClick={() => setTestMode('chat')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                    testMode === 'chat'
                      ? 'bg-green-500/30 border-2 border-green-400 text-green-400'
                      : 'bg-gray-800/50 border border-gray-700 hover:border-green-400/50 text-gray-400'
                  }`}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Web Chat</span>
                </button>
              </div>

              {testMode === 'call' ? (
                <WebCallInterface
                  assistantId={testingAssistant.id}
                  publicKey={import.meta.env.VITE_VAPI_PUBLIC_KEY}
                />
              ) : (
                <WebChatInterface
                  assistantId={testingAssistant.id}
                  publicKey={import.meta.env.VITE_VAPI_PUBLIC_KEY}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
