export interface VapiAssistant {
  id: string;
  name: string;
  description?: string;
  voice?: string;
  model?: string;
  firstMessage?: string;
  systemPrompt?: string;
  createdAt?: string;
  updatedAt?: string;
}
