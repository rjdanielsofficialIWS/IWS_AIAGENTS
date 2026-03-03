import { supabase } from './vapiAI';
import type {
  PostizConnectResponse,
  PostizCallbackResponse,
  MediaScheduleRequest,
  MediaScheduleResponse,
  PostizAccount,
} from '../types/postiz';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function initiatePostizConnect(): Promise<{
  success: boolean;
  oauth_url?: string;
  error?: string;
}> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${API_BASE}/postiz-connect`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to initiate connection' };
    }

    const data = (await response.json()) as PostizConnectResponse;
    return { success: true, oauth_url: data.oauth_url };
  } catch (error) {
    console.error('Error initiating Postiz connect:', error);
    return { success: false, error: 'Network error' };
  }
}

export async function getUserPostizAccount(): Promise<PostizAccount | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('postiz_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching Postiz account:', error);
      return null;
    }

    return data as PostizAccount | null;
  } catch (error) {
    console.error('Error in getUserPostizAccount:', error);
    return null;
  }
}

export async function scheduleMedia(
  request: MediaScheduleRequest
): Promise<MediaScheduleResponse> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${API_BASE}/media-schedule`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || 'Failed to schedule media',
      };
    }

    const data = (await response.json()) as MediaScheduleResponse;
    return { success: true, ...data };
  } catch (error) {
    console.error('Error scheduling media:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function hasPostizConnected(): Promise<boolean> {
  const account = await getUserPostizAccount();
  return !!account;
}

export async function getPostizConnectionStatus(): Promise<{
  connected: boolean;
  account_id?: string;
  connected_at?: string;
}> {
  const account = await getUserPostizAccount();
  if (!account) {
    return { connected: false };
  }

  return {
    connected: true,
    account_id: account.postiz_account_id,
    connected_at: account.connected_at,
  };
}
