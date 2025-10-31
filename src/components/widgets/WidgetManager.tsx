import React, { useState, useEffect } from 'react';
import { Code, Save, Eye, EyeOff, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../services/vapiAI';
import { useAuth } from '../../contexts/AuthContext';

interface Widget {
  id: string;
  widget_type: string;
  widget_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function WidgetManager() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [voiceCode, setVoiceCode] = useState('');
  const [chatCode, setChatCode] = useState('');
  const [customCode, setCustomCode] = useState('');

  useEffect(() => {
    if (user) {
      fetchWidgets();
    }
  }, [user]);

  const fetchWidgets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('widgets')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setWidgets(data);
        data.forEach((widget) => {
          if (widget.widget_type === 'voice') setVoiceCode(widget.widget_code);
          if (widget.widget_type === 'chat') setChatCode(widget.widget_code);
          if (widget.widget_type === 'custom') setCustomCode(widget.widget_code);
        });
      }
    } catch (error) {
      console.error('Error fetching widgets:', error);
      setMessage({ type: 'error', text: 'Failed to load widgets' });
    } finally {
      setLoading(false);
    }
  };

  const saveWidget = async (type: string, code: string) => {
    if (!user) return;

    try {
      setSaving(true);
      setMessage(null);

      const existingWidget = widgets.find((w) => w.widget_type === type);

      if (existingWidget) {
        const { error } = await supabase
          .from('widgets')
          .update({
            widget_code: code,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingWidget.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('widgets').insert({
          user_id: user.id,
          widget_type: type,
          widget_code: code,
          is_active: true,
        });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: `${type} widget saved successfully!` });
      await fetchWidgets();
    } catch (error) {
      console.error('Error saving widget:', error);
      setMessage({ type: 'error', text: 'Failed to save widget' });
    } finally {
      setSaving(false);
    }
  };

  const toggleWidgetStatus = async (widget: Widget) => {
    try {
      const { error } = await supabase
        .from('widgets')
        .update({ is_active: !widget.is_active })
        .eq('id', widget.id);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: `Widget ${!widget.is_active ? 'activated' : 'deactivated'}`,
      });
      await fetchWidgets();
    } catch (error) {
      console.error('Error toggling widget:', error);
      setMessage({ type: 'error', text: 'Failed to update widget status' });
    }
  };

  const deleteWidget = async (widget: Widget) => {
    if (!confirm('Are you sure you want to delete this widget?')) return;

    try {
      const { error } = await supabase.from('widgets').delete().eq('id', widget.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Widget deleted successfully' });

      if (widget.widget_type === 'voice') setVoiceCode('');
      if (widget.widget_type === 'chat') setChatCode('');
      if (widget.widget_type === 'custom') setCustomCode('');

      await fetchWidgets();
    } catch (error) {
      console.error('Error deleting widget:', error);
      setMessage({ type: 'error', text: 'Failed to delete widget' });
    }
  };

  const WidgetSection = ({
    title,
    description,
    type,
    code,
    setCode,
    placeholder,
  }: {
    title: string;
    description: string;
    type: string;
    code: string;
    setCode: (code: string) => void;
    placeholder: string;
  }) => {
    const widget = widgets.find((w) => w.widget_type === type);

    return (
      <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
          {widget && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleWidgetStatus(widget)}
                className={`p-2 rounded-lg transition-colors ${
                  widget.is_active
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                }`}
                title={widget.is_active ? 'Deactivate' : 'Activate'}
              >
                {widget.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button
                onClick={() => deleteWidget(widget)}
                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                title="Delete widget"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={placeholder}
          className="w-full h-48 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all resize-vertical"
        />

        <button
          onClick={() => saveWidget(type, code)}
          disabled={saving || !code.trim()}
          className="mt-4 w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
        >
          <Save className="h-5 w-5" />
          <span>{saving ? 'Saving...' : 'Save Widget'}</span>
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Widget Manager</h2>
        <p className="text-gray-400">
          Paste your Vapi widget embed codes below. They will appear on your demo page at{' '}
          <a href="/demo" target="_blank" className="text-yellow-400 hover:text-yellow-300">
            /demo
          </a>
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/50'
              : 'bg-red-500/10 border-red-500/50'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400" />
          )}
          <p className={message.type === 'success' ? 'text-green-300' : 'text-red-300'}>
            {message.text}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <WidgetSection
          title="Voice Agent Widget"
          description="Paste the embed code for your voice AI agent"
          type="voice"
          code={voiceCode}
          setCode={setVoiceCode}
          placeholder='<script src="..."></script> or <iframe src="..."></iframe>'
        />

        <WidgetSection
          title="Chat Agent Widget"
          description="Paste the embed code for your chat AI agent"
          type="chat"
          code={chatCode}
          setCode={setChatCode}
          placeholder='<script src="..."></script> or <iframe src="..."></iframe>'
        />

        <WidgetSection
          title="Custom Widget"
          description="Paste any additional custom widget code"
          type="custom"
          code={customCode}
          setCode={setCustomCode}
          placeholder='<script src="..."></script> or <iframe src="..."></iframe>'
        />
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Code className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-300">
            <p className="font-semibold mb-1">How to use:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-300/90">
              <li>Copy the embed code from your Vapi dashboard</li>
              <li>Paste it into the appropriate textarea above</li>
              <li>Click "Save Widget" to make it live</li>
              <li>Visit your demo page to see the widget in action</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
