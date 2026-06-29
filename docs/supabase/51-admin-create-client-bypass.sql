-- ============================================================
-- LOKAT OS - Fix 51: função SECURITY DEFINER para criação de clientes
-- Execute manualmente no Supabase SQL Editor.
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================
--
-- Problema: INSERT em clients falha com RLS mesmo com service role
-- configurado, pois a key pode estar incorreta ou as policies antigas
-- (SQL 01) não cobrem o insert admin sem owner_id.
--
-- Solução: função SECURITY DEFINER que roda como owner do schema
-- (postgres), bypassa RLS completamente, mas valida que o chamador
-- tem role admin/super_admin antes de executar.
-- ============================================================

-- Adiciona colunas de ownership caso ainda não existam (idempotente)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS agency_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.admin_create_client(
  p_company_name     text,
  p_responsible_name text DEFAULT NULL,
  p_email            text DEFAULT NULL,
  p_phone            text DEFAULT NULL,
  p_segment          text DEFAULT NULL,
  p_status           text DEFAULT 'onboarding',
  p_created_by       uuid DEFAULT NULL,
  p_agency_id        uuid DEFAULT NULL
)
RETURNS TABLE (
  id               uuid,
  company_name     text,
  responsible_name text,
  email            text,
  phone            text,
  segment          text,
  status           text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role      text;
  v_client_id uuid;
  v_status    text;
BEGIN
  -- Valida que o chamador tem permissão (evita bypass não autorizado)
  v_role := public.current_user_role();
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % não pode criar clientes', v_role;
  END IF;

  -- Normaliza status
  IF p_status NOT IN ('active', 'onboarding', 'inactive') THEN
    v_status := 'onboarding';
  ELSE
    v_status := p_status;
  END IF;

  INSERT INTO public.clients (
    company_name,
    responsible_name,
    email,
    phone,
    segment,
    status,
    created_by,
    agency_id
  ) VALUES (
    p_company_name,
    p_responsible_name,
    p_email,
    p_phone,
    p_segment,
    v_status,
    COALESCE(p_created_by, auth.uid()),
    p_agency_id
  )
  RETURNING public.clients.id INTO v_client_id;

  RETURN QUERY
    SELECT
      c.id,
      c.company_name,
      c.responsible_name,
      c.email,
      c.phone,
      c.segment,
      c.status
    FROM public.clients c
    WHERE c.id = v_client_id;
END;
$$;

-- Garante que qualquer usuário autenticado pode chamar (a validação é interna)
GRANT EXECUTE ON FUNCTION public.admin_create_client(
  text, text, text, text, text, text, uuid, uuid
) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Validação: listar a função criada
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'admin_create_client';
