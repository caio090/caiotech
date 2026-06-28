-- ============================================================
-- LOKAT OS — Fix 48: admin pode inserir clientes manualmente
-- Execute no Supabase SQL Editor.
-- ============================================================

-- A policy "clients: cliente insere o próprio" cobre apenas signups.
-- Admin criando cliente pelo painel /admin/clientes falha pois não
-- existe policy de INSERT para roles de equipe.

DROP POLICY IF EXISTS "clients: admin insere" ON public.clients;

CREATE POLICY "clients: admin insere" ON public.clients
  FOR INSERT WITH CHECK (
    public.current_user_role() IN ('admin', 'operacional')
  );
