-- ============================================================
-- SQL 09 — Admin Notifications + Role-based Client Cleanup
-- Run once after 08-team-access-requests.sql
-- ============================================================

-- ── 1. notifications table (generic, event-driven, for V1+) ──

CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_role text,                          -- NULL = specific user; 'admin' = all admins
  type          text        NOT NULL,           -- 'team_request' | 'approval' | 'task_assigned' | etc.
  title         text        NOT NULL,
  message       text,
  href          text,                           -- Deep-link inside the app
  is_read       boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins see all admin notifications" ON public.notifications;
CREATE POLICY "Admins see all admin notifications"
  ON public.notifications FOR SELECT
  USING (
    recipient_role = 'admin'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (
    recipient_id = auth.uid()
    OR (
      recipient_role = 'admin'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- ── 2. Trigger: auto-notify admins when a new team_access_request is submitted ──

CREATE OR REPLACE FUNCTION public.notify_admin_on_team_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notifications (recipient_role, type, title, message, href)
  VALUES (
    'admin',
    'team_request',
    'Nova solicitação de equipe',
    NEW.name || ' (' || NEW.desired_role || ') solicita acesso à equipe.',
    '/admin/equipe'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_on_team_request ON public.team_access_requests;
CREATE TRIGGER trg_notify_admin_on_team_request
  AFTER INSERT ON public.team_access_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_admin_on_team_request();

-- ── 3. Trigger: auto-notify admins when content enters review ──

CREATE OR REPLACE FUNCTION public.notify_admin_on_content_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'in_review' AND (OLD.status IS DISTINCT FROM 'in_review') THEN
    INSERT INTO public.notifications (recipient_role, type, title, message, href)
    VALUES (
      'admin',
      'approval',
      'Conteúdo aguardando aprovação',
      COALESCE(NEW.title, 'Conteúdo sem título') || ' entrou em revisão.',
      '/admin/contentos'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_on_content_review ON public.content_items;
CREATE TRIGGER trg_notify_admin_on_content_review
  AFTER UPDATE ON public.content_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_content_review();

-- ── 4. RPC: get admin notifications (authenticated admin only) ──

CREATE OR REPLACE FUNCTION public.get_admin_notifications(p_limit int DEFAULT 20)
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
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
    SELECT n.id, n.type, n.title, n.message, n.href, n.is_read, n.created_at
    FROM public.notifications n
    WHERE n.recipient_role = 'admin'
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_notifications(int) TO authenticated;

-- ── 5. RPC: mark admin notifications read ──

CREATE OR REPLACE FUNCTION public.mark_admin_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.notifications
  SET is_read = true
  WHERE recipient_role = 'admin' AND is_read = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_admin_notifications_read() TO authenticated;

-- ── 6. Cleanup view: clients with actual role='cliente' owner ──
-- Safe reference for future queries — no data is deleted

CREATE OR REPLACE VIEW public.v_real_clients AS
  SELECT c.*
  FROM public.clients c
  LEFT JOIN public.profiles p ON p.id = c.owner_id
  WHERE p.role = 'cliente' OR c.owner_id IS NULL;

-- Grant admins read access to this view
GRANT SELECT ON public.v_real_clients TO authenticated;

-- ── 7. Ensure profiles_role_check includes all operational roles ──
-- (idempotent update — drop and recreate constraint)

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (
    role IN (
      'admin', 'cliente', 'aluno',
      'operacional', 'social_media', 'designer', 'editor',
      'videomaker', 'gestor_trafego', 'comercial', 'financeiro'
    )
  );
