-- ============================================================
-- LOKAT OS — SQL 93 ROLLBACK — Studio Visual Assets Storage
-- Prompt 16 (REC OS Persistence Completion)
--
-- Reverte docs/supabase/93-studio-visual-assets-storage.sql. Remove as
-- policies e o bucket -- NUNCA os objetos já enviados (se houver
-- necessidade real de apagar arquivos, isso é uma decisão separada,
-- explícita, nunca implícita neste rollback).
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "client_visual_assets_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "client_visual_assets_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "client_visual_assets_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "client_visual_assets_storage_delete" ON storage.objects;

-- Supabase recusa DELETE em storage.buckets se ainda houver objetos --
-- por segurança, este rollback NÃO tenta apagar o bucket
-- automaticamente. Se necessário, esvaziar os objetos manualmente
-- primeiro e então: DELETE FROM storage.buckets WHERE id = 'client-visual-assets';

COMMIT;

-- ── Validação pós-rollback (rodar manualmente) ──
-- SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE 'client_visual_assets_storage_%'; -- esperado: 0 linhas
