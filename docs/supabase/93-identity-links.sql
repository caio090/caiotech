-- ============================================================
-- SQL 93 — Identity Links (Conversational Layer)
-- Tabela para persistir o vínculo entre um usuário de um canal
-- conversacional (Telegram hoje, WhatsApp no futuro) e um
-- profile_id real do LOKAT OS.
-- ============================================================
-- STATUS: PROPOSTA — NÃO EXECUTAR
-- Criado em: 2026-08-20
-- Missão: TELEGRAM IDENTITY LINK V1 FOUNDATION
-- Bloqueado: aguarda aprovação explícita do usuário; esta missão é
-- fundação de arquitetura apenas (SQL: NÃO APLICAR) -- a contraparte
-- em código já existe e é testada sem banco: ver
-- src/lib/conversation/{identity-link-token,identity-link-store,
-- identity-link}.ts. Uma implementação real desta tabela deve
-- implementar a interface IdentityLinkStore (identity-link-store.ts)
-- sem alterar nenhum chamador.
-- Seguro: CREATE TABLE IF NOT EXISTS, index IF NOT EXISTS. Não
-- modifica nenhuma tabela existente, não remove dado nenhum.
-- ============================================================

BEGIN;

-- =============================================
-- BLOCO 1: identity_links
-- Um vínculo verificado entre (channel, external_user_id) e
-- profiles(id). NUNCA referencia clients(id) -- Identity Link
-- responde "qual USUÁRIO", nunca "qual empresa"; Company Context
-- continua sendo resolvido separadamente, depois, por
-- resolveCompanyContext()/listAuthorizedCompanies() (confirmado por
-- auditoria: docs/architecture, missão TELEGRAM IDENTITY LINK V1
-- FOUNDATION, item 7).
-- =============================================

CREATE TABLE IF NOT EXISTS identity_links (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          text NOT NULL,                     -- 'telegram', futuramente 'whatsapp'
  external_user_id  text NOT NULL,                      -- id numérico/estável do canal (nunca @username) -- string por compatibilidade entre providers
  profile_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'revoked')),
  linked_at         timestamptz NOT NULL DEFAULT now(),
  revoked_at        timestamptz,
  last_used_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_user_id)
);

CREATE INDEX IF NOT EXISTS idx_identity_links_profile
  ON identity_links (profile_id);

CREATE INDEX IF NOT EXISTS idx_identity_links_provider_status
  ON identity_links (provider, status);

-- updated_at automático (reusa o padrão já usado em outras migrations,
-- ex.: 91-company-diagnostic-roadmap.sql -- nunca uma segunda função
-- set_updated_at() duplicada; se já existir no banco, este bloco é
-- redundante e seguro por CREATE OR REPLACE).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_identity_links_updated_at ON identity_links;
CREATE TRIGGER trg_identity_links_updated_at
  BEFORE UPDATE ON identity_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE identity_links ENABLE ROW LEVEL SECURITY;

-- O próprio usuário pode ver/gerenciar apenas o seu vínculo. Nenhuma
-- policy baseada só em role (admin/super_admin não têm acesso geral
-- aqui de propósito -- vínculo de canal é dado de identidade pessoal,
-- não um recurso administrativo de Company).
CREATE POLICY "Usuário gerencia apenas o próprio identity link"
  ON identity_links
  FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Nenhuma policy para `anon` -- o INSERT real acontece via rota
-- SECURITY DEFINER/service role no webhook do canal (nunca client-side),
-- exatamente como o restante da Conversational Layer já funciona
-- (secret do webhook valida a origem antes de qualquer escrita).

-- =============================================
-- Verificação (rodar manualmente após aplicar, se/quando aprovado)
-- =============================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'identity_links'
-- ORDER BY ordinal_position;

COMMIT;

-- ============================================================
-- COMO RODAR (somente após aprovação explícita do usuário):
-- 1. Revisar este arquivo linha a linha.
-- 2. Colar no Supabase SQL Editor do projeto correto.
-- 3. Confirmar RLS habilitado e a policy acima antes de liberar
--    qualquer rota real de escrita.
-- 4. Trocar InMemoryIdentityLinkStore (src/lib/conversation/
--    identity-link-store.ts) por uma implementação Supabase da
--    mesma interface IdentityLinkStore -- nenhum chamador muda.
-- ============================================================
