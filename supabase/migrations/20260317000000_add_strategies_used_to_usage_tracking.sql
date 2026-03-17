-- Add strategies_used column to usage_tracking for per-month strategy count limiting
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS strategies_used INTEGER NOT NULL DEFAULT 0;

-- Extend increment_usage RPC to support the new field
CREATE OR REPLACE FUNCTION increment_usage(p_user_id UUID, p_period TEXT, p_field TEXT)
RETURNS VOID AS $$
BEGIN
  IF p_field = 'ai_analyses_used' THEN
    UPDATE usage_tracking SET ai_analyses_used = ai_analyses_used + 1
    WHERE supabase_user_id = p_user_id AND period = p_period;
  ELSIF p_field = 'posts_scheduled' THEN
    UPDATE usage_tracking SET posts_scheduled = posts_scheduled + 1
    WHERE supabase_user_id = p_user_id AND period = p_period;
  ELSIF p_field = 'strategies_used' THEN
    UPDATE usage_tracking SET strategies_used = strategies_used + 1
    WHERE supabase_user_id = p_user_id AND period = p_period;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
