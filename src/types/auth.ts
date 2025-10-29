export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  membership_status: 'free' | 'premium' | 'enterprise' | 'cancelled';
  organization_id?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: 'free' | 'premium' | 'enterprise';
  settings: {
    vapi_api_key?: string;
    webhook_secret?: string;
    default_voice_provider?: string;
    default_model_provider?: string;
    call_recording_enabled?: boolean;
    analytics_enabled?: boolean;
  };
  billing_info?: {
    stripe_customer_id?: string;
    subscription_id?: string;
    current_period_end?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  organization?: Organization;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  first_name: string;
  last_name: string;
  organization_name?: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  timezone?: string;
  avatar_url?: string;
}