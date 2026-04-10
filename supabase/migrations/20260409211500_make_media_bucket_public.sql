INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read access for media bucket'
  ) THEN
    CREATE POLICY "Public read access for media bucket"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'media');
  END IF;
END $$;
