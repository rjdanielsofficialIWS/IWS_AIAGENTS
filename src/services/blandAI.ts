import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export interface AIAgent {
  id?: string;
  user_id?: string;
  name: string;
  prompt_instructions: string;
  voice_id: string;
  personality_traits: Record<string, any>;
  integration_settings: Record<string, any>;
  phone_number?: string;
  status: 'active' | 'paused' | 'training';
  created_at?: string;
  updated_at?: string;
}

export interface CallRequest {
  phone_number: string;
  task: string;
  voice_id?: string;
  agent_id?: string;
  reduce_latency?: boolean;
  model?: string;
  language?: string;
  max_duration?: number;
  answered_by_enabled?: boolean;
  wait_for_greeting?: boolean;
  record?: boolean;
  amd?: boolean;
  interruption_threshold?: number;
  voicemail_message?: string;
  temperature?: number;
  keywords?: string[];
  metadata?: Record<string, any>;
}

export interface CallRecord {
  id: string;
  user_id: string;
  agent_id?: string;
  call_id: string;
  phone_number: string;
  task: string;
  status: string;
  call_length: number;
  transcripts: Array<{
    text: string;
    user: string;
    timestamp: number;
  }>;
  recording_url?: string;
  summary?: string;
  answered_by?: string;
  analysis?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

class BlandAIService {
  private getAuthHeaders() {
    return {
      'Authorization': `Bearer ${supabase.auth.getSession().then(({ data }) => data.session?.access_token)}`,
      'Content-Type': 'application/json',
    };
  }

  private async makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}) {
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      throw new Error('User not authenticated');
    }

    const headers = {
      'Authorization': `Bearer ${session.data.session.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bland-ai${endpoint}`,
      {
        ...options,
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // AI Agent Management
  async createAgent(agent: Omit<AIAgent, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<AIAgent> {
    const data = await this.makeAuthenticatedRequest('/agents', {
      method: 'POST',
      body: JSON.stringify(agent),
    });
    return data.agent;
  }

  async updateAgent(agentId: string, updates: Partial<AIAgent>): Promise<AIAgent> {
    const data = await this.makeAuthenticatedRequest('/agents', {
      method: 'POST',
      body: JSON.stringify({ id: agentId, ...updates }),
    });
    return data.agent;
  }

  async getAgents(): Promise<AIAgent[]> {
    const data = await this.makeAuthenticatedRequest('/agents');
    return data.agents;
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.makeAuthenticatedRequest(`/agents/${agentId}`, {
      method: 'DELETE',
    });
  }

  // Call Management
  async initiateCall(callRequest: CallRequest): Promise<{ call_id: string; status: string }> {
    const data = await this.makeAuthenticatedRequest('/call', {
      method: 'POST',
      body: JSON.stringify(callRequest),
    });
    return data;
  }

  async getCalls(): Promise<CallRecord[]> {
    const data = await this.makeAuthenticatedRequest('/calls');
    return data.calls;
  }

  async getCall(callId: string): Promise<CallRecord> {
    const data = await this.makeAuthenticatedRequest(`/call/${callId}`);
    return data;
  }

  // Utility methods
  async getCallAnalytics(dateRange?: { start: string; end: string }) {
    const calls = await this.getCalls();
    
    let filteredCalls = calls;
    if (dateRange) {
      filteredCalls = calls.filter(call => {
        const callDate = new Date(call.created_at);
        return callDate >= new Date(dateRange.start) && callDate <= new Date(dateRange.end);
      });
    }

    const totalCalls = filteredCalls.length;
    const completedCalls = filteredCalls.filter(call => call.status === 'completed').length;
    const totalDuration = filteredCalls.reduce((sum, call) => sum + call.call_length, 0);
    const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    return {
      totalCalls,
      completedCalls,
      completionRate: totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0,
      totalDuration,
      averageDuration,
      callsByStatus: filteredCalls.reduce((acc, call) => {
        acc[call.status] = (acc[call.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // Voice options (these would typically come from Bland AI API)
  getAvailableVoices() {
    return [
      { id: 'sarah', name: 'Sarah', description: 'Professional female voice' },
      { id: 'david', name: 'David', description: 'Confident male voice' },
      { id: 'emma', name: 'Emma', description: 'Friendly female voice' },
      { id: 'james', name: 'James', description: 'Authoritative male voice' },
      { id: 'maya', name: 'Maya', description: 'Warm female voice' },
      { id: 'alex', name: 'Alex', description: 'Neutral voice' },
    ];
  }
}

export const blandAI = new BlandAIService();