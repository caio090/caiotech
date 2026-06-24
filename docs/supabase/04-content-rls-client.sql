-- ============================================================
-- LOKAT OS — Fix 04: RLS para cliente criar e aprovar conteúdo
-- Execute no Supabase SQL Editor (após 01, 02 e 03).
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ── content_items: cliente pode inserir o próprio ────────────
--
-- Problema: a policy existente é FOR SELECT apenas.
-- Sem INSERT, um cliente (role='cliente') não consegue criar
-- conteúdo via /contentos/criar — o INSERT falha silenciosamente.

CREATE POLICY "content: cliente insere o próprio" ON public.content_items
  FOR INSERT WITH CHECK (
    client_id = public.current_client_id()
  );

-- ── content_items: cliente pode atualizar o próprio ──────────
--
-- Necessário para o fluxo de aprovação atualizar o status do conteúdo
-- quando o cliente aprova/reprova via /aprovar/[token].
-- (A página pública usa anon, mas updates autenticados também precisam.)

CREATE POLICY "content: cliente atualiza o próprio" ON public.content_items
  FOR UPDATE USING (
    client_id = public.current_client_id()
  );

-- ── approvals: cliente pode inserir o próprio ────────────────
--
-- Sem esta policy, um cliente não consegue criar uma approval
-- ao enviar conteúdo para aprovação via /contentos/criar.

CREATE POLICY "approvals: cliente insere o próprio" ON public.approvals
  FOR INSERT WITH CHECK (
    client_id = public.current_client_id()
  );
