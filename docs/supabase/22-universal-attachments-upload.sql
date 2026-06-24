-- 22-universal-attachments-upload.sql
-- Adds upload-related fields to operational_attachments
-- Run once in Supabase SQL editor

ALTER TABLE operational_attachments ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE operational_attachments ADD COLUMN IF NOT EXISTS attachment_type text;
ALTER TABLE operational_attachments ADD COLUMN IF NOT EXISTS attachment_size int8;
ALTER TABLE operational_attachments ADD COLUMN IF NOT EXISTS storage_path    text;
ALTER TABLE operational_attachments ADD COLUMN IF NOT EXISTS upload_source   text DEFAULT 'external_link';
ALTER TABLE operational_attachments ADD COLUMN IF NOT EXISTS notes           text;

CREATE INDEX IF NOT EXISTS idx_op_attachments_upload_source ON operational_attachments(upload_source);

-- Supabase Storage bucket for local uploads
-- Create the bucket manually in the Supabase dashboard > Storage > New bucket
-- Name: operational-attachments
-- Public: false (use signed URLs or service-role access)
-- Or public: true if you want direct URL access

-- RLS policies for storage (run after creating the bucket):
-- DROP POLICY IF EXISTS "auth_upload" ON storage.objects;
-- CREATE POLICY "auth_upload" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'operational-attachments');

-- DROP POLICY IF EXISTS "auth_read" ON storage.objects;
-- CREATE POLICY "auth_read" ON storage.objects
--   FOR SELECT TO authenticated
--   USING (bucket_id = 'operational-attachments');

NOTIFY pgrst, 'reload schema';
