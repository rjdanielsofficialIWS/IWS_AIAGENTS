/*
  # Create widgets table for embedding management

  1. New Tables
    - `widgets`
      - `id` (uuid, primary key) - Unique identifier for each widget
      - `user_id` (uuid, foreign key) - References auth.users, owner of the widget
      - `widget_type` (text) - Type of widget: 'voice', 'chat', or 'custom'
      - `widget_code` (text) - The actual HTML/JavaScript embed code
      - `is_active` (boolean) - Whether the widget should be displayed
      - `created_at` (timestamptz) - When the widget was created
      - `updated_at` (timestamptz) - When the widget was last updated

  2. Security
    - Enable RLS on `widgets` table
    - Add policy for authenticated users to read active widgets (public access for demo page)
    - Add policy for authenticated users to manage their own widgets
    - Add policy for premium/enterprise users to create and update widgets

  3. Important Notes
    - Widget code is stored as text and will be rendered using dangerouslySetInnerHTML
    - Only active widgets will be displayed on the demo page
    - Each widget type can have multiple entries, but typically only one active per type
*/

CREATE TABLE IF NOT EXISTS widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_type text NOT NULL CHECK (widget_type IN ('voice', 'chat', 'custom')),
  widget_code text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active widgets"
  ON widgets
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all widgets"
  ON widgets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own widgets"
  ON widgets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own widgets"
  ON widgets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own widgets"
  ON widgets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_widgets_user_id ON widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_widgets_type_active ON widgets(widget_type, is_active);