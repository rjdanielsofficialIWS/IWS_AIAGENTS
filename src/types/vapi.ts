// Vapi AI Types and Interfaces

export interface VapiAssistant {
  id?: string;
  name: string;
  model: {
    provider: 'openai' | 'anthropic' | 'together-ai';
    model: string;
    temperature?: number;
    maxTokens?: number;
    systemMessage?: string;
  };
  voice: {
    provider: 'elevenlabs' | 'playht' | 'rime-ai' | 'deepgram';
    voiceId: string;
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
  firstMessage?: string;
  firstMessageMode?: 'assistant-speaks-first' | 'assistant-waits-for-user';
  recordingEnabled?: boolean;
  hipaaEnabled?: boolean;
  clientMessages?: string[];
  serverMessages?: string[];
  silenceTimeoutSeconds?: number;
  maxDurationSeconds?: number;
  backgroundSound?: 'office' | 'none';
  backchannelingEnabled?: boolean;
  backgroundDenoisingEnabled?: boolean;
  modelOutputInMessagesEnabled?: boolean;
  transportConfigurations?: TransportConfiguration[];
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface TransportConfiguration {
  provider: 'twilio';
  timeout?: number;
  record?: boolean;
  recordingChannels?: 'mono' | 'dual';
}

export interface VapiPhoneNumber {
  id?: string;
  provider: 'twilio' | 'vonage' | 'vapi';
  number: string;
  assistantId?: string;
  name?: string;
  serverUrl?: string;
  serverUrlSecret?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VapiCall {
  id: string;
  orgId: string;
  assistantId?: string;
  phoneNumberId?: string;
  customer: {
    number: string;
    name?: string;
    email?: string;
  };
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended';
  type: 'inboundPhoneCall' | 'outboundPhoneCall' | 'webCall';
  startedAt?: string;
  endedAt?: string;
  cost?: number;
  costBreakdown?: {
    transport?: number;
    stt?: number;
    llm?: number;
    tts?: number;
    vapi?: number;
    total?: number;
  };
  messages?: VapiMessage[];
  phoneCallProvider?: 'twilio' | 'vonage' | 'vapi';
  phoneCallTransport?: 'pstn' | 'sip';
  phoneCallId?: string;
  artifact?: {
    messages?: VapiMessage[];
    messagesOpenAIFormatted?: any[];
    recordingUrl?: string;
    transcript?: string;
    stereoRecordingUrl?: string;
    summary?: string;
  };
  analysis?: {
    summary?: string;
    structuredData?: Record<string, any>;
    successEvaluation?: string;
  };
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface VapiMessage {
  role: 'assistant' | 'user' | 'system' | 'function' | 'tool';
  message: string;
  time: number;
  endTime?: number;
  secondsFromStart: number;
}

export interface VapiWebhook {
  id?: string;
  url: string;
  events: VapiWebhookEvent[];
  secret?: string;
  created_at?: string;
  updated_at?: string;
}

export type VapiWebhookEvent = 
  | 'assistant-request'
  | 'call-start'
  | 'call-end'
  | 'call-update'
  | 'function-call'
  | 'speech-start'
  | 'speech-end'
  | 'transcript'
  | 'hang'
  | 'tool-calls';

export interface VapiAnalytics {
  totalCalls: number;
  totalMinutes: number;
  totalCost: number;
  averageCallDuration: number;
  successRate: number;
  callsByStatus: Record<string, number>;
  callsByDate: Array<{
    date: string;
    calls: number;
    minutes: number;
    cost: number;
  }>;
  topAssistants: Array<{
    assistantId: string;
    name: string;
    calls: number;
    minutes: number;
    successRate: number;
  }>;
}

export interface VapiSquad {
  id?: string;
  name: string;
  members: Array<{
    assistantId: string;
    assistantDestinations?: Array<{
      type: 'assistant' | 'number' | 'sip';
      assistantId?: string;
      number?: string;
      sipUri?: string;
      message?: string;
    }>;
  }>;
  created_at?: string;
  updated_at?: string;
}

export interface VapiTool {
  type: 'function' | 'dtmf' | 'endCall' | 'voicemail';
  function?: {
    name: string;
    description?: string;
    parameters?: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
  dtmf?: {
    description?: string;
  };
  endCall?: {
    description?: string;
  };
  voicemail?: {
    description?: string;
  };
  server?: {
    url: string;
    secret?: string;
  };
}

export interface CreateCallRequest {
  assistantId?: string;
  assistant?: Partial<VapiAssistant>;
  phoneNumberId?: string;
  customer: {
    number: string;
    name?: string;
    email?: string;
  };
  metadata?: Record<string, any>;
}

export interface VapiError {
  message: string;
  code?: string;
  statusCode?: number;
}