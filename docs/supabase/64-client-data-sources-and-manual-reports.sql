-- ============================================================
-- 64 - Fontes de Dados e Relatórios Manuais por Cliente
--
-- Executar APÓS: SQLs base (clients, profiles)
-- Idempotente. Sem dados reais de clientes.
--
-- Objetivo:
--   Desacoplar "faturamento" de "OlaClick".
--   Qualquer cliente — restaurante, clínica, loja, material de
--   construção, academia, prestador de serviço — pode ter fontes
--   de dados variadas: APIs automáticas, planilhas, PDFs, prints,
--   curva ABC, relatórios de caixa, etc.
--
-- Tabelas:
--   client_data_sources      — fontes de dados por cliente
--   client_report_uploads    — arquivos e relatórios manuais
--   client_business_snapshots — snapshots extraídos por período
-- ============================================================


-- ── 1. client_data_sources ────────────────────────────────────
-- Registra cada fonte de dados vinculada a um cliente.
-- Uma conexão Meta, OlaClick ou um upload manual são registrados aqui.

CREATE TABLE IF NOT EXISTS public.client_data_sources (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Categoria da fonte
  -- 'meta' | 'digital_menu' | 'crm' | 'whatsapp' | 'website' | 'pos'
  -- 'cash_register' | 'manual_file' | 'spreadsheet' | 'screenshot'
  -- 'accounting' | 'custom_api'
  source_type     text        NOT NULL,

  -- Provedor específico dentro da categoria (nullable para fontes manuais)
  -- 'olaclick' | 'anota_ai' | 'meta' | 'rd_station' | 'manual' | null
  provider_slug   text        NULL,

  -- Nome legível para exibição
  source_name     text        NOT NULL,

  -- 'active' | 'pending' | 'disconnected' | 'error'
  status          text        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','pending','disconnected','error')),

  last_sync_at    timestamptz NULL,
  last_upload_at  timestamptz NULL,

  -- Metadados flexíveis: connection_id de referência, page_id, etc.
  metadata        jsonb       NOT NULL DEFAULT '{}',

  created_by      uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_sources_client_id
  ON public.client_data_sources (client_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_source_type
  ON public.client_data_sources (source_type);
CREATE INDEX IF NOT EXISTS idx_data_sources_provider_slug
  ON public.client_data_sources (provider_slug)
  WHERE provider_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_sources_status
  ON public.client_data_sources (status);

CREATE OR REPLACE FUNCTION update_client_data_sources_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_data_sources_updated_at ON public.client_data_sources;
CREATE TRIGGER trg_data_sources_updated_at
  BEFORE UPDATE ON public.client_data_sources
  FOR EACH ROW EXECUTE FUNCTION update_client_data_sources_updated_at();

ALTER TABLE public.client_data_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "data_sources_admin_all"     ON public.client_data_sources;
DROP POLICY IF EXISTS "data_sources_client_select"  ON public.client_data_sources;

CREATE POLICY "data_sources_admin_all"
  ON public.client_data_sources FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency','operacional'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency'))
  );

CREATE POLICY "data_sources_client_select"
  ON public.client_data_sources FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE owner_id = auth.uid())
  );

COMMENT ON TABLE public.client_data_sources IS
  'Fontes de dados por cliente. Inclui integrações automáticas (Meta, '
  'Cardápio Digital, CRM) e fontes manuais (arquivos, planilhas, prints). '
  'provider_slug identifica o provedor específico dentro de cada source_type.';


-- ── 2. client_report_uploads ──────────────────────────────────
-- Armazena metadados de relatórios enviados manualmente ou gerados
-- por automação. O arquivo fica no Supabase Storage (bucket: client-reports).

CREATE TABLE IF NOT EXISTS public.client_report_uploads (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  data_source_id       uuid        NULL REFERENCES public.client_data_sources(id) ON DELETE SET NULL,

  -- Tipo de relatório
  -- 'revenue' | 'sales' | 'abc_curve' | 'products' | 'services'
  -- 'leads' | 'appointments' | 'crm' | 'campaign' | 'traffic' | 'general'
  report_type          text        NOT NULL DEFAULT 'general',

  -- Período coberto pelo relatório
  period_start         date        NULL,
  period_end           date        NULL,

  -- Arquivo
  file_name            text        NULL,
  file_url             text        NULL,  -- path no Storage ou URL externa
  file_type            text        NULL,  -- 'pdf' | 'xlsx' | 'csv' | 'png' | 'jpg'

  -- Status do arquivo
  -- 'uploaded' | 'processing' | 'processed' | 'failed'
  upload_status        text        NOT NULL DEFAULT 'uploaded'
                                   CHECK (upload_status IN ('uploaded','processing','processed','failed')),

  -- Status da extração/interpretação
  -- 'pending' | 'processing' | 'processed' | 'failed' | 'manual_review'
  extraction_status    text        NOT NULL DEFAULT 'pending'
                                   CHECK (extraction_status IN ('pending','processing','processed','failed','manual_review')),

  -- Conteúdo extraído
  raw_text             text        NULL,     -- texto bruto extraído do arquivo
  extracted_data       jsonb       NOT NULL DEFAULT '{}',
  ai_summary           text        NULL,
  ai_recommendations   jsonb       NOT NULL DEFAULT '[]',

  notes                text        NULL,

  created_by           uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_uploads_client_id
  ON public.client_report_uploads (client_id);
CREATE INDEX IF NOT EXISTS idx_report_uploads_report_type
  ON public.client_report_uploads (report_type);
CREATE INDEX IF NOT EXISTS idx_report_uploads_period
  ON public.client_report_uploads (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_report_uploads_extraction_status
  ON public.client_report_uploads (extraction_status);
CREATE INDEX IF NOT EXISTS idx_report_uploads_created_at
  ON public.client_report_uploads (created_at DESC);

CREATE OR REPLACE FUNCTION update_client_report_uploads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_report_uploads_updated_at ON public.client_report_uploads;
CREATE TRIGGER trg_report_uploads_updated_at
  BEFORE UPDATE ON public.client_report_uploads
  FOR EACH ROW EXECUTE FUNCTION update_client_report_uploads_updated_at();

ALTER TABLE public.client_report_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_uploads_admin_all"    ON public.client_report_uploads;
DROP POLICY IF EXISTS "report_uploads_client_select" ON public.client_report_uploads;

CREATE POLICY "report_uploads_admin_all"
  ON public.client_report_uploads FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency','operacional'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency'))
  );

CREATE POLICY "report_uploads_client_select"
  ON public.client_report_uploads FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE owner_id = auth.uid())
  );

COMMENT ON TABLE public.client_report_uploads IS
  'Relatórios manuais ou automáticos enviados para análise. '
  'Serve para qualquer tipo de negócio: restaurante (curva ABC, caixa), '
  'clínica (agendamentos), loja (vendas), construtora (curva de materiais). '
  'Arquivo em Storage: client-reports/{client_id}/{year}/{month}/{filename}';


-- ── 3. client_business_snapshots ─────────────────────────────
-- Snapshots de negócio por período, extraídos de qualquer fonte.
-- Unifica dados de APIs automáticas e relatórios manuais para
-- exibição unificada no painel.

CREATE TABLE IF NOT EXISTS public.client_business_snapshots (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_upload_id     uuid        NULL REFERENCES public.client_report_uploads(id) ON DELETE SET NULL,

  -- Origem do snapshot
  source_type          text        NOT NULL,   -- mesmo enum de client_data_sources
  provider_slug        text        NULL,

  -- Período
  period_start         date        NULL,
  period_end           date        NULL,

  -- Métricas principais (genéricas — servem para qualquer nicho)
  total_revenue        numeric     NULL,   -- faturamento / receita
  total_orders         integer     NULL,   -- pedidos / atendimentos / serviços
  total_leads          integer     NULL,
  closed_deals         integer     NULL,
  average_ticket       numeric     NULL,

  -- Dados estruturados flexíveis
  best_selling_items   jsonb       NOT NULL DEFAULT '[]',  -- produtos/serviços mais vendidos
  weak_items           jsonb       NOT NULL DEFAULT '[]',  -- produtos/serviços parados
  best_days            jsonb       NOT NULL DEFAULT '[]',
  opportunities        jsonb       NOT NULL DEFAULT '[]',

  -- Interpretação
  notes                text        NULL,
  confidence_score     numeric     NULL CHECK (confidence_score BETWEEN 0 AND 1),

  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_client_id
  ON public.client_business_snapshots (client_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_source_type
  ON public.client_business_snapshots (source_type);
CREATE INDEX IF NOT EXISTS idx_snapshots_period
  ON public.client_business_snapshots (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at
  ON public.client_business_snapshots (created_at DESC);

ALTER TABLE public.client_business_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "snapshots_admin_all"    ON public.client_business_snapshots;
DROP POLICY IF EXISTS "snapshots_client_select" ON public.client_business_snapshots;

CREATE POLICY "snapshots_admin_all"
  ON public.client_business_snapshots FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency','operacional'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
            AND p.role IN ('super_admin','admin','agency'))
  );

CREATE POLICY "snapshots_client_select"
  ON public.client_business_snapshots FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE owner_id = auth.uid())
  );

-- ── 4. Reload schema ──────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Notas de uso ──────────────────────────────────────────────
-- Após rodar este SQL:
-- 1. Qualquer cliente pode ter fontes de dados registradas em
--    client_data_sources, independente de ter API conectada.
-- 2. Relatórios manuais (PDF, Excel, CSV, imagem) ficam em
--    client_report_uploads com status de extração.
-- 3. client_business_snapshots unifica dados de qualquer fonte
--    para exibição no painel — sem inventar dados.
-- 4. Bucket de Storage sugerido: client-reports
--    Path: client-reports/{client_id}/{year}/{month}/{filename}
--    Criar manualmente no Supabase Storage com política pública=false.
-- Sem dados reais de clientes neste arquivo.
