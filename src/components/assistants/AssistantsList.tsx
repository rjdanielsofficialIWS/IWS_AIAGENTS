import React from 'react';
import { Brain, Plus } from 'lucide-react';
import { VapiAssistant } from '../../types/vapi';

interface AssistantsListProps {
  onCreateNew: () => void;
  onEdit: (assistant: VapiAssistant) => void;
}

export function AssistantsList({ onCreateNew, onEdit }: AssistantsListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">AI Assistants</h2>
        <button
          onClick={onCreateNew}
          className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Create Assistant</span>
        </button>
      </div>

      <div className="text-center py-12">
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
    </div>
  );
}
