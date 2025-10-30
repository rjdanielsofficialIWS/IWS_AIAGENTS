import React, { useState, useEffect } from 'react';
import { 
  Brain, Plus, Edit3, Trash2, Copy, Play, Pause, Phone, 
  MoreVertical, Search, Filter, SortAsc, Eye
} from 'lucide-react';
import { vapiAI } from '../../services/vapiAI';
import { VapiAssistant } from '../../types/vapi';
import { format } from 'date-fns';

interface AssistantsListProps {
  onCreateNew: () => void;
  onEdit: (assistant: VapiAssistant) => void;
}

export const AssistantsList: React.FC<AssistantsListProps> = ({
  onCreateNew,
  onEdit
}) => {
  const [assistants, setAssistants] = useState<VapiAssistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'updated_at'>('updated_at');
  const [filterProvider, setFilterProvider] = useState<string>('all');

  useEffect(() => {
    loadAssistants();
  }, []);

  const loadAssistants = async () => {
    try {
      setLoading(true);
      const assistantsData = await vapiAI.getAssistants();
      setAssistants(assistantsData);
    } catch (error) {
      console.error('Failed to load assistants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assistantId: string) => {
    if (!confirm('Are you sure you want to delete this assistant? This action cannot be undone.')) {
      return;
    }

    try {
      await vapiAI.deleteAssistant(assistantId);
      setAssistants(assistants.filter(assistant => assistant.id !== assistantId));
    } catch (error) {
      console.error('Failed to delete assistant:', error);
    }
  };

  const handleDuplicate = async (assistant: VapiAssistant) => {
    try {
      const duplicatedAssistant = await vapiAI.duplicateAssistant(
        assistant.id!,
        `${assistant.name} (Copy)`
      );
      setAssistants([duplicatedAssistant, ...assistants]);
    } catch (error) {
      console.error('Failed to duplicate assistant:', error);
    }
  };

  const filteredAndSortedAssistants = assistants
    .filter(assistant => {
      const matchesSearch = assistant.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProvider = filterProvider === 'all' || assistant.voice.provider === filterProvider;
      return matchesSearch && matchesProvider;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created_at':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        case 'updated_at':
          return new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime();
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading assistants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Assistants</h1>
          <p className="text-gray-400">Create and manage your AI-powered voice assistants</p>
        </div>
        
        <button
          onClick={onCreateNew}
          className="mt-4 sm:mt-0 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/25 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Create Assistant</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
              placeholder="Search assistants..."
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 appearance-none"
            >
              <option value="all">All Providers</option>
              <option value="elevenlabs">ElevenLabs</option>
              <option value="playht">PlayHT</option>
              <option value="rime-ai">Rime AI</option>
              <option value="deepgram">Deepgram</option>
            </select>
          </div>

          <div className="relative">
            <SortAsc className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 appearance-none"
            >
              <option value="updated_at">Recently Updated</option>
              <option value="created_at">Recently Created</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assistants Grid */}
      {filteredAndSortedAssistants.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-12 text-center">
          <Brain className="h-16 w-16 mx-auto mb-6 text-gray-500 opacity-50" />
          <h3 className="text-xl font-semibold mb-2 text-gray-400">
            {searchTerm || filterProvider !== 'all' ? 'No assistants found' : 'No AI Assistants Yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filterProvider !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first AI assistant to start automating your voice interactions'
            }
          </p>
          {!searchTerm && filterProvider === 'all' && (
            <button
              onClick={onCreateNew}
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/25 flex items-center space-x-2 mx-auto"
            >
              <Plus className="h-5 w-5" />
              <span>Create Your First Assistant</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedAssistants.map((assistant) => (
            <div key={assistant.id} className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 hover:border-yellow-400/30 transition-all group">
              {/* Assistant Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-yellow-400/10 p-3 rounded-lg">
                    <Brain className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-white">{assistant.name}</h4>
                    <p className="text-sm text-gray-400">
                      {assistant.voice.provider} • {assistant.model.provider}
                    </p>
                  </div>
                </div>
                
                <div className="relative">
                  <button className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Assistant Details */}
              <div className="mb-4">
                <p className="text-sm text-gray-300 line-clamp-2 mb-3">
                  {assistant.model.systemMessage || assistant.firstMessage}
                </p>
                
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
                  <div>
                    <span className="block">Voice:</span>
                    <span className="font-medium text-gray-300 capitalize">{assistant.voice.voiceId}</span>
                  </div>
                  <div>
                    <span className="block">Model:</span>
                    <span className="font-medium text-gray-300">{assistant.model.model}</span>
                  </div>
                  <div>
                    <span className="block">Created:</span>
                    <span className="font-medium text-gray-300">
                      {assistant.created_at ? format(new Date(assistant.created_at), 'MMM d') : 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="block">Recording:</span>
                    <span className={`font-medium ${assistant.recordingEnabled ? 'text-green-400' : 'text-red-400'}`}>
                      {assistant.recordingEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onEdit(assistant)}
                  className="flex-1 bg-blue-500/20 text-blue-400 py-2 px-3 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit</span>
                </button>
                
                <button
                  onClick={() => handleDuplicate(assistant)}
                  className="bg-green-500/20 text-green-400 py-2 px-3 rounded-lg hover:bg-green-500/30 transition-colors flex items-center justify-center"
                  title="Duplicate"
                >
                  <Copy className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => handleDelete(assistant.id!)}
                  className="bg-red-500/20 text-red-400 py-2 px-3 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};