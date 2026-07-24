-- DRAFT — NOT EXECUTED THIS SPRINT. Additive only, no DROP/RENAME.
--
-- Fase "Acesso de suporte" do Sprint Workspaces 1.0: contrato para conceder
-- a um super_admin acesso temporário e explícito a um workspace de
-- agência/cliente, em vez de acesso irrestrito implícito. Reutiliza
-- agency_workspaces/clients já definidos em
-- docs/supabase/69-account-types-agency-workspaces.sql — cuja aplicação
-- real no banco ainda não foi confirmada nesta sprint (ver relatório final).
--
-- Numeração deixada em aberto (DRAFT-*, não 9X) para o time confirmar a
-- próxima sequência livre antes de aplicar.
--
-- Atualização 1.0.1: campo renomeado created_by -> granted_by_user_id e
-- coluna updated_at adicionada, alinhando ao vocabulário usado em
-- src/lib/workspaces/context.ts e ao contrato de audit log em
-- docs/workspace-preview-security.md. Segue não aplicado — nenhum SQL
-- rodado nesta sprint.

create table if not exists public.support_access_grants (
  id uuid primary key default gen_random_uuid(),
  granted_to_user_id uuid not null references auth.users(id),
  target_workspace_id uuid not null,          -- clients.id or agency_workspaces.id, per target_workspace_type
  target_workspace_type text not null check (target_workspace_type in ('agency', 'business')),
  parent_workspace_id uuid,                    -- agency_workspaces.id when target is an agency-managed client
  access_level text not null default 'read_only' check (access_level in ('read_only')),
  reason text not null,
  expires_at timestamptz not null,
  granted_by_user_id uuid not null references auth.users(id), -- renamed from created_by (1.0.1) for symmetry with granted_to_user_id
  revoked_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now() -- added in 1.0.1; app must set this on every revoke/renew write, no trigger proposed
);

create index if not exists support_access_grants_target_idx on public.support_access_grants (target_workspace_id);
create index if not exists support_access_grants_granted_to_idx on public.support_access_grants (granted_to_user_id);

alter table public.support_access_grants enable row level security;

-- Proposed policies (NOT applied) — only a super_admin can read/write grants,
-- and only for themselves as granted_to_user_id or granted_by_user_id.
-- create policy support_access_grants_super_admin_all on public.support_access_grants
--   for all using (current_user_role() = 'super_admin') with check (current_user_role() = 'super_admin');

-- A grant is usable only when: active, not revoked, not expired.
-- The application (src/lib/workspaces/preview.ts) is responsible for this
-- check today via a live query; a generated `is_valid` column was
-- deliberately not added to keep "now()" comparisons out of the schema.
