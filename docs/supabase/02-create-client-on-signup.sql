-- ============================================================
-- LOKAT OS — Correção RLS: criação de client no cadastro
-- Execute no Supabase SQL Editor após o schema inicial (01-schema-inicial.sql)
--
-- Contexto: após supabase.auth.signUp(), se o projeto Supabase tiver
-- "Email Confirmation" habilitado, a sessão não é criada imediatamente.
-- Sem sessão, auth.uid() = null, e o INSERT direto em clients falha
-- com erro 42501 (violação de RLS), mesmo com a policy correta.
--
-- Solução: função SECURITY DEFINER acessível ao role anon.
-- Ela roda como o owner do schema (postgres), bypassa RLS e valida
-- que o user_id informado realmente existe em auth.users.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_client_on_signup(
  p_user_id        uuid,
  p_company_name   text,
  p_responsible    text,
  p_email          text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  -- Idempotente: retorna client existente se já foi criado para este user
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE owner_id = p_user_id;

  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;

  -- Valida que o usuário existe em auth.users antes de criar o client
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found: usuário % não existe em auth.users', p_user_id;
  END IF;

  INSERT INTO public.clients (owner_id, company_name, responsible_name, email, status)
  VALUES (p_user_id, p_company_name, p_responsible, p_email, 'onboarding')
  RETURNING id INTO v_client_id;

  RETURN v_client_id;
END;
$$;

-- Permite chamada pelo role anon (logo após signUp, sem sessão confirmada)
-- e pelo role authenticated (fluxo normal com sessão ativa)
GRANT EXECUTE ON FUNCTION public.create_client_on_signup(uuid, text, text, text)
  TO anon, authenticated;
