/*
  # Create Google OAuth tokens table

  1. New Tables
    - `user_google_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `service` (text, which Google service)
      - `access_token` (text, encrypted access token)
      - `refresh_token` (text, encrypted refresh token)
      - `expires_at` (timestamp, when access token expires)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_google_tokens` table
    - Add policy for users to read/write their own tokens only
    - Add unique constraint on user_id + service combination

  3. Indexes
    - Index on user_id for fast lookups
    - Index on service for filtering
    - Index on expires_at for cleanup queries
*/

-- Create the user_google_tokens table
CREATE TABLE IF NOT EXISTS user_google_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service text NOT NULL CHECK (service IN ('gmail', 'calendar', 'sheets', 'meet', 'drive')),
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  scope text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one token set per user per service
  UNIQUE(user_id, service)
);

-- Enable Row Level Security
ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own tokens
CREATE POLICY "Users can manage their own Google tokens"
  ON user_google_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_google_tokens_user_id 
  ON user_google_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_user_google_tokens_service 
  ON user_google_tokens(service);

CREATE INDEX IF NOT EXISTS idx_user_google_tokens_expires_at 
  ON user_google_tokens(expires_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_google_tokens_updated_at
  BEFORE UPDATE ON user_google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired tokens (optional utility)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM user_google_tokens 
  WHERE expires_at < now() - interval '7 days'
    AND refresh_token IS NULL;
END;
$$ language 'plpgsql';