-- Add trial_expires_at to subscriptions for no-CC 7-day free trials
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;
