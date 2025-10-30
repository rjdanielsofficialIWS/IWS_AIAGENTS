import React, { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { VapiAssistant } from '../../types/vapi';

interface AssistantBuilderProps {
  assistantId?: string;
  onBack: () => void;
  onSave: (assistant: VapiAssistant) => void;
}

export function AssistantBuilder({ assistantId, onBack, onSave }: AssistantBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [firstMessage, setFirstMessage] = useState('');

  const handleSave = () => {
    const assistant: VapiAssistant = {
      id: assistantId || Date.now().toString(),
      name,
      description,
      systemPrompt,
      firstMessage,
    };
    onSave(assistant);
  };

  return (
    <div>
      <div className="flex items-center mb-8">
        <button
          onClick={onBack}
          className="mr-4 text-gray-400 hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h2 className="text-3xl font-bold">
          {assistantId ? 'Edit Assistant' : 'Create New Assistant'}
        </h2>
      </div>

      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Assistant Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
            placeholder="e.g., Customer Service Assistant"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
            placeholder="Describe what this assistant does"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
            placeholder="Define the assistant's behavior and personality"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            First Message
          </label>
          <textarea
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
            placeholder="What should the assistant say first?"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all flex items-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>Save Assistant</span>
          </button>
        </div>
      </div>
    </div>
  );
}
