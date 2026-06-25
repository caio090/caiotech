-- ============================================================
-- SQL 29 — Corrigir roteamento de notificações (v2 — compatível)
--
-- Schema real da tabela notifications (criada no SQL 09):
--   id            uuid
--   recipient_id  uuid  → profiles.id (usuário específico)
--   recipient_role text  → 'admin' | 'social_media' | etc. (broadcast por cargo)
--   type          text
--   title         text
--   message       text
--   href          text
--   is_read       boolean DEFAULT false
--   created_at    timestamptz
--
-- Erros corrigidos em relação à v1:
--   ✗ user_id        → ✓ recipient_id
--   ✗ target_role    → ✓ recipient_role
--   ✗ body           → ✓ message
--   ✗ read           → ✓ is_read
--   ✗ client_id      → coluna não existe, removida
--
-- Safe to re-run:
--   DROP POLICY IF EXISTS + CREATE POLICY
--   CREATE INDEX IF NOT EXISTS
--   ALTER TABLE ADD COLUMN IF NOT EXISTS (somente se necessário)
-- ============================================================

-- ── 1. Adicionar colunas úteis (se ainda não existirem) ──────
--    Não remove dados existentes.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS operational_task_id uuid REFERENCES public.operational_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_id         uuid REFERENCES public.approvals(id)         ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content_item_id     uuid REFERENCES public.content_items(id)     ON DELETE SET NULL;

-- ── 2. Índices para busca eficiente ──────────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id
  ON public.notifications (recipient_id)
  WHERE recipient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role
  ON public.notifications (recipient_role)
  WHERE recipient_role IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read
  ON public.notifications (is_read)
  WHERE is_read = false;

-- ── 3. RLS — políticas corrigidas ────────────────────────────
-- Usuário vê próprias notificações OU notificações do seu cargo

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_service" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;

-- Manter policies existentes do SQL 09 (não conflitam)
-- Adicionar policy para operacional ver notificações do seu cargo

DROP POLICY IF EXISTS "Operacional see role notifications" ON public.notifications;
CREATE POLICY "Operacional see role notifications"
  ON public.notifications FOR SELECT
  USING (
    recipient_role IS NOT NULL
    AND recipient_role = (
      SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
    AND recipient_role NOT IN ('admin') -- admin já tem policy própria no SQL 09
  );

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users mark own read" ON public.notifications;
CREATE POLICY "Users mark own read"
  ON public.notifications FOR UPDATE
  USING (
    recipient_id = auth.uid()
    OR (
      recipient_role = (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

-- ── 4. Trigger: notificação quando aprovação muda de status ──

CREATE OR REPLACE FUNCTION public.notify_on_approval_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  -- Buscar título do conteúdo
  SELECT COALESCE(ci.title, 'Conteúdo sem título')
  INTO v_title
  FROM public.content_items ci
  WHERE ci.id = NEW.content_id;

  -- ── Cliente aprovou ─────────────────────────────────────────
  IF NEW.status = 'aprovado' THEN

    -- Notifica todos os admins individualmente
    INSERT INTO public.notifications (recipient_id, type, title, message, href, approval_id, content_item_id)
    SELECT
      p.id,
      'approval_approved',
      'Aprovado: ' || v_title,
      'O cliente aprovou o conteúdo. Verifique o OperacionalOS.',
      '/admin/operacional',
      NEW.id,
      NEW.content_id
    FROM public.profiles p
    WHERE p.role = 'admin';

    -- Notifica equipe social_media por cargo (broadcast)
    INSERT INTO public.notifications (recipient_role, type, title, message, href, approval_id, content_item_id)
    VALUES (
      'social_media',
      'approval_approved',
      'Aprovado: ' || v_title,
      'Conteúdo aprovado pelo cliente. Verifique suas tarefas.',
      '/operacional/minhas-tarefas',
      NEW.id,
      NEW.content_id
    );

  -- ── Cliente pediu revisão ───────────────────────────────────
  ELSIF NEW.status IN ('revisao', 'alteracao_solicitada') THEN

    INSERT INTO public.notifications (recipient_id, type, title, message, href, approval_id, content_item_id)
    SELECT
      p.id,
      'approval_revision',
      'Revisão solicitada: ' || v_title,
      COALESCE('Comentário: ' || NEW.client_comment, 'O cliente solicitou alterações.'),
      '/admin/contentos',
      NEW.id,
      NEW.content_id
    FROM public.profiles p
    WHERE p.role IN ('admin', 'social_media');

  -- ── Enviado para aprovação ──────────────────────────────────
  ELSIF NEW.status = 'aguardando' AND OLD.status IS DISTINCT FROM 'aguardando' THEN

    INSERT INTO public.notifications (recipient_role, type, title, message, href, approval_id, content_item_id)
    VALUES (
      'admin',
      'approval_pending',
      'Aprovação pendente: ' || v_title,
      'Um conteúdo foi enviado para aprovação do cliente.',
      '/admin/contentos',
      NEW.id,
      NEW.content_id
    );

  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[notify_on_approval_status_change] ERRO: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_approval_status ON public.approvals;

CREATE TRIGGER trg_notify_on_approval_status
  AFTER UPDATE OF status ON public.approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_approval_status_change();

-- ── 5. Trigger: notificação quando tarefa operacional é criada

CREATE OR REPLACE FUNCTION public.notify_on_operational_task_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notifica o cargo responsável pela tarefa
  IF NEW.assigned_role IS NOT NULL THEN
    INSERT INTO public.notifications (recipient_role, type, title, message, href, operational_task_id)
    VALUES (
      NEW.assigned_role,
      'task_assigned',
      'Nova tarefa: ' || COALESCE(NEW.title, 'Sem título'),
      COALESCE('Setor: ' || NEW.department, '') ||
        CASE WHEN NEW.priority IS NOT NULL THEN ' — Prioridade: ' || NEW.priority ELSE '' END,
      '/operacional/minhas-tarefas',
      NEW.id
    );
  END IF;

  -- Notifica o usuário específico designado (se houver)
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (recipient_id, type, title, message, href, operational_task_id)
    VALUES (
      NEW.assigned_to,
      'task_assigned',
      'Tarefa atribuída: ' || COALESCE(NEW.title, 'Sem título'),
      COALESCE('Setor: ' || NEW.department, '') ||
        CASE WHEN NEW.priority IS NOT NULL THEN ' — Prioridade: ' || NEW.priority ELSE '' END,
      '/operacional/minhas-tarefas',
      NEW.id
    );
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[notify_on_operational_task_created] ERRO: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_task_created ON public.operational_tasks;

CREATE TRIGGER trg_notify_on_task_created
  AFTER INSERT ON public.operational_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_operational_task_created();

-- ── 6. Trigger: notificar admin em novos cadastros ───────────

CREATE OR REPLACE FUNCTION public.notify_admin_on_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só dispara quando um novo profile de cliente é criado
  IF NEW.role = 'cliente' THEN
    INSERT INTO public.notifications (recipient_role, type, title, message, href)
    VALUES (
      'admin',
      'new_signup',
      'Novo cadastro: ' || COALESCE(NEW.name, NEW.email),
      'Um novo cliente se cadastrou na plataforma.',
      '/admin/leads'
    );
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[notify_admin_on_new_signup] ERRO: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_on_new_signup ON public.profiles;

CREATE TRIGGER trg_notify_admin_on_new_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_new_signup();

-- ── 7. RPC: buscar notificações do operacional (por cargo) ───

CREATE OR REPLACE FUNCTION public.get_my_notifications(p_limit int DEFAULT 20)
RETURNS TABLE (
  id            uuid,
  type          text,
  title         text,
  message       text,
  href          text,
  is_read       boolean,
  created_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  RETURN QUERY
    SELECT n.id, n.type, n.title, n.message, n.href, n.is_read, n.created_at
    FROM public.notifications n
    WHERE
      n.recipient_id = auth.uid()
      OR n.recipient_role = v_role
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_notifications(int) TO authenticated;

-- ── 8. RPC: marcar notificações do operacional como lidas ────

CREATE OR REPLACE FUNCTION public.mark_my_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  UPDATE public.notifications
  SET is_read = true
  WHERE is_read = false
    AND (recipient_id = auth.uid() OR recipient_role = v_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_my_notifications_read() TO authenticated;

-- ── 9. Notificar PostgREST ───────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- INSTRUÇÕES DE EXECUÇÃO
-- ============================================================
--
-- PRÉ-REQUISITO: SQL 09 já deve ter sido executado
--   (cria a tabela notifications com as colunas corretas)
--
-- ORDEM DE EXECUÇÃO:
--   1. SQL 09 — cria tabela notifications (se ainda não rodou)
--   2. SQL 27 — fix trigger de aprovação (recomendado antes)
--   3. SQL 29 (este arquivo) — corrige roteamento de notificações
--   4. SQL 31 — leads de novos cadastros (pode rodar depois)
--
-- COMO TESTAR:
--   1. Criar conteúdo no ContentOS (/contentos/criar)
--   2. Mudar status para 'enviado_aprovacao'
--      → Deve criar notificação para admin (tipo: approval_pending)
--   3. Acessar link público de aprovação e aprovar
--      → Deve criar notificação para admin + social_media (tipo: approval_approved)
--   4. Verificar se tarefa operacional foi criada no OperacionalOS
--      → Deve criar notificação para o cargo da tarefa (tipo: task_assigned)
--   5. Criar novo cadastro (criar-conta)
--      → Deve criar notificação para admin (tipo: new_signup)
--
-- VERIFICAR NO SUPABASE TABLE EDITOR:
--   SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20;
--
-- USAR NO FRONTEND (admin):
--   supabase.rpc('get_admin_notifications', { p_limit: 20 })
--
-- USAR NO FRONTEND (operacional):
--   supabase.rpc('get_my_notifications', { p_limit: 20 })
--
-- MARCAR COMO LIDA (admin):
--   supabase.rpc('mark_admin_notifications_read')
--
-- MARCAR COMO LIDA (operacional):
--   supabase.rpc('mark_my_notifications_read')
-- ============================================================
