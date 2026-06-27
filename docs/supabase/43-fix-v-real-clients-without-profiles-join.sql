-- LOKAT OS — SQL 43: Fix v_real_clients (remove join com profiles)
-- PROBLEMA: v_real_clients (SQL 13) usa JOIN profiles WHERE role=cliente.
-- Isso faz clientes sem user account desaparecerem do ContentOS.
-- SOLUÇÃO: Recriar a view baseada apenas em clients, sem exigir profiles.
-- Safe to re-run. Rodar no SQL Editor do Supabase.

DROP VIEW IF EXISTS public.v_real_clients;

CREATE VIEW public.v_real_clients
WITH (security_invoker = true)
AS
  SELECT
    c.id,
    c.owner_id,
    c.company_name,
    c.responsible_name,
    c.segment,
    c.status,
    c.created_at
  FROM public.clients c
  WHERE
    c.status IN ('active', 'onboarding')
    AND c.status NOT IN ('deleted', 'archived', 'cancelled', 'canceled', 'test', 'inactive');

NOTIFY pgrst, 'reload schema';

-- Validar:
-- SELECT id, company_name, status FROM v_real_clients ORDER BY company_name;
