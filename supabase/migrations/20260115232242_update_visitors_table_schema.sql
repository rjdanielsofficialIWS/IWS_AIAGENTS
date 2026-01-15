/*
  # Update Visitors Table Schema

  1. Modified Tables
    - `visitors` table
      - `name` (text) - Visitor name to replace "Visitor" in hero
      - `system_prompt` (text) - System prompt for Vapi voice and chat widgets
      - `first_message` (text) - First message for Vapi voice and chat widgets
      - `assistant_id` (text) - Vapi assistant ID (renamed from id for clarity)
      - Removed `public_key` column (now static in code)
  
  2. Data Migration
    - Update default record with new fields
*/

DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitors' AND column_name = 'system_prompt'
  ) THEN
    ALTER TABLE visitors ADD COLUMN system_prompt text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitors' AND column_name = 'first_message'
  ) THEN
    ALTER TABLE visitors ADD COLUMN first_message text DEFAULT '';
  END IF;

  -- Drop public_key column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitors' AND column_name = 'public_key'
  ) THEN
    ALTER TABLE visitors DROP COLUMN public_key;
  END IF;
END $$;

-- Update the default record
UPDATE visitors
SET 
  system_prompt = 'You are a helpful customer service representative. Be friendly, professional, and helpful.',
  first_message = 'Hello! How can I help you today?'
WHERE name = 'Default Visitor';
