-- ============================================================
-- SQL 71 — Repair: v_platform_accounts_overview
-- Garante que a view inclui TODOS os perfis, mesmo sem cliente.
-- Corrige default de account_status para profiles existentes.
-- PRÉ-REQUISITO: SQL 68 → 69 → 70 já aplicados.
-- ============================================================

-- ── Por que DROP VIEW antes de CREATE? ────────────────────────
-- PostgreSQL não permite CREATE OR REPLACE VIEW quando a nova
-- definição remove, reordena ou renomeia colunas (erro 42P16).
-- A solução idempotente é DROP + CREATE.
-- Esta view é somente-leitura e não possui dependentes conhecidos.

-- 1. Remove a view atual para permitir recriação limpa
DROP VIEW IF EXISTS public.v_platform_accounts_overview;

-- ── 2. Garante que profiles sem account_status recebam 'active' ──
UPDATE public.profiles
SET account_status = 'active'
WHERE account_status IS NULL;

-- ── 3. Recria a view com LEFT JOIN (inclui TODOS os perfis) ──────
-- Mantém todas as colunas do SQL 70 + adiciona client_id e agency_id.
-- Usa LEFT JOIN em todas as tabelas opcionais para não excluir
-- perfis sem cliente, agência, plano ou cupom vinculado.
CREATE VIEW public.v_platform_accounts_overview AS
SELECT
  p.id                                      AS user_id,
  p.email,
  p.name,
  p.role,
  p.account_type,
  p.account_status,
  p.created_at,
  c.id                                      AS client_id,
  c.company_name,
  c.segment,
  aw.id                                     AS agency_id,
  aw.name                                   AS agency_name,
  cs.plan_slug,
  cs.status                                 AS subscription_status,
  cs.trial_end_at,
  cr.code                                   AS coupon_code
FROM public.profiles p
LEFT JOIN public.clients c
  ON c.owner_id = p.id
  AND c.deleted_at IS NULL
LEFT JOIN public.agency_workspaces aw
  ON aw.owner_user_id = p.id
LEFT JOIN public.client_subscriptions cs
  ON cs.client_id = c.id
LEFT JOIN public.coupon_redemptions cred
  ON cred.user_id = p.id
LEFT JOIN public.billing_coupons cr
  ON cr.id = cred.coupon_id
ORDER BY p.created_at DESC;

-- Nota: pode retornar múltiplas linhas por usuário se houver
-- mais de um client/subscription/redemption. Use DISTINCT em queries.

-- ── 4. Permissões da view ─────────────────────────────────────────
-- A view herda as permissões das tabelas base (RLS de profiles, clients etc.).
-- O acesso ao super_admin é garantido via service role na API /api/admin/accounts.

-- ============================================================
-- COMO RODAR
-- 1. Abra uma NOVA query no Supabase SQL Editor (aba nova!).
-- 2. Cole este arquivo inteiro.
-- 3. Clique em "Run" (Ctrl+Enter).
-- 4. Resultado esperado: "Success. No rows returned."
-- 5. Este SQL substitui a view v_platform_accounts_overview
--    para incluir perfis sem cliente/agência vinculados.
-- ============================================================
