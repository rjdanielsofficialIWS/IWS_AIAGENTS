/*
  # AI Agents and Calls Tables

  1. New Tables
    - `ai_agents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `name` (text)
      - `prompt_instructions` (text)
      - `voice_id` (text)
      - `personality_traits` (jsonb)
      - `integration_settings` (jsonb)
      - `phone_number` (text, optional for inbound)
      - `status` (text: active, paused, training)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `ai_agent_calls`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `agent_id` (uuid, foreign key to ai_agents, optional)
      - `call_id` (text, Bland AI call ID)
      - `phone_number` (text)
      - `task` (text)
      - `status` (text)
      - `call_length` (integer, seconds)
      - `transcripts` (jsonb)
      - `recording_url` (text)
      - `summary` (text)
      - `answered_by` (text)
      - `analysis` (jsonb)
      - `metadata` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Create ai_agents table
CREATE TABLE IF NOT EXISTS ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  prompt_instructions text NOT NULL,
  voice_id text DEFAULT 'sarah',
  personality_traits jsonb DEFAULT '{}',
  integration_settings jsonb DEFAULT '{}',
  phone_number text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'training')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ai_agent_calls table
CREATE TABLE IF NOT EXISTS ai_agent_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES ai_agents(id) ON DELETE SET NULL,
  call_id text UNIQUE NOT NULL,
  phone_number text NOT NULL,
  task text NOT NULL,
  status text DEFAULT 'initiated',
  call_length integer DEFAULT 0,
  transcripts jsonb DEFAULT '[]',
  recording_url text,
  summary text,
  answered_by text,
  analysis jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_calls ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_agents
CREATE POLICY "Users can manage their own AI agents"
  ON ai_agents
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for ai_agent_calls
CREATE POLICY "Users can manage their own AI agent calls"
  ON ai_agent_calls
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_agents_user_id ON ai_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_calls_user_id ON ai_agent_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_calls_call_id ON ai_agent_calls(call_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_calls_status ON ai_agent_calls(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_calls_created_at ON ai_agent_calls(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agent_calls_updated_at
  BEFORE UPDATE ON ai_agent_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();