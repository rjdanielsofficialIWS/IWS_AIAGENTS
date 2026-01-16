import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, ExternalLink, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/vapiAI';
import { useAuth } from '../../contexts/AuthContext';

interface DemoPage {
  slug: string;
  assistant_id: string;
  system_prompt: string;
  first_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function DemoPagesManager() {
  const { user } = useAuth();
  const [demoPages, setDemoPages] = useState<DemoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPage, setEditingPage] = useState<DemoPage | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    slug: '',
    assistant_id: '',
    system_prompt: '',
    first_message: '',
    is_active: true,
  });

  useEffect(() => {
    fetchDemoPages();
  }, []);

  const fetchDemoPages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('demo_pages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDemoPages(data || []);
    } catch (error) {
      console.error('Error fetching demo pages:', error);
      setMessage({ type: 'error', text: 'Failed to load demo pages' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      if (editingPage) {
        const { error } = await supabase
          .from('demo_pages')
          .update({
            assistant_id: formData.assistant_id,
            system_prompt: formData.system_prompt,
            first_message: formData.first_message,
            is_active: formData.is_active,
          })
          .eq('slug', editingPage.slug);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Demo page updated successfully!' });
      } else {
        const { error } = await supabase.from('demo_pages').insert([formData]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Demo page created successfully!' });
      }

      resetForm();
      await fetchDemoPages();
    } catch (error: any) {
      console.error('Error saving demo page:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to save demo page',
      });
    }
  };

  const handleEdit = (page: DemoPage) => {
    setEditingPage(page);
    setFormData({
      slug: page.slug,
      assistant_id: page.assistant_id,
      system_prompt: page.system_prompt,
      first_message: page.first_message,
      is_active: page.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Are you sure you want to delete the demo page "${slug}"?`)) return;

    try {
      const { error } = await supabase.from('demo_pages').delete().eq('slug', slug);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Demo page deleted successfully!' });
      await fetchDemoPages();
    } catch (error) {
      console.error('Error deleting demo page:', error);
      setMessage({ type: 'error', text: 'Failed to delete demo page' });
    }
  };

  const toggleActive = async (page: DemoPage) => {
    try {
      const { error } = await supabase
        .from('demo_pages')
        .update({ is_active: !page.is_active })
        .eq('slug', page.slug);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: `Demo page ${!page.is_active ? 'activated' : 'deactivated'}!`,
      });
      await fetchDemoPages();
    } catch (error) {
      console.error('Error toggling demo page status:', error);
      setMessage({ type: 'error', text: 'Failed to update demo page status' });
    }
  };

  const resetForm = () => {
    setFormData({
      slug: '',
      assistant_id: '',
      system_prompt: '',
      first_message: '',
      is_active: true,
    });
    setEditingPage(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-12 w-12 animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Demo Pages Manager</h2>
          <p className="text-gray-400">
            Create and manage dynamic demo pages with custom AI agents
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-xl transition-all flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create Demo Page</span>
          </button>
        )}
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

      {showForm && (
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-8">
          <h3 className="text-2xl font-bold mb-6">
            {editingPage ? 'Edit Demo Page' : 'Create New Demo Page'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Slug (URL Path)
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                disabled={!!editingPage}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g., demo, john, business-demo"
                required
              />
              <p className="text-sm text-gray-400 mt-1">
                This will be the URL: infinitewealthsolutionsai.com/{formData.slug || 'your-slug'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Assistant ID
              </label>
              <input
                type="text"
                value={formData.assistant_id}
                onChange={(e) => setFormData({ ...formData, assistant_id: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400"
                placeholder="e.g., 1c22f716-7cbb-499c-9546-0e23f9ccafcb"
                required
              />
              <p className="text-sm text-gray-400 mt-1">
                The Vapi AI assistant ID from your Vapi dashboard
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                System Prompt
              </label>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 resize-vertical"
                placeholder="Define how the AI assistant should behave..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                First Message
              </label>
              <textarea
                value={formData.first_message}
                onChange={(e) => setFormData({ ...formData, first_message: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 resize-vertical"
                placeholder="The initial greeting message..."
                required
              />
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 text-yellow-400 bg-gray-900 border-gray-600 rounded focus:ring-yellow-400 focus:ring-2"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-300">
                Active (publicly accessible)
              </label>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-xl transition-all"
              >
                {editingPage ? 'Update Demo Page' : 'Create Demo Page'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!showForm && (
        <div className="grid grid-cols-1 gap-6">
          {demoPages.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl">
              <p className="text-gray-400 mb-4">No demo pages yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-3 px-6 rounded-xl transition-all"
              >
                Create Your First Demo Page
              </button>
            </div>
          ) : (
            demoPages.map((page) => (
              <div
                key={page.slug}
                className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-white">/{page.slug}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          page.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {page.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      Assistant ID: {page.assistant_id}
                    </p>
                    {page.system_prompt && (
                      <p className="text-sm text-gray-300 mb-2">{page.system_prompt}</p>
                    )}
                    <p className="text-sm text-gray-400 italic">
                      First message: "{page.first_message}"
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <a
                      href={`/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                      title="View demo page"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => toggleActive(page)}
                      className={`p-2 rounded-lg transition-colors ${
                        page.is_active
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                      }`}
                      title={page.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {page.is_active ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(page)}
                      className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                      title="Edit demo page"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(page.slug)}
                      className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      title="Delete demo page"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
