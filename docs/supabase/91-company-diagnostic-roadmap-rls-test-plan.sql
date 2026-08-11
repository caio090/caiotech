-- ============================================================
-- LOKAT OS — SQL 91 RLS VERIFICATION PLAN (Security Hardening V2)
-- Fase 42-44 do brief SQL 91 Security Hardening V2.
--
-- NÃO É PARA EXECUTAR AUTOMATICAMENTE. Este arquivo é um roteiro de
-- verificação manual para rodar DEPOIS do SQL 91 ser aplicado (e
-- SOMENTE depois), usando duas contas reais de teste (nunca Companies
-- de produção) para provar isolamento antes de liberar qualquer UI.
--
-- Pré-requisitos:
--   • Company A e Company B: duas linhas reais em `clients`, criadas
--     via UI (nunca INSERT direto), pertencentes a agências/usuários
--     DIFERENTES.
--   • Usuário Alfa: admin com client_user_access ativo para Company A
--     apenas (sem vínculo com B).
--   • Usuário Beta: mesma coisa, mas para Company B.
--   • Rodar cada bloco autenticado como o usuário indicado (Supabase
--     SQL Editor "Run as" / RLS impersonation, ou via um client real
--     autenticado -- NUNCA como service_role, que bypassa RLS por
--     definição e não prova nada sobre a policy).
-- ============================================================

-- ── Bloco 1 — Usuário Alfa (só tem acesso à Company A) ──────────

-- 1.1 SELECT em company_diagnostics de A → deve retornar linha(s).
-- SELECT * FROM public.company_diagnostics WHERE client_id = '<COMPANY_A_ID>';

-- 1.2 SELECT em company_diagnostics de B → deve retornar 0 linhas
--     (nunca um erro -- RLS filtra silenciosamente, é o comportamento
--     correto do Postgres/Supabase).
-- SELECT * FROM public.company_diagnostics WHERE client_id = '<COMPANY_B_ID>';

-- 1.3 INSERT em company_diagnostics para A → deve ter sucesso.
-- INSERT INTO public.company_diagnostics (client_id) VALUES ('<COMPANY_A_ID>');

-- 1.4 INSERT em company_diagnostics para B (client_id de B enquanto
--     autenticado como Alfa) → DEVE FALHAR (RLS WITH CHECK).
-- INSERT INTO public.company_diagnostics (client_id) VALUES ('<COMPANY_B_ID>');

-- 1.5 UPDATE de um diagnostic de A → deve ter sucesso.
-- UPDATE public.company_diagnostics SET status = 'in_progress' WHERE client_id = '<COMPANY_A_ID>';

-- 1.6 UPDATE de um diagnostic de B (0 linhas afetadas, nunca erro) →
--     confirmar rowcount = 0, nunca uma linha de B alterada.
-- UPDATE public.company_diagnostics SET status = 'archived' WHERE client_id = '<COMPANY_B_ID>';

-- 1.7 Tentar mudar client_id de um diagnostic de A para B → DEVE FALHAR
--     (trigger forbid_client_id_change, não apenas RLS).
-- UPDATE public.company_diagnostics SET client_id = '<COMPANY_B_ID>' WHERE client_id = '<COMPANY_A_ID>' LIMIT 1;

-- 1.8 DELETE de um diagnostic de B → 0 linhas afetadas.
-- DELETE FROM public.company_diagnostics WHERE client_id = '<COMPANY_B_ID>';

-- ── Bloco 2 — Child table security (Fase 43) ─────────────────────
-- Repetir a lógica acima para as tabelas filhas -- Alfa NUNCA deve
-- enxergar/escrever checklist, findings ou recommendations cujo
-- diagnostic_id pertence a um diagnostic de B.

-- 2.1 checklist de um diagnostic de B → 0 linhas para Alfa.
-- SELECT * FROM public.diagnostic_checklist_items
--   WHERE diagnostic_id IN (SELECT id FROM public.company_diagnostics WHERE client_id = '<COMPANY_B_ID>');

-- 2.2 findings de um diagnostic de B → 0 linhas para Alfa.
-- SELECT * FROM public.diagnostic_findings
--   WHERE diagnostic_id IN (SELECT id FROM public.company_diagnostics WHERE client_id = '<COMPANY_B_ID>');

-- 2.3 recommendations de um finding de B → 0 linhas para Alfa.
-- SELECT dr.* FROM public.diagnostic_recommendations dr
--   JOIN public.diagnostic_findings df ON df.id = dr.finding_id
--   JOIN public.company_diagnostics cd ON cd.id = df.diagnostic_id
--   WHERE cd.client_id = '<COMPANY_B_ID>';

-- ── Bloco 3 — Cross-company FK/trigger integrity (Fase 44) ───────

-- 3.1 Finding: diagnostic_id de A, mas tentando um evidence_url normal
--     (controle -- deve funcionar, não é um teste de segurança).
-- INSERT INTO public.diagnostic_findings (diagnostic_id, category, title)
--   VALUES ('<DIAGNOSTIC_ID_DE_A>', 'presenca_digital', 'Sem Google Meu Negócio');

-- 3.2 Roadmap: client_id = A, project_id apontando para um rec_projects
--     cujo client_id é B → DEVE FALHAR
--     (trg_roadmap_items_consistency, erro explícito, nunca silencioso).
-- INSERT INTO public.roadmap_items (client_id, project_id, title)
--   VALUES ('<COMPANY_A_ID>', '<REC_PROJECT_ID_DE_B>', 'Item cross-company (deve falhar)');

-- 3.3 Roadmap: client_id = A, source_type = 'diagnostic_recommendation',
--     source_id apontando para uma recommendation cuja cadeia
--     (finding → diagnostic → client) é B → DEVE FALHAR.
-- INSERT INTO public.roadmap_items (client_id, source_type, source_id, title)
--   VALUES ('<COMPANY_A_ID>', 'diagnostic_recommendation', '<RECOMMENDATION_ID_DE_B>', 'Item cross-company (deve falhar)');

-- 3.4 Roadmap: source_type = 'manual' com source_id preenchido →
--     DEVE FALHAR (CHECK de schema, nem chega no trigger).
-- INSERT INTO public.roadmap_items (client_id, source_type, source_id, title)
--   VALUES ('<COMPANY_A_ID>', 'manual', '<QUALQUER_UUID>', 'Manual com source_id (deve falhar)');

-- ── Bloco 4 — Usuário Beta (espelho do Bloco 1 para B) ───────────
-- Repetir 1.1-1.8 com os IDs trocados (A↔B) autenticado como Beta, para
-- confirmar que o isolamento é simétrico, não um acidente de teste
-- unidirecional.

-- ── Critério de aceite ────────────────────────────────────────────
-- Todos os itens marcados "deve retornar 0 linhas" retornam
-- efetivamente 0 (nunca erro de RLS mascarando um bug de policy).
-- Todos os itens marcados "DEVE FALHAR" levantam exceção explícita
-- (RLS ou trigger), nunca silenciosamente aceitam ou corrompem dado.
-- Só com os 4 blocos limpos este schema pode ser considerado seguro
-- para expor em UI.
-- ============================================================
