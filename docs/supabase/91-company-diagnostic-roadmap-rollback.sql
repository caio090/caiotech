-- ============================================================
-- LOKAT OS — SQL 91 ROLLBACK (Security Hardening V2)
-- Reverte docs/supabase/91-company-diagnostic-roadmap.sql
--
-- Sprint SQL 91 Security Hardening V2 (Fase 33) — o CASCADE genérico da
-- versão anterior foi removido: dropar tabelas em cascata apagava
-- silenciosamente qualquer objeto dependente não-antecipado (ex.: uma FK
-- que outra feature viesse a criar apontando para estas tabelas), o que
-- é perigoso demais para um rollback. Este arquivo dropa explicitamente,
-- na ordem inversa
-- de dependência, SOMENTE os objetos que o 91 cria: 5 tabelas, os
-- triggers e as 6 funções auxiliares dedicadas a este domínio. Nunca
-- toca em `clients`, `profiles`, `rec_projects`, `commercial_leads`,
-- `client_user_access`, `agency_workspaces`, `agency_clients` ou
-- `public.set_updated_at()` -- PROMPT 08C, P1 #1: a SQL 91 nunca CRIA
-- nem redefine set_updated_at(), só a REUTILIZA (dependência LIVE já
-- existente desde docs/supabase/18 e /33, compartilhada por dez
-- triggers de outros domínios) -- portanto não há nada deste rollback
-- para desfazer nela.
--
-- Execute no Supabase SQL Editor SOMENTE se o schema 91 precisar ser
-- desfeito (ex.: revisão adicional necessária após teste real).
-- ============================================================

BEGIN;

-- ── 1. Tabelas, ordem inversa de dependência (filhas primeiro) ──
-- Sem CASCADE: se algo além do 91 depender destas tabelas, o DROP
-- falha explicitamente em vez de destruir silenciosamente.
DROP TABLE IF EXISTS public.roadmap_items;
DROP TABLE IF EXISTS public.diagnostic_recommendations;
DROP TABLE IF EXISTS public.diagnostic_findings;
DROP TABLE IF EXISTS public.diagnostic_checklist_items;
DROP TABLE IF EXISTS public.company_diagnostics;

-- ── 2. Funções dedicadas a este domínio ──────────────────────────
-- (os triggers já foram removidos junto com as tabelas acima; as
-- funções em si sobrevivem a isso e precisam ser dropadas à parte)
DROP FUNCTION IF EXISTS public.validate_roadmap_item_consistency();
DROP FUNCTION IF EXISTS public.forbid_finding_id_change();
DROP FUNCTION IF EXISTS public.forbid_diagnostic_id_change();
DROP FUNCTION IF EXISTS public.forbid_client_id_change();
DROP FUNCTION IF EXISTS public.can_write_client_company(uuid);
DROP FUNCTION IF EXISTS public.can_access_client_company(uuid);

-- Nota deliberada: public.set_updated_at() NÃO é dropada aqui -- a SQL
-- 91 nunca a criou nem redefiniu (só a reutiliza como dependência LIVE,
-- já existente desde docs/supabase/18 e /33), e outras tabelas do
-- projeto continuam usando-a.

COMMIT;

-- FIM DO ROLLBACK
