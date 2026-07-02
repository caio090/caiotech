-- ============================================================
-- 59 - Correção de RLS para super_admin em client_meta_assets
-- e olaclick_connections.
--
-- Problema: as policies originais (SQL 37, SQL 39) não incluíam
-- o role 'super_admin', impedindo que usuários super_admin
-- vissem ou gravassem vínculos Meta e status OlaClick via
-- session client (JWT). As operações dependiam 100% do service
-- role, causando falhas quando a chave estava ausente/inválida.
--
-- Esta migration é idempotente (usa DROP IF EXISTS + CREATE).
-- Não contém dados reais de clientes.
-- ============================================================

-- ── 1. client_meta_assets ────────────────────────────────────

-- SELECT: admin, super_admin, agency e team
DROP POLICY IF EXISTS "client_meta_assets_select" ON public.client_meta_assets;
CREATE POLICY "client_meta_assets_select"
  ON public.client_meta_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency', 'team')
    )
  );

-- INSERT: super_admin, admin e agency
DROP POLICY IF EXISTS "client_meta_assets_insert" ON public.client_meta_assets;
CREATE POLICY "client_meta_assets_insert"
  ON public.client_meta_assets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
  );

-- UPDATE: super_admin, admin e agency
DROP POLICY IF EXISTS "client_meta_assets_update" ON public.client_meta_assets;
CREATE POLICY "client_meta_assets_update"
  ON public.client_meta_assets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
  );

-- DELETE: super_admin e admin
DROP POLICY IF EXISTS "client_meta_assets_delete" ON public.client_meta_assets;
CREATE POLICY "client_meta_assets_delete"
  ON public.client_meta_assets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
    )
  );

-- ── 2. olaclick_connections — confirma super_admin ───────────
-- (SQL 39 já incluía super_admin, mas reaplica para garantir
--  idempotência caso a migration tenha sido rodada sem a versão
--  corrigida do SQL 39.)

DROP POLICY IF EXISTS "admin_all_olaclick" ON public.olaclick_connections;
CREATE POLICY "admin_all_olaclick"
  ON public.olaclick_connections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin', 'admin', 'agency')
    )
  );

-- Mantém a policy de leitura restrita do cliente (sem alterar)
-- "client_read_own_olaclick" já existe e não precisa ser alterada.

-- ── 3. Recarregar schema do PostgREST ────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── Notas de uso ─────────────────────────────────────────────
-- Após rodar:
-- 1. Usuários super_admin poderão vincular ativos Meta a clientes
--    em /admin/conexoes sem depender exclusivamente do service role.
-- 2. /admin/contentos/insights verá os vínculos via session client.
-- 3. O connect OlaClick aceitará client_id válido sem depender do
--    service role para a busca de validação do cliente.
