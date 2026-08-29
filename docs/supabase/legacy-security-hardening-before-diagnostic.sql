-- ============================================================
-- LOKAT OS — LEGACY SECURITY HARDENING (BEFORE DIAGNOSTIC) — V2
-- AINDA NÃO EXECUTADO.
--
-- Corrige, cirurgicamente, os P0/P1 confirmados AO VIVO pelo gate de
-- segurança do Supabase sobre objetos já existentes em produção --
-- NADA relacionado ao domínio Diagnostic/Roadmap.
-- docs/supabase/91-company-diagnostic-roadmap.sql permanece congelado
-- e NÃO é tocado por este arquivo.
--
-- V2 (verdict anterior: LEGACY_PATCH_REJECTED_SECURITY) corrige o que
-- restou da V1: remove por completo a janela temporal de
-- create_client_on_signup (uma janela de tempo não prova identidade),
-- fecha v_billing_mrr_summary também para authenticated (leitura passa
-- por API route server-side com autorização explícita de super_admin,
-- ver src/app/api/admin/billing/mrr-summary/route.ts), adiciona
-- ownership real em Company às RPCs de archive/restore/delete de
-- clients, e -- o achado mais importante desta rodada -- torna
-- EXPLÍCITO todo REVOKE de PUBLIC/anon/authenticated em vez de confiar
-- em "REVOKE ALL FROM PUBLIC" sozinho (que NÃO remove um grant direto
-- e separado para anon, caso um tenha sido concedido manualmente algum
-- dia via SQL Editor -- o projeto não tem migration history rastreada,
-- então essa possibilidade é real e não pode ser presumida ausente).
--
-- Motivo do nome não-numérico: os 90+ arquivos numerados em
-- docs/supabase são histórico local de execução manual via SQL Editor,
-- não o ledger formal de migrations do Supabase, e não equivalem
-- automaticamente a terem sido aplicados ao vivo -- não presuma que
-- todo SQL histórico numerado foi de fato executado no banco.
--
-- Estado do ledger formal (Supabase Migrations), auditado ao vivo em
-- 27/08/2026: 4 migrations rastreadas -- 20260813200621_personal_core_tasks,
-- 20260813200750_personal_core_routines,
-- 20260813200856_personal_core_gratitude,
-- 20260813200949_personal_core_events. Nenhuma delas relacionada a este
-- domínio de segurança (Company/RPCs/views); a autoridade sobre o
-- estado vivo dos objetos tratados aqui continua sendo o gate de
-- segurança (CODEX WEB), não o ledger nem os arquivos numerados. Ver
-- rollback correspondente em
-- legacy-security-hardening-before-diagnostic-rollback.sql e o plano
-- de teste manual em legacy-security-hardening-live-test-plan.sql.
--
-- AUTORIDADE: o comportamento vivo relatado pelo gate de segurança
-- (CODEX WEB), não os arquivos históricos.
--
-- Execute no Supabase SQL Editor SOMENTE após revisão humana explícita
-- e o veredito de aprovação formal do CODEX WEB.
--
-- ============================================================
-- MATRIZ DE ACL (estado final pretendido após esta migration)
-- ============================================================
-- objeto                                | PUBLIC | anon | authenticated | service_role
-- can_access_client(uuid)                | revoke | revoke | GRANT       | (bypassa RLS)
-- current_user_role()                    | mantido como está (ver seção 2 -- justificativa)
-- v_olaclick_connections_safe            | revoke | revoke | revoke      | (via admin client)
-- v_platform_accounts_overview           | revoke | revoke | revoke      | (via admin client)
-- admin_signups_view                     | revoke | revoke | revoke      | (via admin client)
-- v_orphan_client_invites                | revoke | revoke | revoke      | (via admin client)
-- v_billing_mrr_summary                  | revoke | revoke | revoke (V2) | (via admin client, atrás de API route super_admin-only)
-- finance_mark_overdue()                 | revoke | revoke | revoke      | GRANT
-- create_client_on_signup(...)           | revoke | revoke (V2) | GRANT | --
-- admin_link_meta_asset(...)             | revoke | revoke (V2) | GRANT | --
-- admin_upsert_olaclick_connection(...)  | revoke | revoke (V2) | GRANT | --
-- admin_list_olaclick_connections()      | revoke | revoke (V2) | GRANT | --
-- get_client_meta_status(uuid)           | revoke | revoke (V2) | GRANT | --
-- get_request_owner_for_client(uuid)     | revoke | revoke (V2) | GRANT | --
-- admin_archive_client(uuid)             | revoke (V2) | revoke (V2) | GRANT | --
-- admin_archive_clients(uuid[])          | revoke (V2) | revoke (V2) | GRANT | --
-- admin_restore_client(uuid)             | revoke (V2) | revoke (V2) | GRANT | --
-- admin_delete_client(uuid)              | revoke (V2) | revoke (V2) | GRANT | --
-- admin_hard_delete_client(uuid)         | revoke (V2) | revoke (V2) | GRANT | --
-- admin_hard_delete_clients(uuid[])      | revoke (V2) | revoke (V2) | GRANT | --
-- admin_create_client(...)               | revoke (Final) | revoke (Final) | GRANT | --
-- client_meta_assets (table, PROMPT 04A) | role-only+ownership (can_access_client) nas 4 policies (select/insert/update/delete)
-- olaclick_connections (table, PROMPT 04A) | role-only+ownership (can_access_client) nas 4 policies (select/insert/update/delete)
-- v_olaclick_connections_safe (mutating) | REVOKE ALL de PUBLIC/anon/authenticated (PROMPT 04A) -- só SELECT já revogado na seção 3
-- ============================================================

BEGIN;

-- ============================================================
-- 1. can_access_client() — alinhar ao modelo canônico real (P1.2)
-- ============================================================
-- Inalterado desde a V1 (CODEX não reabriu este ponto). Único ajuste
-- V2: REVOKE explícito de anon além de PUBLIC (Fase 28/29) -- a função
-- usa auth.uid(), sempre NULL para anon, então não há ganho funcional
-- para anon tê-la, mas o contrato explícito importa mais que a
-- herança implícita.
CREATE OR REPLACE FUNCTION public.can_access_client(target_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.client_id = target_client_id
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

REVOKE ALL ON FUNCTION public.can_access_client(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_client(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_client(uuid) TO authenticated;

COMMENT ON FUNCTION public.can_access_client(uuid) IS
  'Modelo canônico real de ownership de Company (P1.2). super_admin '
  'global; demais via profiles.client_id, client_user_access ou '
  'agency_workspaces+agency_clients. Nunca role-only.';


-- ============================================================
-- 2. current_user_role() — restaurar search_path (P1.1)
-- ============================================================
-- Inalterado desde a V1 -- CODEX não reabriu este ponto. Grants
-- deliberadamente mantidos como estão (mesma justificativa da V1:
-- revogar de anon quebraria a AVALIAÇÃO de RLS policies anon-facing
-- que a chamam, sem ganho real de segurança).
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


-- ============================================================
-- 3. Views P0 — nenhuma exposta a anon; nenhuma bypassa RLS da
--    tabela base sem necessidade real (Fase 5-11)
-- ============================================================

-- 3.1-3.4: inalteradas desde a V1 -- CODEX não reabriu estes pontos.
ALTER VIEW public.v_olaclick_connections_safe SET (security_invoker = true);
REVOKE SELECT ON public.v_olaclick_connections_safe FROM anon;
REVOKE SELECT ON public.v_olaclick_connections_safe FROM authenticated;

ALTER VIEW public.v_platform_accounts_overview SET (security_invoker = true);
REVOKE SELECT ON public.v_platform_accounts_overview FROM anon;
REVOKE SELECT ON public.v_platform_accounts_overview FROM authenticated;

ALTER VIEW public.admin_signups_view SET (security_invoker = true);
REVOKE SELECT ON public.admin_signups_view FROM anon;
REVOKE SELECT ON public.admin_signups_view FROM authenticated;

ALTER VIEW public.v_orphan_client_invites SET (security_invoker = true);
REVOKE SELECT ON public.v_orphan_client_invites FROM anon;
REVOKE SELECT ON public.v_orphan_client_invites FROM authenticated;

-- 3.5 v_billing_mrr_summary (P1.8 → reaberto no V2)
-- CODEX rejeitou a V1 (só revogava anon): "acessível a authenticated
-- globalmente... proteção de rota no frontend não protege uma view
-- consultável diretamente." Corrigido: authenticated também revogado.
-- src/app/admin/super/billing/page.tsx foi migrado para consultar
-- /api/admin/billing/mrr-summary (nova API route server-side que
-- autentica, confirma role='super_admin' e SÓ ENTÃO cria um client
-- privilegiado -- nunca o padrão "query com service role, depois
-- confere usuário").
REVOKE SELECT ON public.v_billing_mrr_summary FROM anon;
REVOKE SELECT ON public.v_billing_mrr_summary FROM authenticated;


-- ============================================================
-- 4. finance_mark_overdue() — least privilege (P0.5)
-- ============================================================
-- Inalterado desde a V1 -- já usava REVOKE explícito de PUBLIC, anon e
-- authenticated, e GRANT só a service_role. CODEX não reabriu este ponto.
REVOKE EXECUTE ON FUNCTION public.finance_mark_overdue() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finance_mark_overdue() FROM anon;
REVOKE EXECUTE ON FUNCTION public.finance_mark_overdue() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finance_mark_overdue() TO service_role;


-- ============================================================
-- 5. create_client_on_signup() — reescrita completa (P0, V2)
-- ============================================================
-- A V1 (auth.uid()=p_user_id quando autenticado; janela de 10 minutos
-- para o caso anon) foi REJEITADA pelo CODEX: "uma janela temporal não
-- prova identidade". Removida por completo -- sem exceção temporal,
-- sem excecão de qualquer tipo baseada em dado fornecido pelo cliente.
--
-- Fluxo real reauditado (Fase 3):
--   src/app/(public)/criar-conta/page.tsx:
--     1. supabase.auth.signUp() -- se "Email Confirmation" estiver
--        DESLIGADO no projeto Supabase, o client já retorna uma sessão
--        ativa nesse instante (auth.uid() resolve imediatamente).
--     2. Chama create_client_on_signup(p_user_id: userId, ...)
--        IMEDIATAMENTE em seguida, usando o MESMO client (que já tem
--        a sessão recém-criada, se houver).
--     3. Se signInWithPassword() falhar logo depois (confirmação de
--        e-mail pendente), mostra "Confirme seu e-mail..." e NÃO
--        navega para o onboarding -- já é o comportamento existente.
--   src/app/onboarding/conclusao/page.tsx:
--     1. auth.getUser() -- só prossegue "if (user)", ou seja, SÓ
--        chega até aqui com uma sessão real e ativa.
--     2. Se ainda não existe client_id (nem em localStorage, nem em
--        public.clients por owner_id), chama create_client_on_signup
--        com user.id resolvido da PRÓPRIA sessão ativa.
--     3. Esta página só é alcançável depois que criar-conta navegou
--        para /onboarding/tipo, o que só acontece quando HÁ sessão
--        (signUp() imediato ou signInWithPassword() bem-sucedido
--        após confirmação).
--
-- Conclusão da auditoria: os dois call sites reais JÁ operam
-- exclusivamente sob uma das duas condições abaixo -- nenhum dos dois
-- depende de um caminho anônimo/sem sessão para funcionar:
--   (a) confirmação de e-mail DESLIGADA → signUp() já retorna sessão →
--       a chamada em criar-conta acontece com auth.uid() = userId.
--   (b) confirmação de e-mail LIGADA → a chamada em criar-conta ainda
--       roda sem sessão e agora falha (unauthenticated) -- mas isso já
--       era tolerado hoje (erro só logado via console.error, nunca
--       bloqueia o cadastro); o client é criado depois, quando o
--       usuário efetivamente tem uma sessão, em
--       onboarding/conclusao -- ponto em que auth.uid() = user.id.
-- Ou seja: Opção A da Fase 4 (RPC authenticated, auth.uid() como única
-- autoridade, p_user_id mantido na assinatura só por compatibilidade
-- com os dois call sites, mas sempre igual a auth.uid()) já é
-- alcançável com a arquitetura/UX existentes, sem nenhuma mudança de
-- fluxo visual e sem sacrificar autenticação (Fase 5/45).
--
-- Contrato novo: authenticated apenas; p_user_id OBRIGATORIAMENTE
-- igual a auth.uid(); NENHUM caminho anônimo, nenhuma exceção por
-- tempo, nenhum "UUID difícil de adivinhar" -- nenhuma prova de posse
-- client-provided é aceita como autorização.
--
-- ATUALIZADO (PROMPT 04A/Fase 15): o gap descrito acima nesta observação
-- foi fechado no nível de aplicação, reutilizando esta MESMA RPC -- não
-- fica mais pendente. src/lib/client/resolve-client.ts →
-- resolveCurrentClient() ganhou uma fonte adicional "signup_bootstrap":
-- se as 5 fontes normais (profiles.client_id, client_user_access,
-- convites, client_email) não encontrarem nenhuma Company para o usuário
-- autenticado, ela chama create_client_on_signup(auth.uid(), ...) usando
-- o client de sessão -- cobre exatamente o caso de um usuário que
-- confirma o e-mail e autentica sem nunca revisitar
-- /onboarding/conclusao. Continua sem nenhum caminho anônimo: só roda
-- quando resolveCurrentClient() já confirmou uma sessão real via
-- auth.getUser().
-- Fase 15 (PROMPT 04E): mesmo com o lookup-then-insert abaixo, uma corrida
-- genuína entre duas requisições simultâneas (ambas veem "não existe"
-- antes de qualquer uma inserir) ainda podia criar duas linhas. Com o
-- unique index da seção 13 (clients_owner_id_unique_idx), a segunda
-- tentativa levanta unique_violation em vez de duplicar -- a função
-- captura ESPECIFICAMENTE esse constraint pelo nome (nunca qualquer
-- unique_violation genérico de outro constraint) e reage relendo e
-- retornando o client que a outra transação já criou -- idempotente,
-- nunca um erro destrutivo para um caller legítimo que só perdeu a
-- corrida por milissegundos.
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
  v_constraint text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized: caller must be authenticated as the target user' USING ERRCODE = 'P0002';
  END IF;

  SELECT id INTO v_client_id
  FROM public.clients
  WHERE owner_id = p_user_id;

  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;

  BEGIN
    INSERT INTO public.clients (owner_id, company_name, responsible_name, email, status)
    VALUES (p_user_id, p_company_name, p_responsible, p_email, 'onboarding')
    RETURNING id INTO v_client_id;
  EXCEPTION WHEN unique_violation THEN
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
    IF v_constraint = 'clients_owner_id_unique_idx' THEN
      SELECT id INTO v_client_id FROM public.clients WHERE owner_id = p_user_id;
      RETURN v_client_id;
    END IF;
    RAISE;
  END;

  RETURN v_client_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_client_on_signup(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_client_on_signup(uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_client_on_signup(uuid, text, text, text) TO authenticated;


-- ============================================================
-- 6. Meta/OlaClick RPCs — Company ownership real (P1.3-P1.6) +
--    validação de conexão explícita (Fase 12-15, V2)
-- ============================================================

-- 6.1 admin_link_meta_asset (P1.3 + Fase 12-15 reaberta no V2)
-- Já tinha can_access_client(p_client_id) desde a V1 e o fallback
-- implícito já filtrava por client_id. O que CODEX apontou como
-- restante: quando p_meta_connection_id vem EXPLÍCITO no payload, a
-- função usava o valor direto sem validar que a conexão pertence a um
-- contexto autorizado -- Company A podia vincular um asset informando
-- o meta_connection_id de outra pessoa/contexto. Corrigido: se
-- explícito, valida ownership da conexão (super_admin: qualquer;
-- demais: precisa ter sido conectada pelo próprio caller) e REJEITA
-- (nunca escolhe outra silenciosamente, Fase 15) se não bater.
-- src/app/api/meta/assets/link/route.ts também foi corrigido em
-- paralelo (mesmo contrato no fallback direto, e autorização de
-- Company movida para ANTES de qualquer etapa -- RPC ou fallback,
-- Fase 17-19).
CREATE OR REPLACE FUNCTION public.admin_link_meta_asset(
  p_client_id                      uuid,
  p_asset_type                     text,
  p_asset_id                       text,
  p_asset_name                     text     DEFAULT NULL,
  p_username                       text     DEFAULT NULL,
  p_picture_url                    text     DEFAULT NULL,
  p_meta_connection_id             uuid     DEFAULT NULL,
  p_is_primary                     boolean  DEFAULT false
)
RETURNS TABLE(
  asset_record_id  uuid,
  client_id        uuid,
  asset_type       text,
  asset_id         text,
  linked           boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
-- PROMPT 05D: RETURNS TABLE acima cria OUT params chamados client_id/
-- asset_type/asset_id -- sem esta diretiva, "ON CONFLICT (client_id,
-- asset_type, asset_id)" mais abaixo é ambíguo entre esses OUT params e
-- as colunas reais da tabela (SQLSTATE 42702, confirmado ao vivo).
-- use_column resolve a favor da coluna real -- é exatamente o que o
-- ON CONFLICT sempre quis dizer; nenhuma outra referência nesta função
-- dependia da leitura como variável (auditado linha a linha).
DECLARE
  v_caller_id     uuid;
  v_is_super      boolean;
  v_conn_id       uuid;
  v_result_id     uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'client_not_found' USING ERRCODE = 'P0003';
  END IF;

  IF p_asset_type NOT IN ('facebook_page', 'instagram_business', 'ad_account', 'business_manager') THEN
    RAISE EXCEPTION 'invalid_asset_type' USING ERRCODE = 'P0005';
  END IF;

  SELECT (p.role = 'super_admin') INTO v_is_super FROM public.profiles p WHERE p.id = v_caller_id;

  v_conn_id := p_meta_connection_id;

  IF v_conn_id IS NOT NULL THEN
    -- Fase 12-15: conexão explícita precisa pertencer a um contexto
    -- autorizado -- nunca aceita cegamente, nunca troca por outra em
    -- silêncio.
    IF NOT EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = v_conn_id
        AND mc.status = 'active'
        AND (COALESCE(v_is_super, false) OR mc.connected_by = v_caller_id)
    ) THEN
      RAISE EXCEPTION 'connection_not_found' USING ERRCODE = 'P0006';
    END IF;
  ELSE
    -- Fase 26 (herdado da V1): fallback implícito escopado -- nunca
    -- "qualquer conexão ativa mais recente da plataforma". Sem FK real
    -- de Company em meta_connections (Fase 14): escopa pelo caller
    -- autenticado, exceto super_admin (alcance global já existente).
    SELECT id INTO v_conn_id
    FROM public.meta_connections
    WHERE status = 'active'
      AND (COALESCE(v_is_super, false) OR connected_by = v_caller_id)
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  INSERT INTO public.client_meta_assets (
    client_id, meta_connection_id, asset_type, asset_id,
    asset_name, username, picture_url, is_primary, connected_by
  ) VALUES (
    p_client_id, v_conn_id, p_asset_type, p_asset_id,
    p_asset_name, p_username, p_picture_url, p_is_primary, v_caller_id
  )
  ON CONFLICT (client_id, asset_type, asset_id)
  DO UPDATE SET
    meta_connection_id = COALESCE(EXCLUDED.meta_connection_id, client_meta_assets.meta_connection_id),
    asset_name         = COALESCE(EXCLUDED.asset_name, client_meta_assets.asset_name),
    username           = COALESCE(EXCLUDED.username, client_meta_assets.username),
    picture_url        = COALESCE(EXCLUDED.picture_url, client_meta_assets.picture_url),
    is_primary         = EXCLUDED.is_primary,
    updated_at         = now()
  RETURNING id INTO v_result_id;

  RETURN QUERY
  SELECT v_result_id, p_client_id, p_asset_type, p_asset_id, TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_link_meta_asset(uuid, text, text, text, text, text, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_link_meta_asset(uuid, text, text, text, text, text, uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_link_meta_asset(uuid, text, text, text, text, text, uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.admin_link_meta_asset(uuid, text, text, text, text, text, uuid, boolean) IS
  'Vincula ativo Meta a um cliente. SECURITY DEFINER: bypassa RLS. '
  'Exige can_access_client(p_client_id). Conexão explícita ou implícita '
  'sempre escopada por ownership real (super_admin ou connected_by), '
  'nunca cross-context (P1.3, Fase 12-15).';


-- 6.2 admin_upsert_olaclick_connection (P1.4) — inalterado desde V1;
-- CODEX não reabriu este ponto especificamente (só o REVOKE explícito
-- de anon, adicionado abaixo).
CREATE OR REPLACE FUNCTION public.admin_upsert_olaclick_connection(
  p_client_id        uuid,
  p_connection_name  text,
  p_access_token     text,
  p_notes            text    DEFAULT NULL,
  p_api_base_url     text    DEFAULT NULL
)
RETURNS TABLE(
  id                uuid,
  client_id         uuid,
  provider          text,
  connection_name   text,
  status            text,
  token_last_four   text,
  api_base_url      text,
  created_at        timestamptz,
  updated_at        timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
-- PROMPT 05D: RETURNS TABLE acima cria OUT params chamados client_id/
-- connection_name -- sem esta diretiva, "ON CONFLICT (client_id,
-- connection_name)" mais abaixo é ambíguo (SQLSTATE 42702, confirmado
-- ao vivo). Não existe CONSTRAINT nomeada para ON CONFLICT ON CONSTRAINT
-- (só o índice único idx_olaclick_conn_client_name -- ON CONFLICT ON
-- CONSTRAINT exige uma constraint de verdade em pg_constraint, não
-- aceita um índice solto), então a correção sem alterar schema é esta
-- diretiva. Auditado linha a linha: nenhuma outra referência a
-- client_id/connection_name nesta função dependia da leitura como
-- variável.
DECLARE
  v_caller_id  uuid;
  v_last_four  text;
  v_conn_id    uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0002';
  END IF;

  -- PROMPT 05D: 'active' nunca foi um valor válido de clients.status
  -- (clients_status_check só aceita 'ativo') -- bug pré-existente que
  -- fazia todo upsert de conexão OlaClick para um cliente "ativo" de
  -- verdade (status='ativo') falhar com client_not_active (P0004),
  -- mesmo sendo exatamente o caminho legítimo mais comum.
  IF NOT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = p_client_id
      AND c.status IN ('ativo', 'onboarding')
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id) THEN
      RAISE EXCEPTION 'client_not_found' USING ERRCODE = 'P0003';
    ELSE
      RAISE EXCEPTION 'client_not_active' USING ERRCODE = 'P0004';
    END IF;
  END IF;

  v_last_four := CASE
    WHEN length(p_access_token) >= 4 THEN right(p_access_token, 4)
    ELSE '****'
  END;

  INSERT INTO public.olaclick_connections (
    client_id, connection_name, access_token, token_last_four,
    api_base_url, notes, created_by, status, scopes
  ) VALUES (
    p_client_id, p_connection_name, p_access_token, v_last_four,
    p_api_base_url, p_notes, v_caller_id, 'connected',
    ARRAY['menu:read', 'orders:read', 'clients:read', 'companies:read']
  )
  ON CONFLICT (client_id, connection_name)
  DO UPDATE SET
    access_token    = EXCLUDED.access_token,
    token_last_four = EXCLUDED.token_last_four,
    api_base_url    = EXCLUDED.api_base_url,
    notes           = EXCLUDED.notes,
    status          = 'connected',
    updated_at      = now()
  RETURNING olaclick_connections.id INTO v_conn_id;

  RETURN QUERY
  SELECT
    oc.id, oc.client_id, oc.provider, oc.connection_name, oc.status,
    oc.token_last_four, oc.api_base_url, oc.created_at, oc.updated_at
  FROM public.olaclick_connections oc
  WHERE oc.id = v_conn_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_olaclick_connection(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_upsert_olaclick_connection(uuid, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_olaclick_connection(uuid, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.admin_upsert_olaclick_connection(uuid, text, text, text, text) IS
  'Salva/atualiza conexão Cardápio Digital. SECURITY DEFINER: bypassa RLS. '
  'Exige can_access_client(p_client_id) -- não é mais role-only (P1.4). '
  'Nunca retorna access_token.';


-- 6.3 admin_list_olaclick_connections (P1.5) — inalterado desde V1.
CREATE OR REPLACE FUNCTION public.admin_list_olaclick_connections()
RETURNS TABLE(
  id              uuid,
  client_id       uuid,
  client_name     text,
  connection_name text,
  token_last_four text,
  status          text,
  created_at      timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_is_super  boolean;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT (p.role = 'super_admin') INTO v_is_super FROM public.profiles p WHERE p.id = v_caller_id;

  RETURN QUERY
  SELECT
    oc.id, oc.client_id, c.company_name::text AS client_name,
    oc.connection_name::text, oc.token_last_four::text, oc.status::text, oc.created_at
  FROM public.olaclick_connections oc
  LEFT JOIN public.clients c ON c.id = oc.client_id
  WHERE oc.status = 'connected'
    AND (COALESCE(v_is_super, false) OR public.can_access_client(oc.client_id))
  ORDER BY oc.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_olaclick_connections() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_olaclick_connections() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_olaclick_connections() TO authenticated;

COMMENT ON FUNCTION public.admin_list_olaclick_connections() IS
  'Lista conexões OlaClick. SECURITY DEFINER: bypassa RLS. Super Admin '
  'vê todas; demais só Companies autorizadas via can_access_client (P1.5). '
  'Nunca retorna access_token completo.';


-- 6.4 get_client_meta_status (P1.6) — inalterado desde V1.
CREATE OR REPLACE FUNCTION public.get_client_meta_status(p_client_id uuid)
RETURNS TABLE(
  asset_type  text,
  asset_name  text,
  username    text,
  linked_at   timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT cma.asset_type::text, cma.asset_name::text, cma.username::text, cma.created_at AS linked_at
  FROM public.client_meta_assets cma
  WHERE cma.client_id = p_client_id
  ORDER BY cma.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_meta_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_client_meta_status(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_client_meta_status(uuid) TO authenticated;


-- ============================================================
-- 7. get_request_owner_for_client — authorization ausente (Fase 33 V1) —
--    inalterado desde V1.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_request_owner_for_client(p_client_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id  uuid;
  v_owner_id   uuid;
  v_super_id   uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0002';
  END IF;

  SELECT agency_id, owner_id INTO v_agency_id, v_owner_id
  FROM public.clients WHERE id = p_client_id;

  IF v_agency_id IS NOT NULL THEN RETURN v_agency_id; END IF;
  IF v_owner_id  IS NOT NULL THEN RETURN v_owner_id;  END IF;

  SELECT id INTO v_super_id FROM public.profiles WHERE role = 'super_admin' LIMIT 1;
  RETURN v_super_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_request_owner_for_client(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_request_owner_for_client(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_request_owner_for_client(uuid) TO authenticated;


-- ============================================================
-- 8. Archive / Restore / Logical Delete — Company ownership (P1, novo no V2)
-- ============================================================
-- CODEX (Fase 21-27): "admin comum não pode administrar qualquer
-- client_id globalmente." Auditoria confirmou: admin_archive_client,
-- admin_archive_clients, admin_restore_client e admin_delete_client
-- checavam SOMENTE "role IN ('admin','super_admin')" -- qualquer admin
-- podia arquivar/restaurar/apagar (soft) QUALQUER Company, sem vínculo
-- real. admin_hard_delete_client(s) já eram super_admin-only -- mantido
-- exatamente assim (Fase 22, "global intencional").
--
-- Decisão de helper (Fase 24): can_access_client(client_id), combinada
-- com o role gate que já exclui 'cliente'/'operacional' antes de
-- chegar ao teste de ownership. Avaliado explicitamente se um client
-- user (role='cliente') poderia "passar" por can_access_client sozinho
-- -- SIM teoricamente (profiles.client_id bate com a própria Company),
-- mas o role gate anterior (IF v_role NOT IN ('admin','super_admin'))
-- já barra esse caso antes mesmo de chegar no teste de ownership, então
-- reutilizar can_access_client aqui é seguro; criar um segundo helper
-- can_write_client_company redundante só duplicaria a mesma lógica sem
-- reduzir risco real.
--
-- Bug crítico adicional encontrado ao reauditar estas 6 funções para
-- esta correção (não estava na lista do CODEX, mas é da mesma classe
-- P0 de autorização): o padrão "IF v_role NOT IN ('admin','super_admin')
-- THEN RAISE EXCEPTION" e "IF v_role != 'super_admin' THEN RAISE
-- EXCEPTION" comparam contra current_user_role(), que retorna NULL
-- quando auth.uid() é NULL (chamador anônimo). Em PL/pgSQL,
-- "NULL NOT IN (...)" e "NULL != ..." avaliam para NULL, e "IF NULL"
-- é tratado como FALSO -- ou seja, a exceção NUNCA dispara para um
-- chamador anônimo, e a função anônima continuaria até a mutação
-- privilegiada (arquivar/restaurar/apagar QUALQUER client, incluindo
-- hard delete) SE anon algum dia tivesse EXECUTE nestas funções --
-- exatamente o cenário que este sprint inteiro existe para eliminar.
-- Corrigido em todas as 6: checagem explícita "v_role IS NULL OR ..."
-- antes de qualquer outra coisa.
--
-- admin_create_client() tinha o MESMO padrão de bug (v_role NOT IN
-- (...)) -- corrigida agora na seção 9, sprint Final Closure (Fase 3-8).

-- 8.1 admin_archive_client (single)
-- PROMPT 05D: 'archived' NUNCA foi um valor válido de clients.status --
-- clients_status_check (docs/supabase/01-schema-inicial.sql) só aceita
-- aguardando_validacao/onboarding/ativo/pausado/inadimplente/encerrado
-- desde a criação da tabela. Bug pré-existente (SQL 52/53, anterior a
-- este hardening), nunca corrigido antes -- só foi exercitado de verdade
-- pela primeira vez na validação live pós-apply deste sprint. 'encerrado'
-- é o valor canônico mais próximo semanticamente de "arquivado"
-- (relacionamento com o cliente encerrado); archived_at/deleted_at
-- continuam sendo o sinal real de visibilidade (client-visibility.ts).
CREATE OR REPLACE FUNCTION public.admin_archive_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode arquivar clientes', v_role;
  END IF;
  IF v_role <> 'super_admin' AND NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'permission_denied: sem acesso a este client_id' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.clients
  SET
    status      = 'encerrado',
    archived_at = now(),
    deleted_at  = now()
  WHERE id = p_client_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_archive_client(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_archive_client(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_archive_client(uuid) TO authenticated;

-- 8.2 admin_archive_clients (bulk) — Fase 26/27: TODOS os ids validados
-- antes de mutar QUALQUER um; aborta o lote inteiro se um só for
-- não-autorizado (nunca resultado parcial).
CREATE OR REPLACE FUNCTION public.admin_archive_clients(p_client_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role             text;
  v_count            integer;
  v_unauthorized_id  uuid;
BEGIN
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode arquivar clientes', v_role;
  END IF;

  IF v_role <> 'super_admin' THEN
    SELECT cid INTO v_unauthorized_id
    FROM unnest(p_client_ids) AS cid
    WHERE NOT public.can_access_client(cid)
    LIMIT 1;
    IF v_unauthorized_id IS NOT NULL THEN
      RAISE EXCEPTION 'permission_denied: sem acesso a um ou mais client_ids do lote' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  UPDATE public.clients
  SET
    status      = 'encerrado',
    archived_at = now(),
    deleted_at  = now()
  WHERE id = ANY(p_client_ids);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_archive_clients(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_archive_clients(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_archive_clients(uuid[]) TO authenticated;

-- 8.3 admin_restore_client
CREATE OR REPLACE FUNCTION public.admin_restore_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode restaurar clientes', v_role;
  END IF;
  IF v_role <> 'super_admin' AND NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'permission_denied: sem acesso a este client_id' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.clients
  SET
    status      = 'onboarding',
    archived_at = NULL,
    deleted_at  = NULL
  WHERE id = p_client_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_restore_client(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_restore_client(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_restore_client(uuid) TO authenticated;

-- 8.4 admin_delete_client (logical delete / lixeira)
-- PROMPT 05D: a cascata original (archived → inactive → pausado,
-- capturando check_violation a cada tentativa) era um sintoma de nunca
-- ter confirmado o vocabulário real de clients_status_check -- as duas
-- primeiras tentativas SEMPRE falhavam (nem 'archived' nem 'inactive'
-- jamais foram valores válidos) e o resultado real dependia só do
-- terceiro fallback ('pausado', semanticamente errado para um cliente
-- deletado). Substituída por uma atribuição direta e correta -- mesmo
-- valor canônico usado por admin_archive_client(s) (Fase "não manter
-- simultaneamente múltiplos vocabulários").
CREATE OR REPLACE FUNCTION public.admin_delete_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role       text;
  v_deleted_at timestamptz := now();
BEGIN
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode apagar clientes', v_role;
  END IF;
  IF v_role <> 'super_admin' AND NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION 'permission_denied: sem acesso a este client_id' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.clients
     SET deleted_at  = v_deleted_at,
         archived_at = v_deleted_at,
         status      = 'encerrado'
   WHERE id = p_client_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_client(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_client(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_client(uuid) TO authenticated;

-- 8.5 admin_hard_delete_client (single, super_admin only — Fase 22:
-- mantido global intencionalmente, SEM mudança de ownership). Só o
-- bug de NULL-bypass e os grants explícitos são corrigidos aqui.
CREATE OR REPLACE FUNCTION public.admin_hard_delete_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role != 'super_admin' THEN
    RAISE EXCEPTION 'permission_denied: apenas super_admin pode apagar clientes definitivamente';
  END IF;

  DELETE FROM public.clients WHERE id = p_client_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_hard_delete_client(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_hard_delete_client(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_hard_delete_client(uuid) TO authenticated;

-- 8.6 admin_hard_delete_clients (bulk, super_admin only — Fase 22:
-- mantido global intencionalmente). Idem: só NULL-bypass e grants.
CREATE OR REPLACE FUNCTION public.admin_hard_delete_clients(p_client_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role  text;
  v_count integer;
BEGIN
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role != 'super_admin' THEN
    RAISE EXCEPTION 'permission_denied: apenas super_admin pode apagar clientes definitivamente';
  END IF;

  DELETE FROM public.clients WHERE id = ANY(p_client_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_hard_delete_clients(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_hard_delete_clients(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_hard_delete_clients(uuid[]) TO authenticated;


-- ============================================================
-- 9. admin_create_client() — NULL-bypass + identidade arbitrária (Final Closure)
-- ============================================================
-- USO REAL (Fase 3/5): único call site é
-- src/app/api/admin/clients/route.ts POST -- já se comporta
-- honestamente hoje (`p_created_by: profile.id`, `p_agency_id: role
-- !== 'super_admin' ? profile.id : null`, ambos resolvidos no servidor
-- a partir da sessão real, nunca de um campo do body). O problema é
-- que a FUNÇÃO em si não impõe isso -- alguém chamando a RPC
-- diretamente (fora desta rota) podia informar QUALQUER
-- p_created_by/p_agency_id como um UUID arbitrário fornecido pelo
-- chamador (Fase 6/7: "não aceitar UUID arbitrário fornecido pelo
-- browser como autorização"), e tinha o MESMO bug de NULL-bypass das
-- 6 funções da seção 8 (`v_role NOT IN (...)` nunca dispara quando
-- v_role é NULL).
--
-- Contrato novo:
--   • auth.uid() precisa existir e o role precisa ser admin/super_admin
--     (checagem NULL-safe, igual à seção 8);
--   • p_created_by, se informado, precisa ser exatamente auth.uid() --
--     nunca atribui a criação a outro usuário; se omitido, usa
--     auth.uid() (contrato antigo preservado para o call site real);
--   • p_agency_id: admin comum só pode atribuir a SI MESMO (ou omitir)
--     -- nunca a outro workspace/agência arbitrário. super_admin pode
--     continuar informando explicitamente (contrato do produto: só o
--     super_admin cria clients em nome de uma agência específica que
--     não é ele mesmo, Fase 5).
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
  v_role         text;
  v_client_id    uuid;
  v_status       text;
  v_created_by   uuid;
BEGIN
  v_role := public.current_user_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'permission_denied: role % nao pode criar clientes', v_role;
  END IF;

  IF p_created_by IS NOT NULL AND p_created_by <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: p_created_by must match the caller' USING ERRCODE = 'P0002';
  END IF;
  v_created_by := COALESCE(p_created_by, auth.uid());

  IF v_role <> 'super_admin' AND p_agency_id IS NOT NULL AND p_agency_id <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: cannot attribute a new client to another workspace' USING ERRCODE = 'P0002';
  END IF;

  -- PROMPT 05D: 'active' NUNCA foi um valor válido de clients.status
  -- (clients_status_check só aceita ativo, não active) -- bug
  -- pré-existente, inofensivo em produção só porque o único call site
  -- real (src/app/api/admin/clients/route.ts) nunca envia 'active'.
  -- Porém o mesmo bug também rejeitava 'aguardando_validacao' (o outro
  -- status de criação que a rota já suporta -- ALLOWED_CREATION),
  -- forçando-o silenciosamente para 'onboarding' -- esse caminho É
  -- exercitado na prática. Corrigido para aceitar exatamente os dois
  -- status de criação válidos do produto; qualquer outro valor (incluindo
  -- o legado 'active') cai em 'onboarding' como default seguro.
  IF p_status NOT IN ('onboarding', 'aguardando_validacao') THEN
    v_status := 'onboarding';
  ELSE
    v_status := p_status;
  END IF;

  INSERT INTO public.clients (
    company_name, responsible_name, email, phone,
    segment, status, created_by, agency_id
  ) VALUES (
    p_company_name, p_responsible_name, p_email, p_phone,
    p_segment, v_status,
    v_created_by,
    p_agency_id
  )
  RETURNING public.clients.id INTO v_client_id;

  RETURN QUERY
    SELECT c.id, c.company_name, c.responsible_name,
           c.email, c.phone, c.segment, c.status
    FROM public.clients c
    WHERE c.id = v_client_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_client(text, text, text, text, text, text, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_client(text, text, text, text, text, text, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_create_client(text, text, text, text, text, text, uuid, uuid) TO authenticated;


-- ============================================================
-- 10. client_meta_assets — Company ownership real na Data API (P0-A, PROMPT 04A)
-- ============================================================
-- CODEX (auditoria live, PROMPT 04A): authenticated tinha SELECT/INSERT/
-- UPDATE/DELETE diretos via Data API, com policies role-only
-- (client_meta_assets_select/insert/update/delete, docs/supabase/62) --
-- um admin comum podia ler/escrever ativos Meta de QUALQUER Company via
-- PostgREST direto, contornando por completo admin_link_meta_asset()/
-- get_client_meta_status() (já corrigidas na seção 6). Role nunca foi
-- ownership -- mesmo princípio já aplicado a can_access_client() e às
-- RPCs de archive/restore/delete (seção 8).
--
-- Decisão de arquitetura (Fase 3, PROMPT 04A): a Data API permanece viva
-- -- dezenas de call sites reais em src/ leem esta tabela diretamente
-- para UI (contentos/home, meta/hub-assets, meta/insights, etc.);
-- revogar acesso direto quebraria a aplicação. Em vez disso, toda
-- operação agora exige can_access_client(client_id) ALÉM do role já
-- existente -- nunca dois caminhos com regras diferentes: reutiliza a
-- MESMA função canônica SECURITY DEFINER já usada pelas RPCs.
DROP POLICY IF EXISTS "client_meta_assets_select" ON public.client_meta_assets;
CREATE POLICY "client_meta_assets_select"
  ON public.client_meta_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency', 'team', 'operacional')
    )
    AND public.can_access_client(client_id)
  );

DROP POLICY IF EXISTS "client_meta_assets_insert" ON public.client_meta_assets;
CREATE POLICY "client_meta_assets_insert"
  ON public.client_meta_assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
    AND public.can_access_client(client_id)
  );

DROP POLICY IF EXISTS "client_meta_assets_update" ON public.client_meta_assets;
CREATE POLICY "client_meta_assets_update"
  ON public.client_meta_assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
    AND public.can_access_client(client_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
    AND public.can_access_client(client_id)
  );

DROP POLICY IF EXISTS "client_meta_assets_delete" ON public.client_meta_assets;
CREATE POLICY "client_meta_assets_delete"
  ON public.client_meta_assets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
    )
    AND public.can_access_client(client_id)
  );


-- ============================================================
-- 11. olaclick_connections — Company ownership real na Data API (P0-B, PROMPT 04A)
-- ============================================================
-- CODEX (auditoria live, PROMPT 04A): admin_all_olaclick (docs/supabase/
-- 61) era FOR ALL TO authenticated, role-only (super_admin/admin/agency/
-- operacional para leitura+delete; super_admin/admin/agency para
-- insert+update) -- sem nenhuma checagem de Company ownership. Mesmo
-- bypass da seção 10, mesma correção: Data API permanece viva (usada
-- amplamente em src/ -- admin/diagnosticos, admin/contentos/home,
-- olaclick/connect, olaclick/connections, etc.), mas exige
-- can_access_client(client_id) além do role, nos mesmos 4 grupos de
-- operação já existentes -- role semantics preservadas, ownership
-- adicionada. Split em 4 policies nomeadas (mesmo padrão de
-- client_meta_assets) em vez de uma única FOR ALL, por clareza.
DROP POLICY IF EXISTS "admin_all_olaclick" ON public.olaclick_connections;

CREATE POLICY "olaclick_connections_select"
  ON public.olaclick_connections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency', 'operacional')
    )
    AND public.can_access_client(client_id)
  );

CREATE POLICY "olaclick_connections_insert"
  ON public.olaclick_connections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
    AND public.can_access_client(client_id)
  );

CREATE POLICY "olaclick_connections_update"
  ON public.olaclick_connections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
    AND public.can_access_client(client_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
    AND public.can_access_client(client_id)
  );

CREATE POLICY "olaclick_connections_delete"
  ON public.olaclick_connections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency', 'operacional')
    )
    AND public.can_access_client(client_id)
  );


-- ============================================================
-- 12. v_olaclick_connections_safe — remove privilégios mutantes (P0-B cont., PROMPT 04A)
-- ============================================================
-- CODEX confirmou is_updatable=YES, is_insertable_into=YES -- a seção 3
-- já revoga SELECT de anon/authenticated (não reescrita aqui), mas nunca
-- tocou INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN,
-- herdados dos default privileges do schema no momento da criação da
-- view (docs/supabase/67). A view nunca é consultada pelo código
-- (comentário do próprio SQL 67: "queries acessam a tabela diretamente")
-- -- fecha por completo, sem re-conceder nada.
REVOKE ALL ON public.v_olaclick_connections_safe FROM PUBLIC;
REVOKE ALL ON public.v_olaclick_connections_safe FROM anon;
REVOKE ALL ON public.v_olaclick_connections_safe FROM authenticated;


-- ============================================================
-- 13. clients.owner_id — unique partial index (PROMPT 04E)
-- ============================================================
-- Contrato de negócio confirmado por auditoria live (CODEX WEB,
-- 28/08/2026): ONE_OWNER_ONE_CLIENT -- create_client_on_signup (seção 5)
-- já faz lookup por owner_id antes de inserir, os call sites reais usam
-- maybeSingle() sobre owner_id, e relações multi-Company de agência
-- passam por agency_workspaces/agency_clients, nunca por múltiplos
-- clients com o mesmo owner_id. Esta seção formaliza estruturalmente o
-- que já era o comportamento esperado -- fecha a janela de corrida que a
-- idempotência apenas sequencial (lookup → insert) não cobria.
--
-- Preflight fail-closed (Fase 14): NÃO cria o índice silenciosamente se
-- já existirem duplicatas -- aborta a transação inteira desta migration
-- com uma mensagem clara, sem apagar/escolher nenhum registro
-- automaticamente. Captura live em 28/08/2026 já confirmou 0 duplicatas
-- (ver docs/supabase/legacy-security-hardening-live-test-plan.sql,
-- seção de owner_id), mas o preflight roda de novo aqui porque o estado
-- pode ter mudado entre a captura e o apply real.
DO $$
DECLARE
  v_dup_count integer;
BEGIN
  SELECT COUNT(*) INTO v_dup_count
  FROM (
    SELECT owner_id
    FROM public.clients
    WHERE owner_id IS NOT NULL
    GROUP BY owner_id
    HAVING COUNT(*) > 1
  ) dupes;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'ABORT: % owner_id(s) duplicado(s) em public.clients -- contrato ONE_OWNER_ONE_CLIENT violado. Resolva manualmente (nunca automaticamente) antes de reaplicar este hardening.', v_dup_count;
  END IF;
END $$;

-- Nome escolhido para nunca colidir com idx_clients_owner (índice comum
-- já existente hoje, não único -- preservado, nunca removido por este
-- patch nem pelo rollback).
CREATE UNIQUE INDEX IF NOT EXISTS clients_owner_id_unique_idx
  ON public.clients (owner_id)
  WHERE owner_id IS NOT NULL;


COMMIT;

-- ============================================================
-- FIM DA CORREÇÃO — status: SQL_READY_FOR_MANUAL_APPROVAL
-- (aguardando o veredito de aprovação formal do CODEX WEB antes de
-- qualquer execução -- versão final para este regate, sprint Final
-- Closure)
--
-- Objetos deliberadamente NÃO tocados nesta correção (fora de escopo
-- explícito do CODEX -- backlog):
--   ~31 outras funções SECURITY DEFINER com search_path ausente,
--     nenhuma delas relacionada a autorização de Company/workspace;
--   docs/supabase/91-company-diagnostic-roadmap.sql -- congelado.
--
-- Próximos passos humanos, em ordem:
--   1. CODEX WEB revisa esta migration + rollback estaticamente;
--   2. se aprovado (LEGACY_PATCH_APPROVED_FOR_APPLY), pedir
--      autorização explícita do usuário para aplicar no Supabase SQL
--      Editor;
--   3. após aplicar, CODEX WEB roda o LIVE SECURITY RE-AUDIT usando
--      legacy-security-hardening-live-test-plan.sql;
--   4. só com P0 = 0 e P1 crítico = 0, voltar para o
--      DIAGNOSTIC + ROADMAP SCHEMA FINAL GATE do SQL 91.
-- ============================================================
