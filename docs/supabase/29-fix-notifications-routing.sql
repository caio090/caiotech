-- ============================================================
-- SQL 29 — Corrigir roteamento de notificações
--
-- Problemas corrigidos:
--   1. Notificações não chegam ao setor operacional após aprovação
--   2. Admin não recebe notificação quando cliente aprova
--   3. Tabela notifications pode não ter campo user_id indexado
--
-- Safe to re-run:
--   DROP POLICY IF EXISTS + CREATE POLICY
--   CREATE INDEX IF NOT EXISTS
--   CREATE TABLE IF NOT EXISTS (não existe aqui)
-- ============================================================

-- ── 1. Verificar estrutura da tabela notifications ───────────

-- Caso a coluna 'role' não exista para notificações por cargo:
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS target_role text DEFAULT NULL;

-- Caso precise do client_id na notificação:
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- ── 2. Índices para busca eficiente ──────────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_target_role
  ON public.notifications (target_role)
  WHERE target_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications (created_at DESC);

-- ── 3. RLS — políticas de notificações ───────────────────────
-- Usuário vê próprias notificações OU notificações do seu cargo

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      target_role IS NOT NULL
      AND target_role = (
        SELECT role FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "notifications_insert_service" ON public.notifications;
CREATE POLICY "notifications_insert_service" ON public.notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ── 4. Função para criar notificação ao aprovação do cliente ─

CREATE OR REPLACE FUNCTION public.notify_on_approval_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content   public.content_items%ROWTYPE;
  v_notif_title text;
BEGIN
  -- Só dispara em mudanças de status
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Buscar content_item
  SELECT * INTO v_content FROM public.content_items WHERE id = NEW.content_id;

  -- ── Quando cliente aprova ────────────────────────────────────
  IF NEW.status = 'aprovado' THEN
    v_notif_title := COALESCE(v_content.title, 'Conteúdo aprovado');

    -- Notifica admin(s) com role 'admin'
    INSERT INTO public.notifications (user_id, target_role, type, title, body, client_id, read)
    SELECT
      p.id,
      NULL,
      'approval_approved',
      '✓ Aprovado: ' || v_notif_title,
      'O cliente aprovou o conteúdo. Verifique o OperacionalOS.',
      NEW.client_id,
      false
    FROM public.profiles p
    WHERE p.role = 'admin'
    ON CONFLICT DO NOTHING;

    -- Notifica equipe operacional (role 'social_media' ou 'designer')
    INSERT INTO public.notifications (user_id, target_role, type, title, body, client_id, read)
    VALUES (
      NULL,
      'social_media',
      'approval_approved',
      '✓ Aprovado: ' || v_notif_title,
      'Conteúdo aprovado pelo cliente. Verifique suas tarefas.',
      NEW.client_id,
      false
    )
    ON CONFLICT DO NOTHING;

  -- ── Quando cliente solicita revisão ─────────────────────────
  ELSIF NEW.status = 'revisao' THEN
    v_notif_title := COALESCE(v_content.title, 'Revisão solicitada');

    INSERT INTO public.notifications (user_id, target_role, type, title, body, client_id, read)
    SELECT
      p.id,
      NULL,
      'approval_revision',
      '⚠ Revisão: ' || v_notif_title,
      'O cliente solicitou alterações no conteúdo.',
      NEW.client_id,
      false
    FROM public.profiles p
    WHERE p.role IN ('admin', 'social_media')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[notify_on_approval] ERRO: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- ── 5. Trigger de notificação de aprovação ───────────────────

DROP TRIGGER IF EXISTS trg_notify_on_approval_status ON public.approvals;

CREATE TRIGGER trg_notify_on_approval_status
  AFTER UPDATE OF status ON public.approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_approval_status_change();

-- ── 6. Função para notificar quando tarefa operacional é criada

CREATE OR REPLACE FUNCTION public.notify_on_operational_task_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notificação para o cargo responsável
  IF NEW.assigned_role IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, target_role, type, title, body, client_id, read)
    VALUES (
      NULL,
      NEW.assigned_role,
      'task_assigned',
      'Nova tarefa: ' || COALESCE(NEW.title, 'Sem título'),
      COALESCE('Setor: ' || NEW.department || ' — Prioridade: ' || COALESCE(NEW.priority, 'média'), ''),
      NEW.client_id,
      false
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[notify_on_task_created] ERRO: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- ── 7. Trigger de notificação de nova tarefa operacional ─────

DROP TRIGGER IF EXISTS trg_notify_on_task_created ON public.operational_tasks;

CREATE TRIGGER trg_notify_on_task_created
  AFTER INSERT ON public.operational_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_operational_task_created();

-- ── 8. Atualizar PostgREST ───────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ── INSTRUÇÕES ────────────────────────────────────────────────
-- 1. Rodar este SQL no Supabase SQL Editor
-- 2. Após rodar, testar o fluxo:
--    a. Criar conteúdo no ContentOS
--    b. Enviar para aprovação
--    c. Aprovar via link público
--    d. Verificar se notificação aparece no admin
--    e. Verificar se tarefa foi criada no OperacionalOS
-- 3. Se a tabela notifications não existir, criar antes com SQL base
-- ============================================================
