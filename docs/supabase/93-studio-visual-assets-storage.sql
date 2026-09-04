-- ============================================================
-- LOKAT OS — SQL 93 (Studio Visual Assets Storage — AINDA NÃO EXECUTADO)
-- Prompt 16 (REC OS Persistence Completion)
--
-- NÃO EXECUTAR AUTOMATICAMENTE. Segue o mesmo processo manual de SQL
-- 91/92 (docs/checklists/manual-supabase-v1.md): revisão humana antes
-- de rodar no SQL Editor do Supabase, em Staging/Production.
--
-- IMPOSSIBILIDADE ESTRUTURAL DOCUMENTADA (Fase 04/33 do Prompt 16):
-- auditoria via Supabase MCP (list de storage.buckets) confirmou que
-- o único bucket existente é `rec-videos` (público, pra vídeos --
-- docs/supabase/46-rec-videos.sql). Não existe bucket privado
-- Company-scoped apropriado pra imagens estáticas geradas pelo Studio
-- -- REUTILIZAR não é possível aqui (usar `rec-videos`, público,
-- exporia imagens de Company sem controle de acesso). Este arquivo
-- cria SOMENTE o bucket + suas policies de storage.objects -- nenhuma
-- tabela nova, nenhuma coluna nova em `client_visual_assets` (a
-- tabela já existe e já tem `storage_path`/`file_url`, ver SQL 40).
--
-- DEPENDÊNCIA: mesmas can_access_client_company(uuid)/
-- can_write_client_company(uuid) de SQL 91 -- se ainda não aplicado,
-- aplicar primeiro.
--
-- Convenção de path: `{client_id}/{arquivo}` -- o primeiro segmento do
-- path É o client_id (uuid), usado pelas policies abaixo pra decidir
-- acesso. Bucket PRIVADO (nunca público) -- leitura só via signed URL
-- de curta duração (ver src/lib/rec-os/studio/series/asset-persistence.ts).
-- ============================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('client-visual-assets', 'client-visual-assets', false, 8388608, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "client_visual_assets_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "client_visual_assets_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "client_visual_assets_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "client_visual_assets_storage_delete" ON storage.objects;

-- (storage.foldername(name))[1] = primeiro segmento do path = client_id.
-- Nunca confia em metadata solta -- o path em si é a fonte da verdade,
-- mesmo padrão de isolamento já usado pelas RLS de tabela (SQL 91/92).
CREATE POLICY "client_visual_assets_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'client-visual-assets'
    AND public.can_access_client_company(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "client_visual_assets_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-visual-assets'
    AND public.can_write_client_company(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "client_visual_assets_storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-visual-assets'
    AND public.can_write_client_company(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'client-visual-assets'
    AND public.can_write_client_company(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "client_visual_assets_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-visual-assets'
    AND public.can_write_client_company(((storage.foldername(name))[1])::uuid)
  );

COMMIT;

-- ── Validação pós-apply (rodar manualmente) ──
-- SELECT id, name, public FROM storage.buckets WHERE id = 'client-visual-assets';
-- SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE 'client_visual_assets_storage_%';
