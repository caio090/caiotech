-- ============================================================
-- 25-recos-audiovisual-storyboard.sql
-- RecOS: módulo audiovisual da Lokat Rec
-- Rodar no Supabase SQL Editor
-- ============================================================

-- rec_projects: projeto audiovisual principal
CREATE TABLE IF NOT EXISTS public.rec_projects (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid        REFERENCES public.clients(id) ON DELETE SET NULL,
  title             text        NOT NULL,
  project_type      text        NOT NULL DEFAULT 'comercial',
  objective         text,
  style             text,
  duration_estimate text,
  location          text,
  status            text        NOT NULL DEFAULT 'em_andamento',
  team              text[],
  recording_date    date,
  notes             text,
  created_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  metadata          jsonb
);

-- rec_scripts: roteiro do projeto
CREATE TABLE IF NOT EXISTS public.rec_scripts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.rec_projects(id) ON DELETE CASCADE,
  script_text text,
  script_url  text,
  script_type text        NOT NULL DEFAULT 'texto',
  status      text        NOT NULL DEFAULT 'rascunho',
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- rec_storytelling: estrutura narrativa do projeto
CREATE TABLE IF NOT EXISTS public.rec_storytelling (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.rec_projects(id) ON DELETE CASCADE,
  theme       text,
  message     text,
  emotion     text,
  beginning   text,
  development text,
  key_moment  text,
  ending      text,
  cta         text,
  rhythm      text,
  style_notes text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- rec_storyboard_frames: quadros do storyboard
CREATE TABLE IF NOT EXISTS public.rec_storyboard_frames (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         uuid        NOT NULL REFERENCES public.rec_projects(id) ON DELETE CASCADE,
  scene_number       int         NOT NULL DEFAULT 1,
  frame_number       int         NOT NULL DEFAULT 1,
  title              text,
  visual_description text,
  dialogue           text,
  action_notes       text,
  shot_type          text,
  camera_movement    text,
  lens               text,
  location           text,
  duration_estimate  text,
  image_url          text,
  reference_url      text,
  image_prompt       text,
  image_status       text        NOT NULL DEFAULT 'pendente',
  notes              text,
  metadata           jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- rec_references: referências visuais e de locação
CREATE TABLE IF NOT EXISTS public.rec_references (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid        NOT NULL REFERENCES public.rec_projects(id) ON DELETE CASCADE,
  reference_type text        NOT NULL DEFAULT 'geral',
  title          text,
  url            text,
  file_url       text,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- rec_shot_list: lista técnica de planos
CREATE TABLE IF NOT EXISTS public.rec_shot_list (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid        NOT NULL REFERENCES public.rec_projects(id) ON DELETE CASCADE,
  scene_number      int         NOT NULL DEFAULT 1,
  shot_number       int         NOT NULL DEFAULT 1,
  description       text,
  shot_type         text,
  angle             text,
  movement          text,
  lens              text,
  audio             text,
  equipment         text,
  location          text,
  duration_estimate text,
  priority          text        NOT NULL DEFAULT 'normal',
  status            text        NOT NULL DEFAULT 'planejado',
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- rec_exports: registro de exportações geradas
CREATE TABLE IF NOT EXISTS public.rec_exports (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES public.rec_projects(id) ON DELETE CASCADE,
  export_type text        NOT NULL,
  file_url    text,
  status      text        NOT NULL DEFAULT 'pendente',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Índices ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS rec_projects_client_id_idx      ON public.rec_projects(client_id);
CREATE INDEX IF NOT EXISTS rec_projects_created_by_idx     ON public.rec_projects(created_by);
CREATE INDEX IF NOT EXISTS rec_projects_status_idx         ON public.rec_projects(status);
CREATE INDEX IF NOT EXISTS rec_scripts_project_id_idx      ON public.rec_scripts(project_id);
CREATE INDEX IF NOT EXISTS rec_storytelling_project_id_idx ON public.rec_storytelling(project_id);
CREATE INDEX IF NOT EXISTS rec_storyboard_frames_proj_idx  ON public.rec_storyboard_frames(project_id);
CREATE INDEX IF NOT EXISTS rec_storyboard_frames_scene_idx ON public.rec_storyboard_frames(project_id, scene_number, frame_number);
CREATE INDEX IF NOT EXISTS rec_references_project_id_idx   ON public.rec_references(project_id);
CREATE INDEX IF NOT EXISTS rec_shot_list_project_id_idx    ON public.rec_shot_list(project_id);
CREATE INDEX IF NOT EXISTS rec_exports_project_id_idx      ON public.rec_exports(project_id);

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE public.rec_projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rec_scripts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rec_storytelling     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rec_storyboard_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rec_references       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rec_shot_list        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rec_exports          ENABLE ROW LEVEL SECURITY;

-- Helper: verifica se o usuário é admin
-- (inline nos policies para evitar dependência de função separada)

-- rec_projects policies
DROP POLICY IF EXISTS "rec_projects: admin full" ON public.rec_projects;
CREATE POLICY "rec_projects: admin full" ON public.rec_projects
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "rec_projects: team select" ON public.rec_projects;
CREATE POLICY "rec_projects: team select" ON public.rec_projects
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional','social_media')
  ));

DROP POLICY IF EXISTS "rec_projects: team write" ON public.rec_projects;
CREATE POLICY "rec_projects: team write" ON public.rec_projects
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional')
  ));

-- rec_scripts policies
DROP POLICY IF EXISTS "rec_scripts: admin full" ON public.rec_scripts;
CREATE POLICY "rec_scripts: admin full" ON public.rec_scripts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "rec_scripts: team" ON public.rec_scripts;
CREATE POLICY "rec_scripts: team" ON public.rec_scripts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional')));

-- rec_storytelling policies
DROP POLICY IF EXISTS "rec_storytelling: admin full" ON public.rec_storytelling;
CREATE POLICY "rec_storytelling: admin full" ON public.rec_storytelling
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "rec_storytelling: team" ON public.rec_storytelling;
CREATE POLICY "rec_storytelling: team" ON public.rec_storytelling
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional')));

-- rec_storyboard_frames policies
DROP POLICY IF EXISTS "rec_storyboard_frames: admin full" ON public.rec_storyboard_frames;
CREATE POLICY "rec_storyboard_frames: admin full" ON public.rec_storyboard_frames
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "rec_storyboard_frames: team" ON public.rec_storyboard_frames;
CREATE POLICY "rec_storyboard_frames: team" ON public.rec_storyboard_frames
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional')));

-- rec_references policies
DROP POLICY IF EXISTS "rec_references: admin full" ON public.rec_references;
CREATE POLICY "rec_references: admin full" ON public.rec_references
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "rec_references: team" ON public.rec_references;
CREATE POLICY "rec_references: team" ON public.rec_references
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional')));

-- rec_shot_list policies
DROP POLICY IF EXISTS "rec_shot_list: admin full" ON public.rec_shot_list;
CREATE POLICY "rec_shot_list: admin full" ON public.rec_shot_list
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "rec_shot_list: team" ON public.rec_shot_list;
CREATE POLICY "rec_shot_list: team" ON public.rec_shot_list
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional')));

-- rec_exports policies
DROP POLICY IF EXISTS "rec_exports: admin full" ON public.rec_exports;
CREATE POLICY "rec_exports: admin full" ON public.rec_exports
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "rec_exports: team" ON public.rec_exports;
CREATE POLICY "rec_exports: team" ON public.rec_exports
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('videomaker','editor','operacional')));

-- ── Trigger updated_at ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_rec_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_rec_projects_updated_at ON public.rec_projects;
CREATE TRIGGER trg_rec_projects_updated_at
  BEFORE UPDATE ON public.rec_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_rec_updated_at();

DROP TRIGGER IF EXISTS trg_rec_scripts_updated_at ON public.rec_scripts;
CREATE TRIGGER trg_rec_scripts_updated_at
  BEFORE UPDATE ON public.rec_scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_rec_updated_at();

DROP TRIGGER IF EXISTS trg_rec_storytelling_updated_at ON public.rec_storytelling;
CREATE TRIGGER trg_rec_storytelling_updated_at
  BEFORE UPDATE ON public.rec_storytelling
  FOR EACH ROW EXECUTE FUNCTION public.update_rec_updated_at();

DROP TRIGGER IF EXISTS trg_rec_storyboard_frames_updated_at ON public.rec_storyboard_frames;
CREATE TRIGGER trg_rec_storyboard_frames_updated_at
  BEFORE UPDATE ON public.rec_storyboard_frames
  FOR EACH ROW EXECUTE FUNCTION public.update_rec_updated_at();

NOTIFY pgrst, 'reload schema';
