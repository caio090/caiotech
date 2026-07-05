-- ============================================================
-- SQL 71 — Repair: v_platform_accounts_overview
-- Garante que a view inclui TODOS os perfis, mesmo sem cliente.
-- Corrige default de account_status para profiles existentes.
-- PRÉ-REQUISITO: SQL 68 → 69 → 70 já aplicados.
-- ============================================================

-- 1. Garante que profiles sem account_status recebam 'active'
UPDATE public.profiles
SET account_status = 'active'
WHERE account_status IS NULL;

-- 2. Recria a view sem INNER JOIN (usa LEFT JOIN para incluir todos)
CREATE OR REPLACE VIEW public.v_platform_accounts_overview AS
SELECT
  p.id,
  p.email,
  p.name,
  p.role,
  p.account_type,
  p.account_status,
  p.created_at,
  c.company_name,
  c.id AS client_id
FROM public.profiles p
LEFT JOIN public.clients c
  ON c.owner_id = p.id
  AND c.deleted_at IS NULL
ORDER BY p.created_at DESC;

-- ============================================================
-- COMO RODAR
-- 1. Abra o Supabase SQL Editor em uma aba nova (importante!)
-- 2. Cole este script inteiro
-- 3. Clique em "Run"
-- 4. Resultado esperado: "Success. No rows returned."
-- ============================================================
