import React, { useEffect, useState } from 'react';
import { Brain, Plus, Edit, Trash, Phone } from 'lucide-react';
import { vapiAI } from '../../services/vapiAI';
import { VapiAssistant } from '../../types/vapi';

interface AssistantsListProps {
  onCreateNew: () => void;
  onEdit: (assistant: VapiAssistant) => void;
}

export const AssistantsList: React.FC<AssistantsListProps> = ({ onCreateNew, onEdit }) => {
  const [assistants, setAssistants] = useState<VapiAssistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                  >
                    <Edit className="h-4 w-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(assistant.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">{assistant.name}</h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                {assistant.firstMessage || 'No description'}
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Phone className="h-3 w-3" />
                <span>Voice: {assistant.voice?.provider || 'Default'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
