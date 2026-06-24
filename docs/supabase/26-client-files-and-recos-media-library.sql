-- ============================================================
-- 26-client-files-and-recos-media-library.sql
-- Extende operational_attachments para suportar RecOS:
--   rec_project_id, rec_frame_id, category, tags
-- Rodar no Supabase SQL Editor após o SQL 25.
-- ============================================================

-- Adicionar colunas RecOS à tabela existente
ALTER TABLE public.operational_attachments
  ADD COLUMN IF NOT EXISTS rec_project_id uuid REFERENCES public.rec_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rec_frame_id   uuid REFERENCES public.rec_storyboard_frames(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category       text,
  ADD COLUMN IF NOT EXISTS tags           text[];

-- Índices para filtrar por projeto RecOS e frame
CREATE INDEX IF NOT EXISTS op_attachments_rec_project_id_idx ON public.operational_attachments(rec_project_id);
CREATE INDEX IF NOT EXISTS op_attachments_rec_frame_id_idx   ON public.operational_attachments(rec_frame_id);
CREATE INDEX IF NOT EXISTS op_attachments_category_idx       ON public.operational_attachments(category);

-- RLS: admin e equipe audiovisual podem ver/editar arquivos do projeto RecOS
-- (As políticas existentes já cobrem admin. Adicionamos visibilidade para videomaker/editor.)

DROP POLICY IF EXISTS "op_attachments: recos team select" ON public.operational_attachments;
CREATE POLICY "op_attachments: recos team select" ON public.operational_attachments
  FOR SELECT TO authenticated
  USING (
    rec_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('videomaker', 'editor', 'operacional')
    )
  );

DROP POLICY IF EXISTS "op_attachments: recos team write" ON public.operational_attachments;
CREATE POLICY "op_attachments: recos team write" ON public.operational_attachments
  FOR ALL TO authenticated
  USING (
    rec_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('videomaker', 'editor', 'operacional')
    )
  )
  WITH CHECK (
    rec_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('videomaker', 'editor', 'operacional')
    )
  );

NOTIFY pgrst, 'reload schema';
