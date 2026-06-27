-- LOKAT OS — SQL 44: Client Portal Real Data
-- Cria tabelas reais para o portal do cliente:
--   client_projects, client_project_tasks, client_files,
--   client_user_access, client_portal_settings
-- Idempotente: usa CREATE TABLE IF NOT EXISTS e CREATE POLICY IF NOT EXISTS.
-- Rodar no SQL Editor do Supabase.

-- ── Helpers (reutiliza se já existirem) ───────────────────────
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

-- ── 1. client_projects ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_projects (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title             text        NOT NULL,
  description       text,
  status            text        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  progress          integer     NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  start_date        date,
  due_date          date,
  visible_to_client boolean     NOT NULL DEFAULT true,
  created_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;

-- Admin vê tudo
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='client_projects' AND policyname='admin_all_client_projects'
  ) THEN
    CREATE POLICY "admin_all_client_projects" ON public.client_projects
      FOR ALL USING (public.is_admin_or_super());
  END IF;
END $$;

-- Cliente vê projetos do seu client_id onde visible_to_client = true
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='client_projects' AND policyname='client_own_projects'
  ) THEN
    CREATE POLICY "client_own_projects" ON public.client_projects
      FOR SELECT USING (
        visible_to_client = true AND
        client_id IN (
          SELECT client_id FROM public.profiles
          WHERE id = auth.uid() AND client_id IS NOT NULL
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_client_projects_client_id ON public.client_projects(client_id);

-- ── 2. client_project_tasks ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_project_tasks (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id        uuid        NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  client_id         uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title             text        NOT NULL,
  description       text,
  status            text        NOT NULL DEFAULT 'todo'
                                CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'archived')),
  due_date          date,
  position          integer     NOT NULL DEFAULT 0,
  visible_to_client boolean     NOT NULL DEFAULT true,
  internal_notes    text,
  created_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_project_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='client_project_tasks' AND policyname='admin_all_tasks'
  ) THEN
    CREATE POLICY "admin_all_tasks" ON public.client_project_tasks
      FOR ALL USING (public.is_admin_or_super());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='client_project_tasks' AND policyname='client_own_tasks'
  ) THEN
    CREATE POLICY "client_own_tasks" ON public.client_project_tasks
      FOR SELECT USING (
        visible_to_client = true AND
        client_id IN (
          SELECT client_id FROM public.profiles
          WHERE id = auth.uid() AND client_id IS NOT NULL
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_client_project_tasks_project_id ON public.client_project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_client_project_tasks_client_id  ON public.client_project_tasks(client_id);

-- ── 3. client_files ───────────────────────────────────────────
-- Centraliza arquivos enviados pela agência para o cliente.
-- Substitui/complementa client_diagnosis_files.
CREATE TABLE IF NOT EXISTS public.client_files (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id        uuid        REFERENCES public.client_projects(id) ON DELETE SET NULL,
  title             text        NOT NULL,
  file_name         text,
  file_url          text,
  storage_path      text,
  file_type         text,
  size_bytes        bigint,
  category          text        NOT NULL DEFAULT 'general'
                                CHECK (category IN (
                                  'briefing','diagnosis','identity','content',
                                  'report','invoice','media','general'
                                )),
  visible_to_client boolean     NOT NULL DEFAULT true,
  uploaded_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='client_files' AND policyname='admin_all_client_files'
  ) THEN
    CREATE POLICY "admin_all_client_files" ON public.client_files
      FOR ALL USING (public.is_admin_or_super());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='client_files' AND policyname='client_own_files'
  ) THEN
    CREATE POLICY "client_own_files" ON public.client_files
      FOR SELECT USING (
        visible_to_client = true AND
        client_id IN (
          SELECT client_id FROM public.profiles
          WHERE id = auth.uid() AND client_id IS NOT NULL
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_client_files_client_id ON public.client_files(client_id);

-- ── 4. client_user_access ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_user_access (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id  uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'client',
  status     text        NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id)
);

ALTER TABLE public.client_user_access ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='client_user_access' AND policyname='admin_all_client_user_access'
  ) THEN
    CREATE POLICY "admin_all_client_user_access" ON public.client_user_access
      FOR ALL USING (public.is_admin_or_super());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='client_user_access' AND policyname='client_own_access'
  ) THEN
    CREATE POLICY "client_own_access" ON public.client_user_access
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_client_user_access_client_id ON public.client_user_access(client_id);
CREATE INDEX IF NOT EXISTS idx_client_user_access_user_id   ON public.client_user_access(user_id);

-- ── 5. client_portal_settings ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_portal_settings (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id             uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  show_project          boolean     NOT NULL DEFAULT true,
  show_content          boolean     NOT NULL DEFAULT true,
  show_approvals        boolean     NOT NULL DEFAULT true,
  show_calendar         boolean     NOT NULL DEFAULT true,
  show_results          boolean     NOT NULL DEFAULT true,
  show_financial        boolean     NOT NULL DEFAULT true,
  show_files            boolean     NOT NULL DEFAULT true,
  show_requests         boolean     NOT NULL DEFAULT true,
  welcome_tour_enabled  boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_portal_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='client_portal_settings' AND policyname='admin_all_portal_settings'
  ) THEN
    CREATE POLICY "admin_all_portal_settings" ON public.client_portal_settings
      FOR ALL USING (public.is_admin_or_super());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='client_portal_settings' AND policyname='client_read_own_settings'
  ) THEN
    CREATE POLICY "client_read_own_settings" ON public.client_portal_settings
      FOR SELECT USING (
        client_id IN (
          SELECT client_id FROM public.profiles
          WHERE id = auth.uid() AND client_id IS NOT NULL
        )
      );
  END IF;
END $$;

-- ── Reload schema ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
