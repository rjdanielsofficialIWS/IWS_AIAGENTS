/*
  # Create Visitors Table for Demo Landing Pages

  1. New Tables
    - `visitors`
      - `id` (uuid, primary key)
      - `name` (text) - Visitor identifier
      - `assistant_id` (text) - Vapi assistant ID
      - `public_key` (text) - Vapi public key
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `visitors` table
    - Add policy for public read access (since this is for demo pages)
  
  3. Default Data
    - Insert a default visitor record
*/

CREATE TABLE IF NOT EXISTS visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  assistant_id text NOT NULL,
  public_key text NOT NULL DEFAULT 'ebb2120b-ac56-4ce9-b1d5-17966931c665',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to visitors"
  ON visitors
  FOR SELECT
  TO public
  USING (true);

-- Insert default record
INSERT INTO visitors (name, assistant_id, public_key)
VALUES (
  'Default Visitor',
  '{{YOUR_ASSISTANT_ID}}',
  'ebb2120b-ac56-4ce9-b1d5-17966931c665'
) ON CONFLICT DO NOTHING;