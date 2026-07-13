-- ============================================================
-- 78 · Blog Público Editorial — fundação de conteúdo LOKAT OS
--
-- NÃO EXECUTAR AUTOMATICAMENTE.
-- Rodar manualmente no Supabase SQL Editor após revisão.
-- Execução segura após SQL 77.
--
-- Justificativa:
--   - Blog público precisa de tabelas próprias separadas do OS.
--   - Fluxo editorial com aprovação humana obrigatória.
--   - Fontes e revisões rastreadas para credibilidade.
--   - Nenhum artigo publicado sem status = approved → published.
-- ============================================================

-- ── 1. blog_authors ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_authors (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text        NOT NULL UNIQUE,
  name       text        NOT NULL,
  bio        text        NULL,
  avatar_url text        NULL,
  role       text        NULL,
  profile_id uuid        NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_authors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read authors"
  ON public.blog_authors FOR SELECT USING (true);
CREATE POLICY "admin manage authors"
  ON public.blog_authors FOR ALL
  USING (public.current_user_role() IN ('super_admin','admin'));

COMMENT ON TABLE public.blog_authors IS 'Autores do blog. Pode ser vinculado a um profile da plataforma ou ser externo.';


-- ── 2. blog_categories ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text        NOT NULL UNIQUE,
  name        text        NOT NULL,
  description text        NULL,
  color       text        NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories"
  ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "admin manage categories"
  ON public.blog_categories FOR ALL
  USING (public.current_user_role() IN ('super_admin','admin'));

COMMENT ON TABLE public.blog_categories IS 'Categorias do blog. Definidas em src/lib/blog/types.ts#BLOG_CATEGORIES.';


-- ── 3. blog_posts ─────────────────────────────────────────────
-- status_flow: draft → research → review → approved → scheduled → published → archived
-- Nunca: draft → published direto.

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                   text        NOT NULL UNIQUE,
  title                  text        NOT NULL,
  summary                text        NULL,
  content                text        NULL,  -- HTML ou Markdown
  status                 text        NOT NULL DEFAULT 'draft'
                                     CHECK (status IN (
                                       'draft','research','review','approved',
                                       'scheduled','published','archived'
                                     )),
  author_id              uuid        NULL REFERENCES public.blog_authors(id) ON DELETE SET NULL,
  category_id            uuid        NULL REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  tags                   text[]      NOT NULL DEFAULT '{}',
  cover_url              text        NULL,
  cover_alt              text        NULL,
  cover_generation_status text       NOT NULL DEFAULT 'none'
                                     CHECK (cover_generation_status IN (
                                       'none','pending','generated','approved','external'
                                     )),
  seo_title              text        NULL,
  seo_description        text        NULL CHECK (char_length(seo_description) <= 160),
  cta_type               text        NOT NULL DEFAULT 'diagnostic'
                                     CHECK (cta_type IN (
                                       'diagnostic','platform_trial','service_contact',
                                       'newsletter','affiliate','sponsored','product','none'
                                     )),
  cta_label              text        NULL,
  cta_href               text        NULL,
  approved_by            uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at            timestamptz NULL,
  scheduled_at           timestamptz NULL,
  published_at           timestamptz NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status     ON public.blog_posts (status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published  ON public.blog_posts (published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_category   ON public.blog_posts (category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author     ON public.blog_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug       ON public.blog_posts (slug);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published');
CREATE POLICY "admin manage all posts"
  ON public.blog_posts FOR ALL
  USING (public.current_user_role() IN ('super_admin','admin'));

COMMENT ON TABLE public.blog_posts IS 'Artigos do blog público. Apenas status published é público. Aprovação humana obrigatória antes de publicar.';


-- ── 4. blog_tags ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_tags (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text        NOT NULL UNIQUE,
  name       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read tags"
  ON public.blog_tags FOR SELECT USING (true);
CREATE POLICY "admin manage tags"
  ON public.blog_tags FOR ALL
  USING (public.current_user_role() IN ('super_admin','admin'));


-- ── 5. blog_post_tags (N:N) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES public.blog_tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read post tags"
  ON public.blog_post_tags FOR SELECT USING (true);
CREATE POLICY "admin manage post tags"
  ON public.blog_post_tags FOR ALL
  USING (public.current_user_role() IN ('super_admin','admin'));


-- ── 6. blog_sources ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_sources (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid        NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  source_type  text        NOT NULL DEFAULT 'other'
                           CHECK (source_type IN (
                             'official','research','news','interview','internal','other'
                           )),
  title        text        NOT NULL,
  url          text        NULL,
  author       text        NULL,
  published_at date        NULL,
  note         text        NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_sources_post ON public.blog_sources (post_id);

ALTER TABLE public.blog_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read sources of published"
  ON public.blog_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts p
      WHERE p.id = blog_sources.post_id AND p.status = 'published'
    )
  );
CREATE POLICY "admin manage sources"
  ON public.blog_sources FOR ALL
  USING (public.current_user_role() IN ('super_admin','admin'));

COMMENT ON TABLE public.blog_sources IS 'Fontes dos artigos. Rastreabilidade editorial obrigatória. Exibidas ao final do artigo.';


-- ── 7. blog_revisions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_revisions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid        NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  editor_id   uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  stage       text        NOT NULL,  -- editorial stage
  changes     jsonb       NOT NULL DEFAULT '{}',
  note        text        NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_revisions_post ON public.blog_revisions (post_id);

ALTER TABLE public.blog_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read revisions"
  ON public.blog_revisions FOR SELECT
  USING (public.current_user_role() IN ('super_admin','admin'));
CREATE POLICY "admin create revisions"
  ON public.blog_revisions FOR INSERT
  WITH CHECK (public.current_user_role() IN ('super_admin','admin'));

COMMENT ON TABLE public.blog_revisions IS 'Histórico de revisões editoriais. Não pode ser deletado.';


-- ── 8. Seed de categorias ─────────────────────────────────────
-- As categorias espelham BLOG_CATEGORIES em src/lib/blog/types.ts.
INSERT INTO public.blog_categories (slug, name, description, color) VALUES
  ('marketing',        'Marketing',              'Estratégia, conteúdo, campanhas e resultados.',     '#7b6ef6'),
  ('tecnologia',       'Tecnologia',             'Ferramentas, plataformas e inovações.',              '#3b82f6'),
  ('inteligencia-ia',  'Inteligência Artificial','IA aplicada a operação, conteúdo e decisões.',       '#a855f7'),
  ('gestao',           'Gestão',                 'Processos, equipes, planejamento e resultados.',     '#10b981'),
  ('vendas',           'Vendas',                 'Conversão, CRM, follow-up e expansão de receita.',  '#f59e0b'),
  ('crm',              'CRM',                    'Relacionamento com clientes, leads e funis.',        '#ef4444'),
  ('automacao',        'Automação',              'Fluxos automáticos, webhooks e integrações.',        '#06b6d4'),
  ('conteudo',         'Conteúdo',               'Produção, calendário, aprovações e distribuição.',  '#ec4899'),
  ('audiovisual',      'Audiovisual',            'Vídeo, roteiro, decupagem e produção visual.',      '#c0392b'),
  ('redes-sociais',    'Redes Sociais',          'Instagram, Meta, TikTok e estratégias de presença.','#7b6ef6'),
  ('negocios-locais',  'Negócios Locais',        'Operação de empresas locais, clínicas, lojas.',     '#0ea5e9'),
  ('ecommerce',        'E-commerce',             'Vendas online, pedidos, faturamento e plataformas.','#84cc16'),
  ('cardapio-digital', 'Cardápio Digital',       'Pedidos online, integrações e faturamento.',        '#f97316'),
  ('whatsapp',         'WhatsApp',               'Atendimento, CRM e automação via canal WhatsApp.',  '#25d366'),
  ('dados-insights',   'Dados e Insights',       'Métricas, relatórios, diagnósticos e decisão.',     '#6366f1')
ON CONFLICT (slug) DO NOTHING;


-- ── 9. Reload schema ─────────────────────────────────────────
NOTIFY pgrst, 'reload schema';


-- ── ROLLBACK (se necessário) ──────────────────────────────────
-- DROP TABLE IF EXISTS public.blog_revisions CASCADE;
-- DROP TABLE IF EXISTS public.blog_sources CASCADE;
-- DROP TABLE IF EXISTS public.blog_post_tags CASCADE;
-- DROP TABLE IF EXISTS public.blog_tags CASCADE;
-- DROP TABLE IF EXISTS public.blog_posts CASCADE;
-- DROP TABLE IF EXISTS public.blog_categories CASCADE;
-- DROP TABLE IF EXISTS public.blog_authors CASCADE;


-- ── Notas ─────────────────────────────────────────────────────
-- 1. Nenhum artigo deve ser publicado automaticamente.
-- 2. Fluxo obrigatório: draft → ... → approved → published.
-- 3. blog_revisions não pode ser deletado — histórico editorial.
-- 4. seo_description limitado a 160 caracteres via CHECK.
-- 5. cover_alt obrigatório quando cover_url presente (validar no app).
-- 6. Categorias em seed espelham src/lib/blog/types.ts#BLOG_CATEGORIES.
