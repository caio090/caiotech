-- ============================================================
-- LOKAT OS — SQL 91 (PROPOSTA — NÃO EXECUTADA)
-- Company Diagnostic → Finding → Recommendation → Roadmap Item
--
-- Sprint MVP Final Consolidation V1 (Fase 87) — este arquivo é uma
-- PROPOSTA de schema, escrita para revisão humana. NÃO foi rodada no
-- Supabase por Claude Code, conforme a regra absoluta desta sprint:
-- "NÃO executar SQL automaticamente. NÃO alterar Supabase schema
-- automaticamente."
--
-- POR QUÊ este schema é necessário:
-- Auditoria completa (Fase 15) confirmou que NENHUM modelo existente é
-- reaproveitável para "Diagnóstico de uma Company já onboardada, que
-- produz Achados/Recomendações/Roadmap":
--   - `marketing_diagnostics` (docs/supabase/49) é um FUNIL PÚBLICO de
--     pré-venda (visitante anônimo preenche um formulário e vira um
--     lead com `lead_score`/`lead_temperature`) -- não tem `client_id`,
--     só `company_name` em texto livre, e nunca se vincula a uma Company
--     já cadastrada em `clients`.
--   - `commercial_leads.client_id` existe na tabela mas nunca é
--     populado por nenhum fluxo real da aplicação (confirmado por grep
--     em src/app/operacional/comercial/**) -- não é a mesma coisa e não
--     resolve o problema.
-- Portanto, um Diagnóstico real "desta Company, sobre esta Company" é
-- uma capacidade genuinamente nova, sem equivalente a reaproveitar.
--
-- Reaproveita explicitamente:
--   - `public.clients(id)` como a Company (nenhuma tabela de Company nova);
--   - o mesmo padrão de RLS admin_all/client_select já usado em
--     `client_data_sources`/`client_report_uploads` (docs/supabase/64);
--   - `commercial_leads`/`rec_projects` como destino possível de uma
--     Recommendation (via `roadmap_items`), nunca uma segunda cópia
--     dessas entidades.
--
-- Execute no Supabase SQL Editor SOMENTE após revisão humana explícita.
-- Safe to re-run: IF NOT EXISTS em tudo.
-- ============================================================

-- ── 1. company_diagnostics ──────────────────────────────────────
-- Uma "rodada" de diagnóstico para uma Company. Pode haver mais de uma
-- ao longo do tempo (Fase 14: diagnóstico é raiz, não evento único).
CREATE TABLE IF NOT EXISTS public.company_diagnostics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'in_progress'
                CHECK (status IN ('in_progress', 'completed', 'archived')),
  -- Nicho estrutural da Company (Fase 13) -- categoria simples, não uma
  -- taxonomia gigantesca.
  niche_category    TEXT,
  niche_subcategory TEXT,
  operation_type     TEXT CHECK (operation_type IN ('b2b', 'b2c', 'both') OR operation_type IS NULL),
  location_city      TEXT,
  location_state     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_company_diagnostics_client ON public.company_diagnostics (client_id);
CREATE INDEX IF NOT EXISTS idx_company_diagnostics_status ON public.company_diagnostics (status);

ALTER TABLE public.company_diagnostics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_diagnostics_admin_all"    ON public.company_diagnostics;
DROP POLICY IF EXISTS "company_diagnostics_client_select" ON public.company_diagnostics;

CREATE POLICY "company_diagnostics_admin_all"
  ON public.company_diagnostics FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency','operacional'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency'))
  );

CREATE POLICY "company_diagnostics_client_select"
  ON public.company_diagnostics FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE owner_id = auth.uid())
  );

COMMENT ON TABLE public.company_diagnostics IS
  'Rodada de diagnóstico operacional de uma Company já cadastrada em '
  'clients. Não confundir com marketing_diagnostics (funil público de '
  'pré-venda, sem client_id) nem com commercial_leads (nunca vinculado '
  'a Company de forma populada na prática).';

-- ── 2. diagnostic_checklist_items ───────────────────────────────
-- Checklist de maturidade (Fase 17) -- itens binários/observáveis
-- (Instagram configurado? Meta conectado? Site existe?), category livre
-- para as ~20 áreas da Fase 16, sem virar formulário monstro (progressive
-- disclosure fica na camada de UI, não no schema).
CREATE TABLE IF NOT EXISTS public.diagnostic_checklist_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id  UUID NOT NULL REFERENCES public.company_diagnostics(id) ON DELETE CASCADE,
  category       TEXT NOT NULL,
  label          TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'unknown'
                 CHECK (status IN ('yes', 'no', 'partial', 'unknown')),
  notes          TEXT,
  evidence_url   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diag_checklist_diagnostic ON public.diagnostic_checklist_items (diagnostic_id);

ALTER TABLE public.diagnostic_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diag_checklist_admin_all" ON public.diagnostic_checklist_items;
CREATE POLICY "diag_checklist_admin_all"
  ON public.diagnostic_checklist_items FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency','operacional'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency'))
  );

-- ── 3. diagnostic_findings ──────────────────────────────────────
-- Fase 20: diagnóstico não produz só respostas, produz Achados.
CREATE TABLE IF NOT EXISTS public.diagnostic_findings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id  UUID NOT NULL REFERENCES public.company_diagnostics(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category       TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  evidence_url   TEXT,
  severity       TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  priority       TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_roadmap', 'resolved', 'ignored')),
  source         TEXT NOT NULL DEFAULT 'diagnostic',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diag_findings_diagnostic ON public.diagnostic_findings (diagnostic_id);
CREATE INDEX IF NOT EXISTS idx_diag_findings_client     ON public.diagnostic_findings (client_id);

ALTER TABLE public.diagnostic_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diag_findings_admin_all"    ON public.diagnostic_findings;
DROP POLICY IF EXISTS "diag_findings_client_select" ON public.diagnostic_findings;

CREATE POLICY "diag_findings_admin_all"
  ON public.diagnostic_findings FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency','operacional'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency'))
  );

CREATE POLICY "diag_findings_client_select"
  ON public.diagnostic_findings FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE owner_id = auth.uid())
  );

-- ── 4. diagnostic_recommendations ───────────────────────────────
-- Fase 21/22: um Finding pode ter uma Recommendation, que sabe sua
-- própria capability (Fase 22) -- nunca promete algo que o produto não
-- executa de verdade.
CREATE TABLE IF NOT EXISTS public.diagnostic_recommendations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id   UUID NOT NULL REFERENCES public.diagnostic_findings(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  capability   TEXT NOT NULL DEFAULT 'external_execution'
               CHECK (capability IN ('internal_execution', 'external_execution', 'coming_soon', 'not_supported')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diag_recommendations_finding ON public.diagnostic_recommendations (finding_id);

ALTER TABLE public.diagnostic_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diag_recommendations_admin_all" ON public.diagnostic_recommendations;
CREATE POLICY "diag_recommendations_admin_all"
  ON public.diagnostic_recommendations FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency','operacional'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency'))
  );

-- ── 5. roadmap_items ─────────────────────────────────────────────
-- Fase 24/25: Roadmap real, nunca lista demonstrativa. Nasce de um
-- Finding/Recommendation, do Radar, ou de decisão manual (source_type
-- distingue a origem -- Fase 30, sem inventar coluna nova além desta).
CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_type           TEXT NOT NULL DEFAULT 'manual'
                        CHECK (source_type IN ('diagnostic_recommendation', 'radar', 'manual')),
  source_id             UUID,
  title                 TEXT NOT NULL,
  priority              TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status                TEXT NOT NULL DEFAULT 'planned'
                        CHECK (status IN ('planned', 'in_project', 'in_campaign', 'done', 'dismissed')),
  destination_capability TEXT CHECK (destination_capability IN ('internal_execution', 'external_execution', 'coming_soon', 'not_supported') OR destination_capability IS NULL),
  owner_user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date              DATE,
  -- Preenchido quando o item vira Project/Campaign real (Fase 41/42) --
  -- nunca duplica o registro, só referencia.
  project_id            UUID REFERENCES public.rec_projects(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roadmap_items_client ON public.roadmap_items (client_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_status ON public.roadmap_items (status);

ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roadmap_items_admin_all"    ON public.roadmap_items;
DROP POLICY IF EXISTS "roadmap_items_client_select" ON public.roadmap_items;

CREATE POLICY "roadmap_items_admin_all"
  ON public.roadmap_items FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency','operacional'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency'))
  );

CREATE POLICY "roadmap_items_client_select"
  ON public.roadmap_items FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE owner_id = auth.uid())
  );

-- ============================================================
-- FIM DA PROPOSTA — status: MANUAL_WEB_ACTION_REQUIRED
-- Próximos passos humanos, em ordem:
--   1. revisar os nomes/colunas/policies acima;
--   2. rodar no Supabase SQL Editor (ambiente de escolha do usuário);
--   3. só então implementar as telas de Diagnóstico/Achados/Roadmap em
--      código, usando resolveCompanyContext() (nunca um resolver novo)
--      para o Company Context, exatamente como Company Central/Meu
--      Escritório/Projetos já fazem hoje.
-- ============================================================
