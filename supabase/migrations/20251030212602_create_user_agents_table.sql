/*
  # Create User Agents Table

  1. New Tables
    - `user_agents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `vapi_assistant_id` (text, the ID from Vapi.ai)
      - `name` (text, agent name)
      - `prompt` (text, agent instructions/prompt)
      - `enhanced_prompt` (text, AI-enhanced version of prompt)
      - `voice_provider` (text, voice provider name)
      - `voice_id` (text, voice ID from provider)
      - `model` (text, AI model being used)
      - `first_message` (text, opening message)
      - `is_active` (boolean, whether agent is active)
      - `test_calls_count` (integer, number of test calls made)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `user_agents` table
    - Add policies for authenticated users to manage their own agents
    - Users can only access their own agents
*/

CREATE TABLE IF NOT EXISTS user_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vapi_assistant_id text,
  name text NOT NULL,
  prompt text NOT NULL,
  enhanced_prompt text,
  voice_provider text DEFAULT 'playht',
  voice_id text,
  model text DEFAULT 'gpt-4',
  first_message text DEFAULT 'Hello! How can I help you today?',
  is_active boolean DEFAULT true,
  test_calls_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agents"
  ON user_agents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own agents"
  ON user_agents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agents"
  ON user_agents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own agents"
  ON user_agents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_agents_user_id ON user_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_vapi_assistant_id ON user_agents(vapi_assistant_id);