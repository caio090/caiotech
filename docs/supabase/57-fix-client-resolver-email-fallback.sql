-- ============================================================
-- LOKAT OS - SQL 57: Resolver de cliente com fallback por email
-- Execute manualmente no Supabase SQL Editor.
-- Idempotente: pode rodar mais de uma vez com segurança.
-- ============================================================
--
-- Por que é necessário:
--   Contas criadas via fluxo antigo têm profiles.client_id = null
--   e client_invites.accepted_by = null. O SQL 56 cobre 3 caminhos
--   mas não inclui fallback por email. Para essas contas, a única
--   fonte confiável é: clients.email = email do usuário autenticado.
--
-- O que este SQL faz:
--   Substitui get_my_client_id() por versão com 5 caminhos:
--     1. profiles.client_id (mais rápido)
--     2. client_user_access.user_id (se tabela existir)
--     3. client_invites.accepted_by = auth.uid()
--     4. client_invites.email = email do JWT (convite aceito por email)
--     5. clients.email = email do JWT (criação direta pelo admin)
--   Em cada caminho bem-sucedido, repara profiles.client_id para
--   que visitas futuras usem o caminho 1 (mais rápido).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_client_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid;
  v_email     text;
  v_client_id uuid;
BEGIN
  v_uid   := auth.uid();
  v_email := auth.jwt() ->> 'email';

  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- ── 1. profiles.client_id ─────────────────────────────────────
  SELECT client_id INTO v_client_id
  FROM public.profiles
  WHERE id = v_uid AND client_id IS NOT NULL;

  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;

  -- ── 2. client_user_access (tabela opcional) ───────────────────
  BEGIN
    SELECT cua.client_id INTO v_client_id
    FROM public.client_user_access cua
    WHERE cua.user_id = v_uid
    LIMIT 1;

    IF v_client_id IS NOT NULL THEN
      UPDATE public.profiles
        SET client_id = v_client_id, role = 'client'
      WHERE id = v_uid AND client_id IS NULL;
      RETURN v_client_id;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    -- tabela não existe, segue para próximo caminho
    NULL;
  END;

  -- ── 3. client_invites.accepted_by ────────────────────────────
  SELECT ci.client_id INTO v_client_id
  FROM public.client_invites ci
  WHERE ci.accepted_by = v_uid
    AND ci.status = 'accepted'
  ORDER BY ci.accepted_at DESC NULLS LAST
  LIMIT 1;

  IF v_client_id IS NOT NULL THEN
    UPDATE public.profiles
      SET client_id = v_client_id, role = 'client'
    WHERE id = v_uid AND client_id IS NULL;
    RETURN v_client_id;
  END IF;

  -- ── 4. client_invites.email = email do JWT ────────────────────
  IF v_email IS NOT NULL THEN
    SELECT ci.client_id INTO v_client_id
    FROM public.client_invites ci
    WHERE ci.email = v_email
      AND ci.status IN ('accepted', 'pending')
    ORDER BY
      CASE WHEN ci.status = 'accepted' THEN 0 ELSE 1 END,
      ci.created_at DESC
    LIMIT 1;

    IF v_client_id IS NOT NULL THEN
      -- Repara accepted_by se estava nulo
      UPDATE public.client_invites
        SET accepted_by = v_uid,
            status      = 'accepted',
            accepted_at = COALESCE(accepted_at, now())
      WHERE email = v_email
        AND client_id = v_client_id
        AND accepted_by IS NULL;

      UPDATE public.profiles
        SET client_id = v_client_id, role = 'client'
      WHERE id = v_uid AND client_id IS NULL;

      RETURN v_client_id;
    END IF;
  END IF;

  -- ── 5. clients.email = email do JWT ──────────────────────────
  IF v_email IS NOT NULL THEN
    SELECT c.id INTO v_client_id
    FROM public.clients c
    WHERE c.email = v_email
      AND c.deleted_at  IS NULL
      AND c.archived_at IS NULL
    ORDER BY c.created_at DESC
    LIMIT 1;

    IF v_client_id IS NOT NULL THEN
      UPDATE public.profiles
        SET client_id = v_client_id, role = 'client'
      WHERE id = v_uid AND client_id IS NULL;

      RETURN v_client_id;
    END IF;
  END IF;

  -- Nenhum caminho encontrou vínculo
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_client_id() TO authenticated;

-- ── Policy: leitura de convite próprio aceito ou pendente ──────
-- Necessário para queries diretas ao client_invites no portal.
DROP POLICY IF EXISTS "user_read_own_accepted_invite" ON public.client_invites;
CREATE POLICY "user_read_own_accepted_invite" ON public.client_invites
  FOR SELECT TO authenticated
  USING (
    accepted_by = auth.uid()
    OR (email = (auth.jwt() ->> 'email') AND status IN ('accepted', 'pending'))
  );

-- ── Recarrega schema ──────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Validação ─────────────────────────────────────────────────
SELECT proname, prosecdef
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'get_my_client_id';
