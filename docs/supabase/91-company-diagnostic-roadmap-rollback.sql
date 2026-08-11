-- ============================================================
-- LOKAT OS — SQL 91 ROLLBACK
-- Reverte docs/supabase/91-company-diagnostic-roadmap.sql
--
-- Sprint MVP Core Closure V2 (Fase 4) — rollback seguro: dropa somente as
-- 5 tabelas novas criadas pelo arquivo 91, na ordem inversa de
-- dependência (FKs mais dependentes primeiro). Nunca toca em `clients`,
-- `profiles`, `rec_projects`, `commercial_leads` ou qualquer outra tabela
-- pré-existente -- este arquivo só remove o que o 91 adicionou.
--
-- Execute no Supabase SQL Editor SOMENTE se o schema 91 precisar ser
-- desfeito (ex.: revisão adicional necessária após teste real).
-- ============================================================

DROP TABLE IF EXISTS public.roadmap_items CASCADE;
DROP TABLE IF EXISTS public.diagnostic_recommendations CASCADE;
DROP TABLE IF EXISTS public.diagnostic_findings CASCADE;
DROP TABLE IF EXISTS public.diagnostic_checklist_items CASCADE;
DROP TABLE IF EXISTS public.company_diagnostics CASCADE;

-- FIM DO ROLLBACK
