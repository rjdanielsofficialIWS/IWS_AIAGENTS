/*
  # Create Demo Pages Table

  1. New Tables
    - `demo_pages`
      - `slug` (text, primary key) - URL identifier for the demo page
      - `assistant_id` (text) - Vapi AI assistant identifier
      - `system_prompt` (text) - AI assistant's system instructions
      - `first_message` (text) - Initial greeting message
      - `is_active` (boolean) - Whether the demo page is active
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `demo_pages` table
    - Add policy for public read access (demo pages are public)
    - Add policy for authenticated users to manage demo pages

  3. Initial Data
    - Insert a default "demo" record for testing
*/

-- Create demo_pages table
CREATE TABLE IF NOT EXISTS demo_pages (
  slug text PRIMARY KEY,
  assistant_id text NOT NULL,
  system_prompt text DEFAULT '',
  first_message text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE demo_pages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active demo pages (public access)
CREATE POLICY "Anyone can view active demo pages"
  ON demo_pages
  FOR SELECT
  USING (is_active = true);

-- Policy: Authenticated users can insert demo pages
CREATE POLICY "Authenticated users can insert demo pages"
  ON demo_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update demo pages
CREATE POLICY "Authenticated users can update demo pages"
  ON demo_pages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete demo pages
CREATE POLICY "Authenticated users can delete demo pages"
  ON demo_pages
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default demo record
INSERT INTO demo_pages (slug, assistant_id, system_prompt, first_message, is_active)
VALUES (
  'demo',
  '1c22f716-7cbb-499c-9546-0e23f9ccafcb',
  'You are a helpful AI assistant for Infinite Wealth Solutions. You help answer questions about our AI agent services, custom website development, and lead generation services.',
  'Hey, How can I help you today?',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for demo_pages
DROP TRIGGER IF EXISTS update_demo_pages_updated_at ON demo_pages;
CREATE TRIGGER update_demo_pages_updated_at
  BEFORE UPDATE ON demo_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
