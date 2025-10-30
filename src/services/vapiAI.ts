import { createClient } from '@supabase/supabase-js';
import {
  VapiAssistant,
  VapiPhoneNumber,
  VapiCall,
  VapiWebhook,
  VapiAnalytics,
  VapiSquad,
  CreateCallRequest,
  VapiError
} from '../types/vapi';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class VapiAIService {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const baseUrl = `${supabaseUrl}/functions/v1/vapi-ai`;
    const url = `${baseUrl}${endpoint}`;

    // Get the current user's session token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: VapiError;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText, statusCode: response.status };
      }
      
      throw new Error(errorData.message || `API request failed: ${response.status}`);
    }

    return await response.json();
  }

  // Assistant Management
  async createAssistant(assistant: Omit<VapiAssistant, 'id' | 'created_at' | 'updated_at'>): Promise<VapiAssistant> {
    const data = await this.makeRequest('/assistants', {
      method: 'POST',
      body: JSON.stringify(assistant),
    });
    return data;
  }

  async getAssistants(): Promise<VapiAssistant[]> {
    const data = await this.makeRequest('/assistants');
    return data || [];
  }

  async getAssistant(assistantId: string): Promise<VapiAssistant> {
    const data = await this.makeRequest(`/assistants/${assistantId}`);
    return data;
  }

  async updateAssistant(assistantId: string, updates: Partial<VapiAssistant>): Promise<VapiAssistant> {
    const data = await this.makeRequest(`/assistants/${assistantId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return data;
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    await this.makeRequest(`/assistants/${assistantId}`, {
      method: 'DELETE',
    });
  }

  // Phone Number Management
  async getPhoneNumbers(): Promise<VapiPhoneNumber[]> {
    const data = await this.makeRequest('/phone-numbers');
    return data || [];
  }

  async createPhoneNumber(phoneNumber: Omit<VapiPhoneNumber, 'id' | 'created_at' | 'updated_at'>): Promise<VapiPhoneNumber> {
    const data = await this.makeRequest('/phone-numbers', {
      method: 'POST',
      body: JSON.stringify(phoneNumber),
    });
    return data;
  }

  async updatePhoneNumber(phoneNumberId: string, updates: Partial<VapiPhoneNumber>): Promise<VapiPhoneNumber> {
    const data = await this.makeRequest(`/phone-numbers/${phoneNumberId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return data;
  }

  async deletePhoneNumber(phoneNumberId: string): Promise<void> {
    await this.makeRequest(`/phone-numbers/${phoneNumberId}`, {
      method: 'DELETE',
    });
  }

  // Call Management
  async createCall(callRequest: CreateCallRequest): Promise<VapiCall> {
    const data = await this.makeRequest('/calls', {
      method: 'POST',
      body: JSON.stringify(callRequest),
    });
    return data;
  }

  async getCalls(limit?: number, createdAtGt?: string, createdAtLt?: string): Promise<VapiCall[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (createdAtGt) params.append('createdAtGt', createdAtGt);
    if (createdAtLt) params.append('createdAtLt', createdAtLt);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/calls?${queryString}` : '/calls';
    
    const data = await this.makeRequest(endpoint);
    return data || [];
  }

  async getCall(callId: string): Promise<VapiCall> {
    const data = await this.makeRequest(`/calls/${callId}`);
    return data;
  }

  async updateCall(callId: string, updates: Partial<VapiCall>): Promise<VapiCall> {
    const data = await this.makeRequest(`/calls/${callId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return data;
  }

  async deleteCall(callId: string): Promise<void> {
    await this.makeRequest(`/calls/${callId}`, {
      method: 'DELETE',
    });
  }

  // Webhook Management
  async getWebhooks(): Promise<VapiWebhook[]> {
    const data = await this.makeRequest('/webhooks');
    return data || [];
  }

  async createWebhook(webhook: Omit<VapiWebhook, 'id' | 'created_at' | 'updated_at'>): Promise<VapiWebhook> {
    const data = await this.makeRequest('/webhooks', {
      method: 'POST',
      body: JSON.stringify(webhook),
    });
    return data;
  }

  async updateWebhook(webhookId: string, updates: Partial<VapiWebhook>): Promise<VapiWebhook> {
    const data = await this.makeRequest(`/webhooks/${webhookId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.makeRequest(`/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
  }

  // Squad Management (for complex call routing)
  async getSquads(): Promise<VapiSquad[]> {
    const data = await this.makeRequest('/squads');
    return data || [];
  }

  async createSquad(squad: Omit<VapiSquad, 'id' | 'created_at' | 'updated_at'>): Promise<VapiSquad> {
    const data = await this.makeRequest('/squads', {
      method: 'POST',
      body: JSON.stringify(squad),
    });
    return data;
  }

  async updateSquad(squadId: string, updates: Partial<VapiSquad>): Promise<VapiSquad> {
    const data = await this.makeRequest(`/squads/${squadId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return data;
  }

  async deleteSquad(squadId: string): Promise<void> {
    await this.makeRequest(`/squads/${squadId}`, {
      method: 'DELETE',
    });
  }

  // Analytics and Metrics
  async getAnalytics(startDate?: string, endDate?: string): Promise<VapiAnalytics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/analytics?${queryString}` : '/analytics';
    
    const data = await this.makeRequest(endpoint);
    return data;
  }

  // Voice Management
  async getAvailableVoices(provider?: string): Promise<Array<{
    id: string;
    name: string;
    provider: string;
    language: string;
    gender: string;
    preview_url?: string;
  }>> {
    const params = provider ? `?provider=${provider}` : '';
    const data = await this.makeRequest(`/voices${params}`);
    return data || [];
  }

  // Model Management
  async getAvailableModels(): Promise<Array<{
    id: string;
    name: string;
    provider: string;
    maxTokens: number;
    costPer1kTokens: number;
  }>> {
    const data = await this.makeRequest('/models');
    return data || [];
  }

  // Real-time Call Monitoring
  subscribeToCallUpdates(callId: string, onUpdate: (call: VapiCall) => void): () => void {
    // This would typically use WebSocket connection
    // For now, we'll implement polling as a fallback
    const interval = setInterval(async () => {
      try {
        const call = await this.getCall(callId);
        onUpdate(call);
        
        // Stop polling if call has ended
        if (call.status === 'ended') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error fetching call update:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }

  // Utility Methods
  async testAssistant(assistantId: string, testPhoneNumber: string): Promise<VapiCall> {
    return this.createCall({
      assistantId,
      customer: {
        number: testPhoneNumber,
        name: 'Test Call'
      },
      metadata: {
        isTest: true
      }
    });
  }

  async duplicateAssistant(assistantId: string, newName: string): Promise<VapiAssistant> {
    const originalAssistant = await this.getAssistant(assistantId);
    const { id, created_at, updated_at, ...assistantData } = originalAssistant;
    
    return this.createAssistant({
      ...assistantData,
      name: newName
    });
  }

  // Database Operations for User Agents
  async saveAgentToDatabase(agentData: {
    name: string;
    prompt: string;
    vapi_assistant_id: string;
    enhanced_prompt?: string;
    voice_provider?: string;
    voice_id?: string;
    model?: string;
    first_message?: string;
  }): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to save agents');
    }

    const { data, error } = await supabase
      .from('user_agents')
      .insert({
        user_id: user.id,
        name: agentData.name,
        prompt: agentData.prompt,
        vapi_assistant_id: agentData.vapi_assistant_id,
        enhanced_prompt: agentData.enhanced_prompt,
        voice_provider: agentData.voice_provider || 'playht',
        voice_id: agentData.voice_id,
        model: agentData.model || 'gpt-4',
        first_message: agentData.first_message || 'Hello! How can I help you today?',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save agent to database: ${error.message}`);
    }

    return data;
  }

  async getAgentFromDatabase(agentId: string): Promise<any> {
    const { data, error } = await supabase
      .from('user_agents')
      .select('*')
      .eq('id', agentId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get agent from database: ${error.message}`);
    }

    return data;
  }

  async getUserAgentsFromDatabase(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated');
    }

    const { data, error } = await supabase
      .from('user_agents')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user agents: ${error.message}`);
    }

    return data || [];
  }

  async updateAgentInDatabase(agentId: string, updates: any): Promise<any> {
    const { data, error } = await supabase
      .from('user_agents')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update agent in database: ${error.message}`);
    }

    return data;
  }

  async deleteAgentFromDatabase(agentId: string): Promise<void> {
    const { error } = await supabase
      .from('user_agents')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', agentId);

    if (error) {
      throw new Error(`Failed to delete agent from database: ${error.message}`);
    }
  }

  async incrementTestCallCount(agentId: string): Promise<void> {
    const { error } = await supabase.rpc('increment', {
      row_id: agentId,
      x: 1
    });

    if (error) {
      await supabase
        .from('user_agents')
        .update({
          test_calls_count: supabase.raw('test_calls_count + 1'),
          updated_at: new Date().toISOString()
        })
        .eq('id', agentId);
    }
  }

  // Integration helpers
  formatPhoneNumber(number: string): string {
    // Remove all non-digit characters
    const cleaned = number.replace(/\D/g, '');

    // Add + prefix if not present
    if (!cleaned.startsWith('1') && cleaned.length === 10) {
      return `+1${cleaned}`;
    }

    return `+${cleaned}`;
  }

  validatePhoneNumber(number: string): boolean {
    const cleaned = number.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  calculateCallCost(call: VapiCall): number {
    return call.costBreakdown?.total || call.cost || 0;
  }

  getCallDuration(call: VapiCall): number {
    if (!call.startedAt || !call.endedAt) return 0;

    const start = new Date(call.startedAt);
    const end = new Date(call.endedAt);
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }
}

export const vapiAI = new VapiAIService();
export { supabase };