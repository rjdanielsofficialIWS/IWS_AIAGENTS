/*
  # Update widgets table for global demo submissions

  1. Changes
    - Make user_id nullable to support anonymous/global widget submissions
    - Add constraint to ensure only one active widget per type for global submissions
    - Update RLS policies to allow anonymous users to insert global widgets
    - Create a function to automatically deactivate previous widgets when a new one is submitted

  2. Security
    - Allow anonymous inserts for global demo widgets (user_id = NULL)
    - Maintain existing policies for authenticated users
    - Ensure public can read active widgets for the demo page

  3. Important Notes
    - Global widgets (user_id = NULL) represent the public demo page widgets
    - When a new global widget is submitted, previous global widgets of the same type are deactivated
    - This ensures only the most recent submission per widget type is displayed
*/

-- Make user_id nullable to support anonymous submissions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widgets' AND column_name = 'user_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE widgets ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- Create a function to deactivate old widgets of the same type for global submissions
CREATE OR REPLACE FUNCTION deactivate_old_global_widgets()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for global widgets (user_id is NULL)
  IF NEW.user_id IS NULL AND NEW.is_active = true THEN
    -- Deactivate all other global widgets of the same type
    UPDATE widgets
    SET is_active = false
    WHERE widget_type = NEW.widget_type
      AND user_id IS NULL
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run the function
DROP TRIGGER IF EXISTS trigger_deactivate_old_global_widgets ON widgets;
CREATE TRIGGER trigger_deactivate_old_global_widgets
  AFTER INSERT OR UPDATE ON widgets
  FOR EACH ROW
  EXECUTE FUNCTION deactivate_old_global_widgets();

-- Update RLS policy to allow anonymous inserts for global widgets
DROP POLICY IF EXISTS "Anonymous users can insert global widgets" ON widgets;
CREATE POLICY "Anonymous users can insert global widgets"
  ON widgets
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Update RLS policy to allow anonymous updates for global widgets
DROP POLICY IF EXISTS "Anonymous users can update global widgets" ON widgets;
CREATE POLICY "Anonymous users can update global widgets"
  ON widgets
  FOR UPDATE
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- Create index for faster queries on global widgets
CREATE INDEX IF NOT EXISTS idx_widgets_global_active ON widgets(widget_type, is_active) WHERE user_id IS NULL;