-- ============================================================
-- SQL 28 — Auditoria de dados de teste na base de produção
--
-- APENAS SELECT — não apaga nada.
-- Rodar no Supabase SQL Editor para identificar registros
-- candidatos a limpeza antes de qualquer DELETE.
--
-- Critérios de dados de teste:
--   1. metadata->>'is_test' = 'true'
--   2. title/nome contendo "teste", "demo", "lokat test"
--   3. Registros criados após 2025-01-01 sem client_id real
--   4. Registros órfãos (sem relação com client existente)
-- ============================================================

-- ── 1. Contar registros por tabela ───────────────────────────

SELECT 'content_items'     AS tabela, COUNT(*) AS total FROM public.content_items
UNION ALL
SELECT 'approvals',                   COUNT(*) FROM public.approvals
UNION ALL
SELECT 'operational_tasks',           COUNT(*) FROM public.operational_tasks
UNION ALL
SELECT 'clients',                     COUNT(*) FROM public.clients
UNION ALL
SELECT 'profiles',                    COUNT(*) FROM public.profiles
UNION ALL
SELECT 'notifications',               COUNT(*) FROM public.notifications
ORDER BY tabela;

-- ── 2. Candidatos a teste em content_items ───────────────────

SELECT
  id,
  title,
  status,
  client_id,
  created_at,
  metadata->>'is_test'   AS is_test_flag,
  metadata->>'source'    AS source
FROM public.content_items
WHERE
  (metadata->>'is_test')::boolean IS TRUE
  OR LOWER(title) LIKE '%teste%'
  OR LOWER(title) LIKE '%demo%'
  OR LOWER(title) LIKE '%lokat test%'
ORDER BY created_at DESC;

-- ── 3. Candidatos a teste em operational_tasks ───────────────

SELECT
  id,
  title,
  department,
  status,
  client_id,
  content_item_id,
  created_at,
  (brief->>'is_test')::boolean AS is_test_flag
FROM public.operational_tasks
WHERE
  (brief->>'is_test')::boolean IS TRUE
  OR LOWER(title) LIKE '%teste%'
  OR LOWER(title) LIKE '%demo%'
ORDER BY created_at DESC;

-- ── 4. Approvals sem content_item associado (órfãos) ─────────

SELECT
  a.id,
  a.content_id,
  a.client_id,
  a.status,
  a.created_at
FROM public.approvals a
LEFT JOIN public.content_items ci ON ci.id = a.content_id
WHERE ci.id IS NULL
ORDER BY a.created_at DESC;

-- ── 5. Operational tasks sem content_item (órfãos) ───────────

SELECT
  ot.id,
  ot.title,
  ot.content_item_id,
  ot.client_id,
  ot.created_at
FROM public.operational_tasks ot
LEFT JOIN public.content_items ci ON ci.id = ot.content_item_id
WHERE ot.content_item_id IS NOT NULL AND ci.id IS NULL
ORDER BY ot.created_at DESC;

-- ── 6. Notificações antigas (> 90 dias) ─────────────────────

SELECT
  id,
  type,
  title,
  user_id,
  created_at
FROM public.notifications
WHERE created_at < NOW() - INTERVAL '90 days'
ORDER BY created_at;

-- ── 7. Clients sem profile associado ─────────────────────────

SELECT
  c.id,
  c.company_name,
  c.owner_id,
  c.created_at
FROM public.clients c
LEFT JOIN public.profiles p ON p.id = c.owner_id
WHERE p.id IS NULL
ORDER BY c.created_at DESC;

-- ── INSTRUÇÕES ────────────────────────────────────────────────
-- Após revisar os resultados acima:
-- 1. Confirme manualmente quais registros podem ser apagados
-- 2. Utilize o SQL 28b (a ser criado) com DELETEs específicos
-- 3. Nunca apague auth.users diretamente
-- 4. Nunca apague clients ou profiles sem confirmação do dono
-- ============================================================
