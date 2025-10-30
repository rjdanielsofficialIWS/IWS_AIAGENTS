import React, { useEffect, useState } from 'react';
import { ArrowLeft, Save, Loader } from 'lucide-react';
import { vapiAI } from '../../services/vapiAI';
import { VapiAssistant } from '../../types/vapi';

interface AssistantBuilderProps {
  assistantId?: string;
  onBack: () => void;
  onSave: (assistant: VapiAssistant) => void;
}

export const AssistantBuilder: React.FC<AssistantBuilderProps> = ({ assistantId, onBack, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    firstMessage: '',
    systemPrompt: '',
    model: 'gpt-3.5-turbo',
    voice: {
      provider: 'playht',
      voiceId: 'jennifer'
    }
  });

  useEffect(() => {
    if (assistantId) {
      loadAssistant();
    }
  }, [assistantId]);

  const loadAssistant = async () => {
    if (!assistantId) return;

    try {
      setLoading(true);
      const assistant = await vapiAI.getAssistant(assistantId);
      setFormData({
        name: assistant.name,
        firstMessage: assistant.firstMessage || '',
        systemPrompt: assistant.model?.systemPrompt || '',
        model: assistant.model?.model || 'gpt-3.5-turbo',
        voice: assistant.voice || { provider: 'playht', voiceId: 'jennifer' }
      });
    } catch (err: any) {
      alert('Failed to load assistant: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const assistantData: any = {
        name: formData.name,
        firstMessage: formData.firstMessage,
        model: {
          provider: 'openai',
          model: formData.model,
          systemPrompt: formData.systemPrompt
        },
        voice: formData.voice
      };

      let result;
      if (assistantId) {
        result = await vapiAI.updateAssistant(assistantId, assistantData);
      } else {
        result = await vapiAI.createAssistant(assistantData);
      }

      onSave(result);
    } catch (err: any) {
      alert('Failed to save assistant: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
        <p className="text-gray-300">Loading assistant...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-3xl font-bold">{assistantId ? 'Edit' : 'Create'} Assistant</h2>
            <p className="text-gray-400">Configure your AI voice agent</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !formData.name}
          className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Save Assistant</span>
            </>
          )}
        </button>
      </div>

      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Assistant Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
            placeholder="e.g., Customer Support Agent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            First Message
          </label>
          <textarea
            value={formData.firstMessage}
            onChange={(e) => setFormData({ ...formData, firstMessage: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 resize-vertical"
            placeholder="What the assistant says when the call starts..."
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            System Prompt
          </label>
          <textarea
            value={formData.systemPrompt}
            onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 resize-vertical"
            placeholder="Instructions for how the assistant should behave..."
            rows={8}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            AI Model
          </label>
          <select
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
          >
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
          </select>
        </div>
      </div>
    </div>
  );
};
