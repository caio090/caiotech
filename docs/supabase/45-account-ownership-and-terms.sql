-- LOKAT OS — SQL 45: Account Ownership, Terms and Client Requests
-- Adiciona campos de posse de conta, aceite de termos e tabela de solicitações.
-- Idempotente: usa ADD COLUMN IF NOT EXISTS e CREATE TABLE IF NOT EXISTS.
-- Rodar no SQL Editor do Supabase.

-- ── 1. profiles: campos de termos e onboarding ────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type           text DEFAULT 'nao_definido',
  ADD COLUMN IF NOT EXISTS plan                   text DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS accepted_terms_at      timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_terms_version text,
  ADD COLUMN IF NOT EXISTS accepted_privacy_at    timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- ── 2. clients: campos de posse e hierarquia ──────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS agency_id         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_type      text DEFAULT 'lokat_client',
  ADD COLUMN IF NOT EXISTS platform_status   text DEFAULT 'active';

-- Índices
CREATE INDEX IF NOT EXISTS idx_clients_agency_id      ON public.clients(agency_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_by     ON public.clients(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_plan          ON public.profiles(plan) WHERE plan IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_account_type  ON public.profiles(account_type) WHERE account_type IS NOT NULL;

-- ── 3. client_requests ────────────────────────────────────────
-- Tabela de solicitações criadas pelo portal do cliente.
CREATE TABLE IF NOT EXISTS public.client_requests (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  requester_user_id uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_profile_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  title             text        NOT NULL,
  description       text,
  status            text        NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open','in_review','in_progress','waiting_client','done','archived')),
  priority          text        NOT NULL DEFAULT 'normal'
                                CHECK (priority IN ('low','normal','high','urgent')),
  request_type      text        NOT NULL DEFAULT 'general',
  source            text        NOT NULL DEFAULT 'client_portal',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;

-- Admin vê tudo
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='client_requests' AND policyname='admin_all_client_requests'
  ) THEN
    CREATE POLICY "admin_all_client_requests" ON public.client_requests
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
      );
  END IF;
END $$;

-- Cliente vê apenas as próprias solicitações
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='client_requests' AND policyname='client_own_requests'
  ) THEN
    CREATE POLICY "client_own_requests" ON public.client_requests
      FOR ALL USING (
        client_id IN (
          SELECT client_id FROM public.profiles
          WHERE id = auth.uid() AND client_id IS NOT NULL
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_client_requests_client_id      ON public.client_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_client_requests_owner_profile  ON public.client_requests(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_client_requests_status         ON public.client_requests(status);

-- ── 4. Helper: get_request_owner_for_client ───────────────────
-- Retorna o profile_id responsável por solicitações de um dado client_id.
-- Prioridade: agency_id > owner_id > super_admin.
CREATE OR REPLACE FUNCTION public.get_request_owner_for_client(p_client_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_agency_id  uuid;
  v_owner_id   uuid;
  v_super_id   uuid;
BEGIN
  SELECT agency_id, owner_id INTO v_agency_id, v_owner_id
  FROM public.clients WHERE id = p_client_id;

  IF v_agency_id IS NOT NULL THEN RETURN v_agency_id; END IF;
  IF v_owner_id  IS NOT NULL THEN RETURN v_owner_id;  END IF;

  SELECT id INTO v_super_id FROM public.profiles WHERE role = 'super_admin' LIMIT 1;
  RETURN v_super_id;
END;
$$;

-- ── 5. View v_real_clients atualizada ─────────────────────────
DROP VIEW IF EXISTS public.v_real_clients;
CREATE VIEW public.v_real_clients AS
SELECT
  c.id,
  c.company_name,
  c.responsible_name,
  c.email,
  c.phone,
  c.segment,
  c.status,
  c.account_type,
  c.platform_status,
  c.owner_id,
  c.agency_id,
  c.created_by,
  c.created_at,
  EXISTS (
    SELECT 1 FROM public.client_meta_assets cma WHERE cma.client_id = c.id
  ) AS has_meta_connection,
  EXISTS (
    SELECT 1 FROM public.olaclick_connections oc WHERE oc.client_id = c.id AND oc.status = 'connected'
  ) AS has_olaclick_connection,
  (SELECT COUNT(*) FROM public.client_requests cr WHERE cr.client_id = c.id AND cr.status = 'open')::int AS open_request_count
FROM public.clients c
WHERE c.status IN ('active', 'onboarding')
  AND (c.deleted_at IS NULL OR c.deleted_at > now())
  AND (c.archived_at IS NULL OR c.archived_at > now());

-- ── Reload schema ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
