-- ============================================================
-- 66 - Adiciona coluna report_source a client_report_uploads
--
-- Executar APÓS: 64-client-data-sources-and-manual-reports.sql
-- Idempotente. Sem dados reais.
--
-- Motivo: A UI de Fontes de Dados precisa registrar de onde veio
-- o relatório (Cardápio Digital, PDV, Planilha manual, Print,
-- PDF, CRM, Sistema externo, Outro) separado do tipo de relatório.
-- ============================================================

ALTER TABLE public.client_report_uploads
  ADD COLUMN IF NOT EXISTS report_source text NULL;

COMMENT ON COLUMN public.client_report_uploads.report_source IS
  'Origem do relatório: digital_menu | pdv | manual_sheet | print | '
  'pdf | crm | external_system | other. '
  'Diferente de report_type (o que é) — indica de onde veio o dado.';

NOTIFY pgrst, 'reload schema';
