-- ─────────────────────────────────────────────────────────────────────────────
-- 47-rec-storage-policy-publica.sql
-- Adiciona policy de leitura pública no bucket rec-videos.
-- Rodar manualmente no Supabase SQL Editor se o bucket já existe mas tem 0 policies.
-- ─────────────────────────────────────────────────────────────────────────────

-- Permite que qualquer pessoa (anon) leia arquivos do bucket rec-videos
create policy "rec_videos_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'rec-videos');
