-- ============================================================
-- LOKAT OS — SQL 91 (SECURITY HARDENING V2 — AINDA NÃO EXECUTADO)
-- Company Diagnostic → Finding → Recommendation → Roadmap Item
--
-- Sprint SQL 91 Security Hardening V2 — correção cirúrgica dos P0/P1
-- comprovados pelo gate de segurança do CODEX WEB (verdict anterior:
-- SQL_REJECTED_SECURITY). Nenhuma migration foi executada até agora.
-- Ver docs/supabase/91-company-diagnostic-roadmap-rollback.sql para o
-- rollback seguro correspondente e
-- docs/supabase/91-company-diagnostic-roadmap-rls-test-plan.sql para o
-- plano de verificação manual pós-apply.
--
-- ─────────────────────────────────────────────────────────────
-- PRINCÍPIO ABSOLUTO CORRIGIDO NESTA VERSÃO: ROLE NÃO É OWNERSHIP.
-- ─────────────────────────────────────────────────────────────
-- A versão anterior concedia acesso a estas 5 tabelas checando somente a
-- lista de roles em profiles (super_admin, admin, um valor de agência, e
-- operacional) dentro de um único USING/WITH CHECK -- isto é role-based,
-- NUNCA ownership-based, e reproduzia exatamente o P0.1 apontado pelo
-- CODEX. Além disso esse valor de "agência" nunca é um valor real de
-- `profiles.role` neste produto (ver src/lib/access-control.ts,
-- VALID_ROLES) -- "agência" é um `surface`/`account_type`, nunca um
-- role de profiles. E a policy `client_select` de leitura usava
-- `clients.owner_id`, um modelo de ownership direto ANTERIOR ao modelo
-- real de hoje (agency_workspaces/agency_clients/client_user_access),
-- que não é mais o caminho usado por resolveCompanyContext().
--
-- Modelo canônico REAL (auditado em src/lib/company-context/resolve.ts
-- + src/lib/client/resolve-client.ts + src/lib/access-control.ts,
-- nunca deduzido pelo nome dos roles):
--   • super_admin        → acesso global (único role verdadeiramente
--                           global no produto).
--   • admin (não super)  → só se: (a) tiver uma linha ativa em
--                           client_user_access (user_id, client_id), OU
--                           (b) for owner_user_id de um agency_workspaces
--                           cujo agency_clients ativo aponta para esta
--                           Company. Mesma regra de
--                           isCompanyAuthorizedForAdmin() em
--                           resolve.ts -- reproduzida aqui, nunca
--                           duplicada com lógica diferente.
--   • cliente             → só se: profiles.client_id = esta Company, OU
--                           uma linha ativa em client_user_access.
--                           Mesmo caminho de resolveCurrentClient().
--   • operacional/financeiro/comercial/sdr/closer/social_media/designer/
--     editor/videomaker/gestor_trafego → NENHUM acesso. O resolver real
--     (canAccessAdmin / canAccessClient) já retorna `role_not_supported`
--     para todos estes roles -- eles NUNCA resolvem um Company Context
--     hoje em nenhuma tela do produto. Dar a eles acesso de banco a
--     Diagnostic/Roadmap seria MAIS permissivo que a própria aplicação
--     -- exatamente o erro P0.1 que este SQL corrige.
--   • agência COMO ROLE: não existe. Removido de todas as policies.
--
-- POR QUÊ este schema é necessário (mantido da revisão anterior):
-- Auditoria completa confirmou que NENHUM modelo existente é
-- reaproveitável para "Diagnóstico de uma Company já onboardada, que
-- produz Achados/Recomendações/Roadmap":
--   - `marketing_diagnostics` (docs/supabase/49) é um FUNIL PÚBLICO de
--     pré-venda, sem `client_id`, só `company_name` texto livre.
--   - `commercial_leads.client_id` existe na tabela mas nunca é
--     populado por nenhum fluxo real da aplicação.
-- Portanto, um Diagnóstico real "desta Company, sobre esta Company" é
-- uma capacidade genuinamente nova, sem equivalente a reaproveitar.
--
-- Reaproveita explicitamente:
--   - `public.clients(id)` como a Company (nenhuma tabela de Company nova);
--   - `public.client_user_access` / `public.agency_workspaces` /
--     `public.agency_clients` como o ÚNICO modelo real de autorização
--     Company-scoped (nenhum modelo paralelo);
--   - `public.set_updated_at()` (já definida em docs/supabase/18 e /33)
--     como o mecanismo canônico de updated_at, reutilizado aqui em vez
--     de recriado;
--   - `commercial_leads`/`rec_projects` como destino possível de uma
--     Recommendation (via `roadmap_items`), nunca uma segunda cópia
--     dessas entidades.
--
-- Execute no Supabase SQL Editor SOMENTE após revisão humana explícita
-- E o veredito de aprovação formal do CODEX WEB no gate de segurança.
-- Safe to re-run: IF NOT EXISTS / OR REPLACE em tudo. Envolvido em uma
-- transação (Fase 34): falha no meio não deixa metade do domínio criado.
-- ============================================================

BEGIN;

-- ── 0a. public.set_updated_at() — DEPENDÊNCIA LIVE, NÃO objeto criado
--    aqui (PROMPT 08C, P1 #1) ───────────────────────────────────────
-- Já existe em Production (docs/supabase/18 e /33), com o mesmo corpo
-- (NEW.updated_at = now(); RETURN NEW;), e é compartilhada por dez
-- triggers de OUTROS domínios já ao vivo. A versão anterior desta SQL
-- redefinia esta função só para acrescentar `SET search_path = public`
-- -- um CREATE OR REPLACE sobre uma função compartilhada por 10 outros
-- triggers tem raio de explosão (blast radius) que não pertence a este
-- domínio, e cujo rollback não restaurava a configuração anterior. A
-- SQL 91 SÓ REUTILIZA public.set_updated_at() (ver triggers abaixo,
-- EXECUTE FUNCTION public.set_updated_at()) -- nunca recria, substitui,
-- endurece, dropa ou restaura. O endurecimento de search_path desta
-- função específica pertence ao backlog do Security Advisor, tratado à
-- parte, nunca de passagem dentro de outro domínio.

-- ── 0b. Helper de autorização canônico (Fase 3) ──────────────────
-- Reproduz EXATAMENTE isCompanyAuthorizedForAdmin() + os dois caminhos
-- reais de resolveCurrentClient() (profile_client_id, client_user_access)
-- -- nunca um modelo de autorização paralelo/inventado.
--
-- SECURITY INVOKER, não DEFINER (Fase 3, "não criar helper SECURITY
-- DEFINER inseguro"): as 4 tabelas consultadas aqui já têm policies que
-- permitem ao próprio usuário ler exatamente as linhas necessárias para
-- decidir seu próprio acesso --
--   • profiles: "profiles: usuário vê o próprio" (id = auth.uid())
--   • client_user_access: "client_own_access" (user_id = auth.uid())
--   • agency_workspaces: "agency_workspaces_owner_all" (owner_user_id = auth.uid())
--   • agency_clients: "agency_clients_via_workspace" (via agency_workspaces do dono)
-- -- portanto SECURITY DEFINER não é necessário: rodando como o próprio
-- invocador, a função já enxerga tudo que precisa e nada mais.
CREATE OR REPLACE FUNCTION public.can_access_client_company(target_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'cliente' AND p.client_id = target_client_id
    )
    OR EXISTS (
      SELECT 1 FROM public.client_user_access cua
      WHERE cua.user_id = auth.uid()
        AND cua.client_id = target_client_id
        AND cua.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.agency_workspaces aw
      JOIN public.agency_clients ac ON ac.agency_id = aw.id
      WHERE aw.owner_user_id = auth.uid()
        AND ac.client_id = target_client_id
        AND ac.status = 'active'
    );
$$;

COMMENT ON FUNCTION public.can_access_client_company(uuid) IS
  'Único helper de ownership Company-scoped para o domínio Diagnostic/Roadmap. '
  'Reproduz isCompanyAuthorizedForAdmin() (src/lib/company-context/resolve.ts) '
  'e os caminhos de resolveCurrentClient() -- nunca duplicar esta lógica em '
  'policies individuais, nunca conceder acesso Company-scoped só por role.';

-- PROMPT 08C, P2 (default EXECUTE ACL): Production concede EXECUTE de
-- funções novas por padrão a anon/authenticated/service_role -- "nenhum
-- GRANT explícito" NÃO significava "sem exposição". Fechado
-- explicitamente aqui. authenticated PRECISA de EXECUTE porque esta
-- função é chamada DENTRO das próprias RLS policies (USING/WITH CHECK
-- avaliam com o privilégio do papel que faz a query, diferente de
-- funções de trigger -- ver nota nas 4 funções de trigger abaixo).
REVOKE ALL ON FUNCTION public.can_access_client_company(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_client_company(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_client_company(uuid) TO authenticated;

-- Escritas (INSERT/UPDATE/DELETE) neste domínio ficam restritas a quem
-- tem ownership real da Company E é admin/super_admin (Fase 45: cliente
-- é somente-leitura neste domínio -- não existe UI de escrita de
-- Diagnóstico pelo cliente, e não há decisão de produto autorizando
-- isso ainda; adicionar policy de escrita para "cliente" exigiria uma
-- decisão de produto explícita, não assumida aqui).
CREATE OR REPLACE FUNCTION public.can_write_client_company(target_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    public.can_access_client_company(target_client_id)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    );
$$;

COMMENT ON FUNCTION public.can_write_client_company(uuid) IS
  'Fase 45 -- cliente é somente-leitura no domínio Diagnostic/Roadmap até '
  'existir decisão de produto explícita permitindo escrita.';

-- Mesmo motivo de can_access_client_company(uuid) acima -- usada
-- diretamente nas policies de INSERT/UPDATE/DELETE das 5 tabelas.
REVOKE ALL ON FUNCTION public.can_write_client_company(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_write_client_company(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_write_client_company(uuid) TO authenticated;

-- ── 1. company_diagnostics ──────────────────────────────────────
-- Uma "rodada" de diagnóstico para uma Company. Pode haver mais de uma
-- ao longo do tempo (Fase 12: diagnóstico é raiz, não evento único --
-- por isso NUNCA um UNIQUE(client_id)).
CREATE TABLE IF NOT EXISTS public.company_diagnostics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Fase 14: conjunto mínimo real -- draft (ainda não iniciado de fato),
  -- in_progress, completed, archived. Sem dez estados.
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  niche_category    TEXT,
  niche_subcategory TEXT,
  operation_type     TEXT CHECK (operation_type IN ('b2b', 'b2c', 'both') OR operation_type IS NULL),
  location_city      TEXT,
  location_state     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

-- Fase 15 (archiving): NÃO adicionamos archived_at. `status = 'archived'`
-- já é suficiente -- nenhum relatório hoje precisa saber "quando foi
-- arquivado" separado de `updated_at` (que já muda nessa transição). Se
-- isso virar um requisito real de auditoria, adicionar depois com
-- justificativa explícita, não por checklist burocrático.

-- Fase 13/30: latest diagnostic precisa de contrato determinístico --
-- (client_id, created_at DESC, id DESC) -- o adapter usa exatamente
-- esta ordem.
CREATE INDEX IF NOT EXISTS idx_company_diagnostics_client_created
  ON public.company_diagnostics (client_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_company_diagnostics_status
  ON public.company_diagnostics (status);

ALTER TABLE public.company_diagnostics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_diagnostics_admin_all"     ON public.company_diagnostics;
DROP POLICY IF EXISTS "company_diagnostics_client_select" ON public.company_diagnostics;
DROP POLICY IF EXISTS "company_diagnostics_select"         ON public.company_diagnostics;
DROP POLICY IF EXISTS "company_diagnostics_insert"         ON public.company_diagnostics;
DROP POLICY IF EXISTS "company_diagnostics_update"         ON public.company_diagnostics;
DROP POLICY IF EXISTS "company_diagnostics_delete"         ON public.company_diagnostics;

CREATE POLICY "company_diagnostics_select"
  ON public.company_diagnostics FOR SELECT TO authenticated
  USING (public.can_access_client_company(client_id));

CREATE POLICY "company_diagnostics_insert"
  ON public.company_diagnostics FOR INSERT TO authenticated
  WITH CHECK (public.can_write_client_company(client_id));

CREATE POLICY "company_diagnostics_update"
  ON public.company_diagnostics FOR UPDATE TO authenticated
  USING (public.can_write_client_company(client_id))
  WITH CHECK (public.can_write_client_company(client_id));

CREATE POLICY "company_diagnostics_delete"
  ON public.company_diagnostics FOR DELETE TO authenticated
  USING (public.can_write_client_company(client_id));

COMMENT ON TABLE public.company_diagnostics IS
  'Rodada de diagnóstico operacional de uma Company já cadastrada em '
  'clients. Não confundir com marketing_diagnostics (funil público de '
  'pré-venda, sem client_id) nem com commercial_leads (nunca vinculado '
  'a Company de forma populada na prática).';

CREATE TRIGGER trg_company_diagnostics_updated_at
  BEFORE UPDATE ON public.company_diagnostics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- client_id é imutável -- reatribuir um Diagnóstico para outra Company
-- não é um caso de uso real do produto e eliminaria uma classe inteira
-- de erro de reatribuição acidental.
CREATE OR REPLACE FUNCTION public.forbid_client_id_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'client_id é imutável em % (tentou mudar de % para %)', TG_TABLE_NAME, OLD.client_id, NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;

-- PROMPT 08C, P2: função de TRIGGER, nunca chamada diretamente por
-- código de aplicação ou por dentro de uma policy RLS -- o Postgres
-- dispara triggers automaticamente como parte da própria execução do
-- UPDATE, sem exigir que o papel que emitiu o UPDATE tenha EXECUTE na
-- função de trigger em si (diferente de can_access_client_company()/
-- can_write_client_company() acima, chamadas de dentro de USING/WITH
-- CHECK). Por isso o mínimo necessário é revogar de PUBLIC/anon e não
-- conceder authenticated -- fechando também a chamada direta via RPC
-- (`SELECT forbid_client_id_change()`), que nunca é um uso legítimo.
REVOKE ALL ON FUNCTION public.forbid_client_id_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.forbid_client_id_change() FROM anon;

CREATE TRIGGER trg_company_diagnostics_immutable_client
  BEFORE UPDATE ON public.company_diagnostics
  FOR EACH ROW EXECUTE FUNCTION public.forbid_client_id_change();

-- ── 2. diagnostic_checklist_items ───────────────────────────────
-- Checklist de maturidade -- itens binários/observáveis, category livre,
-- sem virar formulário monstro (progressive disclosure fica na UI).
CREATE TABLE IF NOT EXISTS public.diagnostic_checklist_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id  UUID NOT NULL REFERENCES public.company_diagnostics(id) ON DELETE CASCADE,
  -- Fase 17: chave estável opcional para itens de um checklist canônico
  -- (evita duplicar o mesmo item dentro do MESMO diagnóstico). NULL para
  -- itens customizados/ad-hoc -- Postgres trata NULL como distinto em
  -- UNIQUE, então checklist customizado nunca é limitado por isto.
  item_key       TEXT,
  category       TEXT NOT NULL,
  label          TEXT NOT NULL,
  -- Fase 16: yes/no/partial/unknown/not_applicable -- contrato único
  -- entre SQL, TypeScript e UI futura.
  status         TEXT NOT NULL DEFAULT 'unknown'
                 CHECK (status IN ('yes', 'no', 'partial', 'unknown', 'not_applicable')),
  notes          TEXT,
  evidence_url   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (diagnostic_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_diag_checklist_diagnostic ON public.diagnostic_checklist_items (diagnostic_id);

ALTER TABLE public.diagnostic_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diag_checklist_admin_all" ON public.diagnostic_checklist_items;
DROP POLICY IF EXISTS "diag_checklist_select"    ON public.diagnostic_checklist_items;
DROP POLICY IF EXISTS "diag_checklist_insert"    ON public.diagnostic_checklist_items;
DROP POLICY IF EXISTS "diag_checklist_update"    ON public.diagnostic_checklist_items;
DROP POLICY IF EXISTS "diag_checklist_delete"    ON public.diagnostic_checklist_items;

-- Fase 6: ownership da tabela filha vem do pai (company_diagnostics),
-- NUNCA um segundo client_id duplicado nem acesso global por role.
CREATE POLICY "diag_checklist_select"
  ON public.diagnostic_checklist_items FOR SELECT TO authenticated
  USING (
    diagnostic_id IN (
      SELECT id FROM public.company_diagnostics WHERE public.can_access_client_company(client_id)
    )
  );

CREATE POLICY "diag_checklist_insert"
  ON public.diagnostic_checklist_items FOR INSERT TO authenticated
  WITH CHECK (
    diagnostic_id IN (
      SELECT id FROM public.company_diagnostics WHERE public.can_write_client_company(client_id)
    )
  );

CREATE POLICY "diag_checklist_update"
  ON public.diagnostic_checklist_items FOR UPDATE TO authenticated
  USING (
    diagnostic_id IN (
      SELECT id FROM public.company_diagnostics WHERE public.can_write_client_company(client_id)
    )
  )
  WITH CHECK (
    diagnostic_id IN (
      SELECT id FROM public.company_diagnostics WHERE public.can_write_client_company(client_id)
    )
  );

CREATE POLICY "diag_checklist_delete"
  ON public.diagnostic_checklist_items FOR DELETE TO authenticated
  USING (
    diagnostic_id IN (
      SELECT id FROM public.company_diagnostics WHERE public.can_write_client_company(client_id)
    )
  );

CREATE TRIGGER trg_diag_checklist_updated_at
  BEFORE UPDATE ON public.diagnostic_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 3. diagnostic_findings ──────────────────────────────────────
-- Fase 7 (P0.3): a versão anterior tinha `diagnostic_id` E `client_id`
-- redundantes, sem nenhuma garantia de que apontavam para a MESMA
-- Company -- exatamente o cenário "diagnostic_id de A + client_id de B"
-- citado pelo CODEX. Decisão: REMOVER client_id daqui. A Company é
-- SEMPRE derivada via diagnostic_id → company_diagnostics.client_id --
-- elimina esta classe inteira de inconsistência em vez de tentar
-- validá-la (não confiar na aplicação, Fase 7).
CREATE TABLE IF NOT EXISTS public.diagnostic_findings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id  UUID NOT NULL REFERENCES public.company_diagnostics(id) ON DELETE CASCADE,
  category       TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  evidence_url   TEXT,
  severity       TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  priority       TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  -- Fase 18: status é workflow puro. "está no Roadmap" é uma RELAÇÃO
  -- (roadmap_items.source_type='diagnostic_recommendation'), nunca um
  -- estado do Finding -- o antigo valor in-roadmap foi removido daqui.
  status         TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'planned', 'in_progress', 'resolved', 'ignored')),
  source         TEXT NOT NULL DEFAULT 'diagnostic',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diag_findings_diagnostic ON public.diagnostic_findings (diagnostic_id);
CREATE INDEX IF NOT EXISTS idx_diag_findings_status     ON public.diagnostic_findings (status);
CREATE INDEX IF NOT EXISTS idx_diag_findings_priority   ON public.diagnostic_findings (priority);

ALTER TABLE public.diagnostic_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diag_findings_admin_all"    ON public.diagnostic_findings;
DROP POLICY IF EXISTS "diag_findings_client_select" ON public.diagnostic_findings;
DROP POLICY IF EXISTS "diag_findings_select"        ON public.diagnostic_findings;
DROP POLICY IF EXISTS "diag_findings_insert"        ON public.diagnostic_findings;
DROP POLICY IF EXISTS "diag_findings_update"        ON public.diagnostic_findings;
DROP POLICY IF EXISTS "diag_findings_delete"        ON public.diagnostic_findings;

CREATE POLICY "diag_findings_select"
  ON public.diagnostic_findings FOR SELECT TO authenticated
  USING (
    diagnostic_id IN (
      SELECT id FROM public.company_diagnostics WHERE public.can_access_client_company(client_id)
    )
  );

CREATE POLICY "diag_findings_insert"
  ON public.diagnostic_findings FOR INSERT TO authenticated
  WITH CHECK (
    diagnostic_id IN (
      SELECT id FROM public.company_diagnostics WHERE public.can_write_client_company(client_id)
    )
  );

CREATE POLICY "diag_findings_update"
  ON public.diagnostic_findings FOR UPDATE TO authenticated
  USING (
    diagnostic_id IN (
      SELECT id FROM public.company_diagnostics WHERE public.can_write_client_company(client_id)
    )
  )
  WITH CHECK (
    diagnostic_id IN (
      SELECT id FROM public.company_diagnostics WHERE public.can_write_client_company(client_id)
    )
  );

CREATE POLICY "diag_findings_delete"
  ON public.diagnostic_findings FOR DELETE TO authenticated
  USING (
    diagnostic_id IN (
      SELECT id FROM public.company_diagnostics WHERE public.can_write_client_company(client_id)
    )
  );

CREATE TRIGGER trg_diag_findings_updated_at
  BEFORE UPDATE ON public.diagnostic_findings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- diagnostic_id é imutável pelo mesmo motivo de client_id em outras
-- tabelas -- mover um Finding para outro Diagnostic (possivelmente de
-- outra Company) não é um caso de uso real.
CREATE OR REPLACE FUNCTION public.forbid_diagnostic_id_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.diagnostic_id IS DISTINCT FROM OLD.diagnostic_id THEN
    RAISE EXCEPTION 'diagnostic_id é imutável em % (tentou mudar de % para %)', TG_TABLE_NAME, OLD.diagnostic_id, NEW.diagnostic_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Mesmo motivo de forbid_client_id_change() acima -- função de trigger,
-- nunca chamada diretamente.
REVOKE ALL ON FUNCTION public.forbid_diagnostic_id_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.forbid_diagnostic_id_change() FROM anon;

CREATE TRIGGER trg_diag_findings_immutable_diagnostic
  BEFORE UPDATE ON public.diagnostic_findings
  FOR EACH ROW EXECUTE FUNCTION public.forbid_diagnostic_id_change();

-- ── 4. diagnostic_recommendations ───────────────────────────────
-- Fase 20 (decisão de produto explícita, não assumida):
--   "Um Finding pode possuir múltiplas recomendações?" SIM -- um mesmo
--   Achado (ex: "sem Google Meu Negócio configurado") pode ter mais de
--   um caminho de solução (ex: "criar perfil manualmente" vs "conectar
--   via LOKAT quando disponível") com capabilities diferentes.
--   "Uma Recommendation possui lifecycle próprio?" SIM -- o usuário
--   pode aceitar uma e ignorar outra sem alterar o status do Finding
--   em si (que permanece 'open' até estar de fato resolvido).
-- → mantida como tabela própria (não colapsada no Finding).
CREATE TABLE IF NOT EXISTS public.diagnostic_recommendations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id   UUID NOT NULL REFERENCES public.diagnostic_findings(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  capability   TEXT NOT NULL DEFAULT 'external_execution'
               CHECK (capability IN ('internal_execution', 'external_execution', 'coming_soon', 'not_supported')),
  -- Fase 22: lifecycle mínimo, sem duplicar o status do Roadmap.
  status       TEXT NOT NULL DEFAULT 'suggested'
               CHECK (status IN ('suggested', 'accepted', 'dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diag_recommendations_finding ON public.diagnostic_recommendations (finding_id);

ALTER TABLE public.diagnostic_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diag_recommendations_admin_all" ON public.diagnostic_recommendations;
DROP POLICY IF EXISTS "diag_recommendations_select"     ON public.diagnostic_recommendations;
DROP POLICY IF EXISTS "diag_recommendations_insert"     ON public.diagnostic_recommendations;
DROP POLICY IF EXISTS "diag_recommendations_update"     ON public.diagnostic_recommendations;
DROP POLICY IF EXISTS "diag_recommendations_delete"     ON public.diagnostic_recommendations;

-- Fase 8: Recommendation herda Company de finding_id → finding →
-- diagnostic → client. Cadeia de 3 saltos, nunca um client_id próprio.
CREATE POLICY "diag_recommendations_select"
  ON public.diagnostic_recommendations FOR SELECT TO authenticated
  USING (
    finding_id IN (
      SELECT df.id FROM public.diagnostic_findings df
      JOIN public.company_diagnostics cd ON cd.id = df.diagnostic_id
      WHERE public.can_access_client_company(cd.client_id)
    )
  );

CREATE POLICY "diag_recommendations_insert"
  ON public.diagnostic_recommendations FOR INSERT TO authenticated
  WITH CHECK (
    finding_id IN (
      SELECT df.id FROM public.diagnostic_findings df
      JOIN public.company_diagnostics cd ON cd.id = df.diagnostic_id
      WHERE public.can_write_client_company(cd.client_id)
    )
  );

CREATE POLICY "diag_recommendations_update"
  ON public.diagnostic_recommendations FOR UPDATE TO authenticated
  USING (
    finding_id IN (
      SELECT df.id FROM public.diagnostic_findings df
      JOIN public.company_diagnostics cd ON cd.id = df.diagnostic_id
      WHERE public.can_write_client_company(cd.client_id)
    )
  )
  WITH CHECK (
    finding_id IN (
      SELECT df.id FROM public.diagnostic_findings df
      JOIN public.company_diagnostics cd ON cd.id = df.diagnostic_id
      WHERE public.can_write_client_company(cd.client_id)
    )
  );

CREATE POLICY "diag_recommendations_delete"
  ON public.diagnostic_recommendations FOR DELETE TO authenticated
  USING (
    finding_id IN (
      SELECT df.id FROM public.diagnostic_findings df
      JOIN public.company_diagnostics cd ON cd.id = df.diagnostic_id
      WHERE public.can_write_client_company(cd.client_id)
    )
  );

CREATE TRIGGER trg_diag_recommendations_updated_at
  BEFORE UPDATE ON public.diagnostic_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- finding_id é imutável pelo mesmo motivo de client_id/diagnostic_id em
-- outras tabelas desta migration -- usa uma função dedicada (esta
-- tabela tem finding_id, não diagnostic_id, então
-- forbid_diagnostic_id_change() não se aplica aqui).
CREATE OR REPLACE FUNCTION public.forbid_finding_id_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.finding_id IS DISTINCT FROM OLD.finding_id THEN
    RAISE EXCEPTION 'finding_id é imutável em % (tentou mudar de % para %)', TG_TABLE_NAME, OLD.finding_id, NEW.finding_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Mesmo motivo de forbid_client_id_change() acima -- função de trigger,
-- nunca chamada diretamente.
REVOKE ALL ON FUNCTION public.forbid_finding_id_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.forbid_finding_id_change() FROM anon;

CREATE TRIGGER trg_diag_recommendations_immutable_finding
  BEFORE UPDATE ON public.diagnostic_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.forbid_finding_id_change();

-- ── 5. roadmap_items ─────────────────────────────────────────────
-- Fase 24/25/26: Roadmap real, nunca lista demonstrativa. Nasce de uma
-- Recommendation, do Radar (tabela ainda não existe -- source_id fica
-- nulo/não-validado para este source_type, aceito como dívida
-- documentada, Fase 27), ou de decisão manual.
CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_type           TEXT NOT NULL DEFAULT 'manual'
                        CHECK (source_type IN ('diagnostic_recommendation', 'radar', 'manual')),
  -- Fase 27: source_id é polimórfico por design (aponta para
  -- diagnostic_recommendations.id quando source_type='diagnostic_recommendation',
  -- ou para uma futura tabela de Radar quando source_type='radar').
  -- NÃO finge ser uma FK real -- Postgres não suporta FK condicional
  -- por valor de coluna. A validação de consistência para o caso
  -- 'diagnostic_recommendation' (o único source real hoje) é feita por
  -- trigger abaixo (trg_roadmap_items_consistency), não só na aplicação.
  -- 'radar' fica como valor futuro aceito sem tabela ainda (Fase 26:
  -- não é criada FK para uma tabela inexistente) -- dívida documentada
  -- conscientemente, não inconsistência escondida.
  source_id             UUID,
  title                 TEXT NOT NULL,
  description           TEXT,
  priority              TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  -- Fase 25: status é workflow puro. "Está em um Project" já é
  -- representado por project_id IS NOT NULL -- não duplicado aqui como
  -- estado (os antigos valores in-project/in-campaign da versão
  -- anterior foram removidos, mesma confusão workflow-vs-relação
  -- corrigida no Finding). Campaign ainda não existe como entidade --
  -- nenhum estado/coluna criado para ela.
  status                TEXT NOT NULL DEFAULT 'planned'
                        CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  destination_capability TEXT CHECK (destination_capability IN ('internal_execution', 'external_execution', 'coming_soon', 'not_supported') OR destination_capability IS NULL),
  owner_user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date              DATE,
  -- Preenchido quando o item vira Project real -- nunca duplica o
  -- registro, só referencia. Fase 10/11 (P0.3): consistência
  -- cross-company garantida por trigger, não só em TypeScript --
  -- ver trg_roadmap_items_consistency.
  project_id            UUID REFERENCES public.rec_projects(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 'manual' nunca deveria ter um source_id (não há origem estruturada
  -- para referenciar).
  CHECK (source_type <> 'manual' OR source_id IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_items_client_status ON public.roadmap_items (client_id, status);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_project        ON public.roadmap_items (project_id) WHERE project_id IS NOT NULL;

ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roadmap_items_admin_all"    ON public.roadmap_items;
DROP POLICY IF EXISTS "roadmap_items_client_select" ON public.roadmap_items;
DROP POLICY IF EXISTS "roadmap_items_select"        ON public.roadmap_items;
DROP POLICY IF EXISTS "roadmap_items_insert"        ON public.roadmap_items;
DROP POLICY IF EXISTS "roadmap_items_update"        ON public.roadmap_items;
DROP POLICY IF EXISTS "roadmap_items_delete"        ON public.roadmap_items;

CREATE POLICY "roadmap_items_select"
  ON public.roadmap_items FOR SELECT TO authenticated
  USING (public.can_access_client_company(client_id));

CREATE POLICY "roadmap_items_insert"
  ON public.roadmap_items FOR INSERT TO authenticated
  WITH CHECK (public.can_write_client_company(client_id));

CREATE POLICY "roadmap_items_update"
  ON public.roadmap_items FOR UPDATE TO authenticated
  USING (public.can_write_client_company(client_id))
  WITH CHECK (public.can_write_client_company(client_id));

CREATE POLICY "roadmap_items_delete"
  ON public.roadmap_items FOR DELETE TO authenticated
  USING (public.can_write_client_company(client_id));

CREATE TRIGGER trg_roadmap_items_updated_at
  BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_roadmap_items_immutable_client
  BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.forbid_client_id_change();

-- Fase 10/11 (P0.3) + Fase 27: garante no banco, não só na aplicação,
-- que um roadmap_item nunca aponta para um Project OU uma
-- Recommendation de OUTRA Company. rec_projects.client_id é nullable
-- (projeto pode não ter Company associada ainda) -- não alteramos
-- rec_projects estruturalmente para isto (Fase 11: só o justificável),
-- em vez disso o trigger exige que, quando project_id É informado, o
-- projeto já tenha um client_id que bate exatamente com o
-- roadmap_items.client_id.
CREATE OR REPLACE FUNCTION public.validate_roadmap_item_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.rec_projects rp
      WHERE rp.id = NEW.project_id AND rp.client_id = NEW.client_id
    ) THEN
      RAISE EXCEPTION 'roadmap_items.project_id (%) precisa pertencer ao mesmo client_id (%) do roadmap_item', NEW.project_id, NEW.client_id;
    END IF;
  END IF;

  IF NEW.source_type = 'diagnostic_recommendation' AND NEW.source_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.diagnostic_recommendations dr
      JOIN public.diagnostic_findings df ON df.id = dr.finding_id
      JOIN public.company_diagnostics cd ON cd.id = df.diagnostic_id
      WHERE dr.id = NEW.source_id AND cd.client_id = NEW.client_id
    ) THEN
      RAISE EXCEPTION 'roadmap_items.source_id (%) precisa referenciar uma diagnostic_recommendation do mesmo client_id (%)', NEW.source_id, NEW.client_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Mesmo motivo de forbid_client_id_change() acima -- função de trigger,
-- nunca chamada diretamente.
REVOKE ALL ON FUNCTION public.validate_roadmap_item_consistency() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_roadmap_item_consistency() FROM anon;

CREATE TRIGGER trg_roadmap_items_consistency
  BEFORE INSERT OR UPDATE ON public.roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_roadmap_item_consistency();

COMMENT ON TABLE public.roadmap_items IS
  'Roadmap real por Company, nunca lista demonstrativa. source_id é '
  'polimórfico por design (Fase 27) -- consistência de Company '
  'garantida por trigger (trg_roadmap_items_consistency), não apenas '
  'pela aplicação.';

-- ── 6. Grants de TABELA (Fase 35) ─────────────────────────────────
-- Auditado contra o padrão real do projeto: nenhum dos 90 arquivos SQL
-- anteriores adiciona GRANT explícito por tabela -- table-level DML é
-- governado pelos grants padrão de schema do Supabase (authenticated/
-- anon) com RLS como o filtro real linha-a-linha. Mantido o mesmo
-- padrão aqui -- nenhum GRANT de TABELA novo, RLS é a camada de
-- enforcement, consistente com client_data_sources/
-- client_report_uploads (SQL 64) e client_projects/client_files (SQL 44).
--
-- PROMPT 08C, P2: isto é DIFERENTE do EXECUTE de FUNÇÃO -- Production
-- confirmou (audit LIVE) que funções novas herdam EXECUTE por ACL
-- default para anon/authenticated/service_role mesmo sem GRANT
-- explícito. Por isso as 6 funções desta SQL (2 helpers de RLS + 4
-- triggers) já foram fechadas explicitamente logo após cada definição
-- acima -- REVOKE ALL FROM PUBLIC/anon em todas, GRANT EXECUTE TO
-- authenticated só nas 2 usadas dentro de USING/WITH CHECK. Tabelas não
-- têm esse "default ACL de função" -- por isso a decisão de não haver
-- GRANT de tabela continua válida e não precisou mudar.

COMMIT;

-- ============================================================
-- FIM DO SCHEMA FINAL — status: SQL_READY_FOR_MANUAL_APPROVAL
-- (aguardando o veredito de aprovação formal do CODEX WEB antes de
-- qualquer execução — ver Fase 58 / SUCCESS CRITERIA do brief SQL 91
-- Security Hardening V2)
--
-- Próximos passos humanos, em ordem:
--   1. CODEX WEB reexecuta o gate DIAGNOSTIC + ROADMAP SCHEMA FINAL
--      sobre esta versão;
--   2. só com aprovação formal do CODEX WEB, pedir autorização explícita
--      do usuário para rodar no Supabase SQL Editor;
--   3. rodar docs/supabase/91-company-diagnostic-roadmap-rls-test-plan.sql
--      manualmente (2 contas reais, Company A e Company B) para
--      confirmar isolamento antes de liberar qualquer UI;
--   4. só então implementar as telas de Diagnóstico/Achados/Roadmap em
--      código, usando resolveCompanyContext() (nunca um resolver novo).
-- ============================================================
