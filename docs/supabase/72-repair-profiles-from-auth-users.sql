-- ============================================================
-- SQL 72 — Backfill: criar profiles ausentes de auth.users
-- Garante que cada auth.user tem um registro em public.profiles.
-- Idempotente: usa INSERT ... ON CONFLICT DO NOTHING.
-- PRÉ-REQUISITO: SQL 01 (schema inicial) já aplicado.
-- ============================================================

-- ── Por que este SQL? ─────────────────────────────────────────
-- O trigger handle_new_user cria profiles automaticamente para
-- novos cadastros. Mas usuários criados antes do trigger, ou
-- via Google OAuth sem passar pelo trigger, podem não ter profile.
-- Este script faz o backfill de forma segura e idempotente.

-- ── 1. Criar profiles ausentes ────────────────────────────────
INSERT INTO public.profiles (id, email, name, role, account_status, created_at)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ) AS name,
  COALESCE(
    u.raw_user_meta_data->>'role',
    'cliente'
  ) AS role,
  'pending_setup' AS account_status,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ── 2. Verificar resultado ────────────────────────────────────
-- Após rodar, execute esta query para confirmar:
-- SELECT COUNT(*) FROM auth.users u
-- LEFT JOIN public.profiles p ON p.id = u.id
-- WHERE p.id IS NULL;
-- Resultado esperado: 0

-- ── 3. Confirmar que trigger está ativa ──────────────────────
-- O trigger on_auth_user_created deve estar ativo para novos cadastros:
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_auth_user_created';

-- ── NOTA ─────────────────────────────────────────────────────
-- Este SQL NÃO define account_type nem onboarding_type porque
-- esses valores só são conhecidos durante o onboarding do usuário.
-- A Central de Contas exibirá essas contas com account_type NULL
-- até que o usuário complete o onboarding.
-- Para atualizar account_type manualmente, use o painel de ações
-- em /admin/super/accounts.

-- ============================================================
-- COMO RODAR
-- 1. Abra uma NOVA query no Supabase SQL Editor (aba nova!).
-- 2. Cole este arquivo inteiro.
-- 3. Clique em "Run" (Ctrl+Enter).
-- 4. Resultado esperado: "Success. X rows affected." (pode ser 0 se tudo ok).
-- 5. Depois confirme com a query de verificação da seção 2.
-- ============================================================
