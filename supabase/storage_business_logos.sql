-- ============================================================================
-- BUSINESS LOGO STORAGE BUCKET
-- Run in Supabase SQL Editor (project: pzyiffaaeqrpbzwymbmv / ap-southeast-1)
-- App uploads via supabase-js Storage API (not raw S3). S3 endpoint is optional.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-logos',
  'business-logos',
  true,
  3145728,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read (QR menus + admin UI need to load logos)
DROP POLICY IF EXISTS "Public read business logos" ON storage.objects;
CREATE POLICY "Public read business logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'business-logos');

-- Authenticated owners upload into their own userId folder: {userId}/logo_*.ext
DROP POLICY IF EXISTS "Users upload own business logos" ON storage.objects;
CREATE POLICY "Users upload own business logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users update own business logos" ON storage.objects;
CREATE POLICY "Users update own business logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'business-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users delete own business logos" ON storage.objects;
CREATE POLICY "Users delete own business logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
