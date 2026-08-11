-- ============================================================
-- LOKAT OS — LEGACY SECURITY HARDENING (BEFORE DIAGNOSTIC)
-- AINDA NÃO EXECUTADO.
--
-- Corrige, cirurgicamente, os P0/P1 confirmados AO VIVO pelo gate de
-- segurança do Supabase (verdict: LEGACY_P0_FIX_REQUIRED) sobre
-- objetos já existentes em produção -- NADA relacionado ao domínio
-- Diagnostic/Roadmap. docs/supabase/91-company-diagnostic-roadmap.sql
-- permanece congelado e NÃO é tocado por este arquivo.
--
-- Motivo do nome não-numérico: não existem migrations rastreadas no
-- projeto Supabase (0 migrations); os 90 arquivos numerados em
-- docs/supabase são histórico local, não a autoridade sobre o estado
-- vivo do banco. Inventar um número sequencial novo sugeriria uma
-- ordem/rastreamento que não existe de verdade. Ver rollback
-- correspondente em legacy-security-hardening-before-diagnostic-rollback.sql
-- e o plano de teste manual em legacy-security-hardening-live-test-plan.sql.
--
-- AUTORIDADE: o comportamento vivo relatado pelo gate de segurança
-- (CODEX WEB), não os arquivos históricos. Onde os dois divergem
-- (ex.: current_user_role() foi corrigido no SQL 03 mas redefinido sem
-- a correção nos SQLs 06/07), este arquivo restaura o comportamento
-- seguro -- nunca "restaura" a versão antiga só porque está em um
-- arquivo numerado.
--
-- Execute no Supabase SQL Editor SOMENTE após revisão humana explícita
-- e o veredito de aprovação formal do CODEX WEB.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. can_access_client() — alinhar ao modelo canônico real (P1.2)
-- ============================================================
-- USO REAL (Fase 4): usado em 5 policies de docs/supabase/40
-- (client_visual_assets, client_visual_profiles, ai_credits_wallet,
-- ai_credits_ledger, ai_generation_history), todas
-- "FOR SELECT TO authenticated" com o padrão:
--   policy "X: admin full access"  USING (is_admin_user())      -- já dá acesso total a admin/super_admin, INDEPENDENTE desta função
--   policy "X: staff full access"  USING (is_operational_staff()) -- já dá acesso total a staff, INDEPENDENTE desta função
--   policy "X: client reads own"   USING (can_access_client(client_id)) -- ESTA função
-- Como RLS combina policies permissivas com OR, o branch "admin"
-- desta função era puramente redundante com "X: admin full access"
-- (nenhuma mudança de comportamento real para admin/super_admin ao
-- remover o branch global daqui). O branch antigo só usava
-- clients.owner_id -- não cobria membros de Company vinculados via
-- client_user_access, um gap real que esta correção também fecha.
--
-- Contrato antigo (stale): admin/super_admin → global; cliente → só
-- clients.owner_id = auth.uid().
-- Contrato novo (canônico, espelha src/lib/company-context/resolve.ts):
--   super_admin       → global
--   demais            → profiles.client_id = target
--                        OU client_user_access ativo
--                        OU agency_workspaces.owner_user_id + agency_clients ativo
-- Fail closed em todos os ramos (Fase 22): sem sessão, Company
-- inexistente ou sem vínculo → false, nunca implícito.
--
-- Nota: NÃO delega para public.can_access_client_company() (a função
-- equivalente definida em SQL 91) porque SQL 91 continua congelado e
-- pode nunca ser aplicado nesta ordem -- esta função precisa ser
-- autossuficiente. Quando SQL 91 for aprovado e aplicado, unificar as
-- duas é um cleanup de acompanhamento natural, fora do escopo desta
-- correção (Fase 1: zero alterações no SQL 91 aqui).
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
GRANT EXECUTE ON FUNCTION public.can_access_client(uuid) TO authenticated;

COMMENT ON FUNCTION public.can_access_client(uuid) IS
  'Modelo canônico real de ownership de Company (P1.2). super_admin '
  'global; demais via profiles.client_id, client_user_access ou '
  'agency_workspaces+agency_clients. Nunca role-only.';


-- ============================================================
-- 2. current_user_role() — restaurar search_path (P1.1)
-- ============================================================
-- USO REAL: função foundational usada dentro de dezenas de RLS
-- policies em todo o histórico (não uma RPC chamada diretamente pelo
-- app -- nenhuma ocorrência de supabase.rpc("current_user_role") em
-- src/). SQL 03 já a havia corrigido com SET search_path = public,
-- mas SQL 06 e 07 a redefiniram sem essa cláusula -- se a ordem dos
-- arquivos reflete a ordem real de aplicação, essa correção foi
-- desfeita. Restaurada aqui.
--
-- Grants deliberadamente MANTIDOS como estão (Fase 20 exige "não
-- revogar sem verificar callers" -- verificado): esta função só
-- retorna o PRÓPRIO role do caller (nunca de terceiros) e é chamada de
-- dentro de policies em várias tabelas, algumas sem "TO authenticated"
-- explícito. Revogar EXECUTE de anon quebraria a AVALIAÇÃO dessas
-- policies para anon (erro "permission denied for function", não um
-- filtro silencioso) em qualquer superfície pública que dependa delas
-- (ex.: blog público, funil de waitlist) -- risco real sem benefício
-- de segurança real, já que o valor retornado para anon é NULL de
-- qualquer forma. Corrigido o que é o problema real (search_path);
-- grants deixados como estão, com esta justificativa explícita.
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

-- 3.1 v_olaclick_connections_safe (P0.1)
-- USO REAL: NENHUM em src/ -- a própria SQL 67 documenta "a view não é
-- usada diretamente no código TypeScript, as queries acessam a tabela
-- diretamente". Classificação: LEGACY_UNUSED. Sem security_invoker,
-- roda com privilégio do dono (bypassa RLS de olaclick_connections)
-- para QUALQUER authenticated -- e o gate ao vivo confirma que também
-- para anon (grants padrão de schema, nunca revogados aqui). Como
-- nada no app depende dela, a correção mais segura é fechar por
-- completo em vez de tentar adivinhar quem "deveria" continuar tendo
-- acesso.
ALTER VIEW public.v_olaclick_connections_safe SET (security_invoker = true);
REVOKE SELECT ON public.v_olaclick_connections_safe FROM anon;
REVOKE SELECT ON public.v_olaclick_connections_safe FROM authenticated;

-- 3.2 v_platform_accounts_overview (P0.2)
-- USO REAL: NENHUM em src/. Contém email/role/subscription/coupon de
-- TODOS os perfis da plataforma -- superfície de maior risco desta
-- correção. Sem security_invoker e sem nenhum GRANT explícito em
-- nenhuma versão histórica (comentário do SQL 71 assume incorretamente
-- que views herdam permissão das tabelas base). Fechada por completo.
ALTER VIEW public.v_platform_accounts_overview SET (security_invoker = true);
REVOKE SELECT ON public.v_platform_accounts_overview FROM anon;
REVOKE SELECT ON public.v_platform_accounts_overview FROM authenticated;

-- 3.3 admin_signups_view (P0.3)
-- USO REAL: src/app/api/admin/leads/route.ts -- SEMPRE via
-- createRequiredSupabaseAdminClient() (service role) atrás de um
-- authorizeAdmin() que exige role super_admin/admin na sessão. O app
-- nunca depende de anon/authenticated terem SELECT direto nesta view.
ALTER VIEW public.admin_signups_view SET (security_invoker = true);
REVOKE SELECT ON public.admin_signups_view FROM anon;
REVOKE SELECT ON public.admin_signups_view FROM authenticated;

-- 3.4 v_orphan_client_invites (P0.4)
-- USO REAL: NENHUM em src/ -- superfície de manutenção operacional
-- (mesmo propósito de admin_cleanup_orphan_client_invites(), já
-- role-gated). Contém e-mail. Fechada por completo.
ALTER VIEW public.v_orphan_client_invites SET (security_invoker = true);
REVOKE SELECT ON public.v_orphan_client_invites FROM anon;
REVOKE SELECT ON public.v_orphan_client_invites FROM authenticated;

-- 3.5 v_billing_mrr_summary (P1.8)
-- USO REAL: src/app/admin/super/billing/page.tsx -- Client Component
-- que consulta esta view DIRETAMENTE do browser com o client
-- authenticated (não via API route/service role). Diferente das 4
-- views acima: revogar de "authenticated" quebraria essa tela real.
-- Corrige só o que o brief pede explicitamente para este item
-- (Fase 11): fecha anon, mantém authenticated.
REVOKE SELECT ON public.v_billing_mrr_summary FROM anon;


-- ============================================================
-- 4. finance_mark_overdue() — least privilege (P0.5)
-- ============================================================
-- USO REAL: NENHUM em src/ -- nenhuma rota/página chama esta RPC.
-- É uma função de manutenção (marca cobranças vencidas), não uma ação
-- de usuário. Sem role check, sem auth.uid(), SECURITY DEFINER,
-- GRANT ... TO authenticated (e, confirmado ao vivo, também anon via
-- privilégio padrão de schema nunca revogado) -- qualquer visitante
-- não autenticado conseguia disparar um UPDATE global em
-- finance_charges. Corrigido para least privilege: só service_role
-- (uso pretendido: cron/job interno) pode executar.
REVOKE EXECUTE ON FUNCTION public.finance_mark_overdue() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finance_mark_overdue() FROM anon;
REVOKE EXECUTE ON FUNCTION public.finance_mark_overdue() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finance_mark_overdue() TO service_role;


-- ============================================================
-- 5. create_client_on_signup() — bloquear p_user_id arbitrário (P0.6)
-- ============================================================
-- USO REAL (Fase 15): dois call sites em src/, ambos client-side,
-- ambos passando SEMPRE o id do PRÓPRIO usuário recém-autenticado:
--   src/app/(public)/criar-conta/page.tsx  -- logo após auth.signUp(),
--     userId = authData.user.id (o usuário que acabou de se cadastrar)
--   src/app/onboarding/conclusao/page.tsx  -- user.id de
--     auth.getUser() (sessão ativa do próprio usuário)
-- O comentário original explica por que "anon" precisa continuar
-- podendo chamar: com "Email Confirmation" ativado, a sessão pode
-- ainda não existir logo após signUp() (auth.uid() = null nesse
-- instante), então exigir auth.uid() = p_user_id sempre quebraria esse
-- fluxo real e documentado -- não é uma correção segura menor (Fase 17
-- proíbe redesenhar o onboarding).
--
-- Correção mínima e segura (Fase 17, meio-termo entre as opções A/B):
--   • Se HÁ sessão (auth.uid() IS NOT NULL): exige p_user_id =
--     auth.uid() -- nunca mais cria Company para outro usuário.
--   • Se NÃO há sessão (o caso documentado de anon logo após signUp):
--     só permite quando a conta em auth.users foi criada há poucos
--     minutos -- fecha o abuso contra contas antigas/arbitrárias
--     (o único cenário real de exploração: usar um UUID de usuário já
--     existente há tempo) sem quebrar o fluxo real de signup.
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
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized: caller can only create a client for their own account' USING ERRCODE = 'P0002';
  END IF;

  IF auth.uid() IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = p_user_id AND created_at > now() - interval '10 minutes'
    ) THEN
      RAISE EXCEPTION 'unauthorized: anonymous calls are only allowed immediately after signup' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  SELECT id INTO v_client_id
  FROM public.clients
  WHERE owner_id = p_user_id;

  IF v_client_id IS NOT NULL THEN
    RETURN v_client_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user_not_found: usuário % não existe em auth.users', p_user_id;
  END IF;

  INSERT INTO public.clients (owner_id, company_name, responsible_name, email, status)
  VALUES (p_user_id, p_company_name, p_responsible, p_email, 'onboarding')
  RETURNING id INTO v_client_id;

  RETURN v_client_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_client_on_signup(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_client_on_signup(uuid, text, text, text) TO anon, authenticated;


-- ============================================================
-- 6. Meta/OlaClick RPCs — Company ownership real, não só role (P1.3-P1.6)
-- ============================================================

-- 6.1 admin_link_meta_asset (P1.3) + meta_connection_id ownership (Fase 26)
-- USO REAL: src/app/api/meta/assets/link/route.ts (API route
-- server-side). Bug adicional encontrado ao auditar (Fase 26): quando
-- p_meta_connection_id não é informado, a versão antiga buscava "a
-- conexão ativa mais recente" SEM FILTRAR POR client_id -- podia
-- vincular a conexão Meta de uma Company completamente diferente ao
-- asset de p_client_id. Corrigido para filtrar por client_id.
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
DECLARE
  v_caller_id     uuid;
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

  v_conn_id := p_meta_connection_id;

  IF v_conn_id IS NULL THEN
    -- Fase 26: escopado por client_id -- nunca "qualquer conexão ativa
    -- mais recente da plataforma".
    SELECT id INTO v_conn_id
    FROM public.meta_connections
    WHERE client_id = p_client_id
      AND status = 'active'
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
GRANT EXECUTE ON FUNCTION public.admin_link_meta_asset(uuid, text, text, text, text, text, uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.admin_link_meta_asset(uuid, text, text, text, text, text, uuid, boolean) IS
  'Vincula ativo Meta a um cliente. SECURITY DEFINER: bypassa RLS. '
  'Exige can_access_client(p_client_id) -- não é mais role-only (P1.3). '
  'meta_connection_id implícito escopado por client_id (Fase 26).';


-- 6.2 admin_upsert_olaclick_connection (P1.4)
-- USO REAL: src/app/api/olaclick/connect/route.ts (API route
-- server-side). Removido o valor de role inexistente ("agência" nunca
-- é um valor real de profiles.role -- Fase 23) da checagem; adicionado
-- can_access_client(p_client_id) como a autorização real.
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

  IF NOT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = p_client_id
      AND c.status IN ('active', 'onboarding')
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
GRANT EXECUTE ON FUNCTION public.admin_upsert_olaclick_connection(uuid, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.admin_upsert_olaclick_connection(uuid, text, text, text, text) IS
  'Salva/atualiza conexão Cardápio Digital. SECURITY DEFINER: bypassa RLS. '
  'Exige can_access_client(p_client_id) -- não é mais role-only (P1.4). '
  'Nunca retorna access_token.';


-- 6.3 admin_list_olaclick_connections (P1.5)
-- USO REAL: nenhuma chamada direta encontrada em src/ (RPC de
-- diagnóstico/manutenção). Super Admin continua podendo listar tudo
-- (Fase 29); demais roles só veem conexões de Companies autorizadas.
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
GRANT EXECUTE ON FUNCTION public.admin_list_olaclick_connections() TO authenticated;

COMMENT ON FUNCTION public.admin_list_olaclick_connections() IS
  'Lista conexões OlaClick. SECURITY DEFINER: bypassa RLS. Super Admin '
  'vê todas; demais só Companies autorizadas via can_access_client (P1.5). '
  'Nunca retorna access_token completo.';


-- 6.4 get_client_meta_status (P1.6, Fase 27)
-- USO REAL: nenhuma chamada direta encontrada em src/ (RPC de
-- diagnóstico). Removidos valores de role inexistentes ("agência" e
-- "team" nunca são valores reais de profiles.role); read scoped por
-- Company real, não role-only.
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
GRANT EXECUTE ON FUNCTION public.get_client_meta_status(uuid) TO authenticated;


-- ============================================================
-- 7. get_request_owner_for_client — authorization ausente (Fase 33)
-- ============================================================
-- USO REAL: src/app/client/solicitacoes/page.tsx -- SEMPRE chamado
-- com o clientId do PRÓPRIO usuário (resolvido de profiles.client_id
-- momentos antes). A função em si, porém, não validava NADA sobre o
-- caller nem tinha search_path -- qualquer authenticated podia
-- consultar o responsável de QUALQUER client_id arbitrário (pequeno
-- vazamento de informação). Patch simples e seguro (Fase 33):
-- adiciona can_access_client(p_client_id), que já cobre exatamente o
-- caso de uso real (cliente consultando o dono da própria Company).
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
GRANT EXECUTE ON FUNCTION public.get_request_owner_for_client(uuid) TO authenticated;


COMMIT;

-- ============================================================
-- FIM DA CORREÇÃO — status: SQL_READY_FOR_MANUAL_APPROVAL
-- (aguardando o veredito de aprovação formal do CODEX WEB antes de
-- qualquer execução)
--
-- Objetos deliberadamente NÃO tocados nesta correção (fora de escopo,
-- não é P0 nem P1 de autorização/Company -- backlog Fase 35):
--   ~31 outras funções SECURITY DEFINER com search_path ausente;
--   admin_archive_client(s)/admin_delete_client/admin_hard_delete_client(s)/
--     admin_restore_client -- auditados (Fase 30-32), já corretamente
--     role-gated no próprio corpo, contrato mantido como está
--     (nunca tornar mais permissivo sem necessidade comprovada);
--   docs/supabase/91-company-diagnostic-roadmap.sql -- congelado.
--
-- Próximos passos humanos, em ordem:
--   1. CODEX WEB revisa esta migration + rollback estaticamente;
--   2. se aprovado, pedir autorização explícita do usuário para
--      aplicar no Supabase SQL Editor;
--   3. após aplicar, CODEX WEB roda o LIVE SECURITY RE-AUDIT;
--   4. só com P0 = 0 e P1 crítico = 0, voltar para o
--      DIAGNOSTIC + ROADMAP SCHEMA FINAL GATE do SQL 91.
-- ============================================================
