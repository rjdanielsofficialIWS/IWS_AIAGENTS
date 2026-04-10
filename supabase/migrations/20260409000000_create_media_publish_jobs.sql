CREATE TABLE IF NOT EXISTS media_publish_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NULL,
  cf_uid TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  post_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ NULL,
  post_group_id TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending_media'
    CHECK (status IN ('pending_media', 'processing', 'dispatched', 'error')),
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT NULL,
  last_event JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_publish_jobs_user_idx
  ON media_publish_jobs (supabase_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS media_publish_jobs_cf_uid_idx
  ON media_publish_jobs (cf_uid, status);

CREATE INDEX IF NOT EXISTS media_publish_jobs_status_idx
  ON media_publish_jobs (status, created_at DESC);

DROP TRIGGER IF EXISTS update_media_publish_jobs_updated_at ON media_publish_jobs;
CREATE TRIGGER update_media_publish_jobs_updated_at
  BEFORE UPDATE ON media_publish_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
