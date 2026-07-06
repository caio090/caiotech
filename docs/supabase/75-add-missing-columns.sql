-- ============================================================
-- SQL 75 — Adiciona colunas ausentes na launch_waitlist
-- Seguro: usa ADD COLUMN IF NOT EXISTS (disponível no PG 9.6+).
-- Rodar se o POST de /pre-acesso retornar erro de coluna inexistente
-- (supabaseCode contendo "42703" ou "PGRST204" no erro visível).
-- ============================================================

-- Adiciona social_or_site se a tabela foi criada por uma versão
-- antiga do SQL 73 que não tinha essa coluna.
ALTER TABLE public.launch_waitlist
  ADD COLUMN IF NOT EXISTS social_or_site text NULL;

-- Garante colunas UTM (caso também ausentes)
ALTER TABLE public.launch_waitlist
  ADD COLUMN IF NOT EXISTS utm_source   text NULL,
  ADD COLUMN IF NOT EXISTS utm_medium   text NULL,
  ADD COLUMN IF NOT EXISTS utm_campaign text NULL;

-- Diagnóstico: lista colunas atuais
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'launch_waitlist'
ORDER BY ordinal_position;

-- ============================================================
-- COMO RODAR
-- 1. Abra o Supabase SQL Editor em nova aba.
-- 2. Cole este arquivo e clique em Run.
-- 3. Resultado: lista de colunas da tabela.
-- 4. Se não houver erro de sintaxe, a tabela está correta.
-- 5. Após rodar, tente o formulário /pre-acesso novamente.
-- ============================================================
