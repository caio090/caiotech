-- ─────────────────────────────────────────────────────────────────────────────
-- 46-rec-videos.sql
-- Tabela de vídeos da LOKAT.REC + policies de storage
-- Rodar manualmente no Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Tabela ────────────────────────────────────────────────────────────────
create table if not exists public.rec_videos (
  id             uuid        primary key default gen_random_uuid(),
  title          text        not null,
  description    text,
  client_name    text,
  category       text        default 'outro',          -- campanha | feedback | institucional | produto | evento | bastidores | outro
  video_url      text        not null,
  storage_path   text,                                  -- caminho no bucket rec-videos
  thumbnail_url  text,
  is_public      boolean     not null default true,
  is_featured    boolean     not null default false,    -- destaque principal
  is_feedback    boolean     not null default false,    -- depoimento/feedback de cliente
  show_in_cards  boolean     not null default true,     -- aparece nos cards de portfolio
  sort_order     integer     not null default 0,
  status         text        not null default 'active', -- active | archived
  created_by     uuid        references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── 2. Índices ───────────────────────────────────────────────────────────────
create index if not exists rec_videos_status_idx     on public.rec_videos (status);
create index if not exists rec_videos_public_idx     on public.rec_videos (is_public);
create index if not exists rec_videos_featured_idx   on public.rec_videos (is_featured);
create index if not exists rec_videos_sort_order_idx on public.rec_videos (sort_order, created_at desc);
create index if not exists rec_videos_feedback_idx   on public.rec_videos (is_feedback);

-- ── 3. Trigger updated_at ────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rec_videos_updated_at on public.rec_videos;
create trigger rec_videos_updated_at
  before update on public.rec_videos
  for each row execute procedure public.set_updated_at();

-- ── 4. RLS ───────────────────────────────────────────────────────────────────
alter table public.rec_videos enable row level security;

-- Leitura pública: apenas vídeos ativos e públicos
create policy "rec_videos_public_read"
  on public.rec_videos for select
  using (is_public = true and status = 'active');

-- Admin/super_admin: acesso total
create policy "rec_videos_admin_all"
  on public.rec_videos for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'super_admin')
    )
  );

-- ── 5. Storage bucket rec-videos ─────────────────────────────────────────────
-- NOTA: O Supabase não permite criar buckets via SQL puro.
-- Se este INSERT falhar por permissão, crie o bucket manualmente:
--   Dashboard → Storage → New bucket → Nome: rec-videos → Public: ON
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rec-videos',
  'rec-videos',
  true,
  209715200,   -- 200 MB
  array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public            = excluded.public,
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── 6. Storage policies ───────────────────────────────────────────────────────
-- Leitura pública
create policy "rec_videos_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'rec-videos');

-- Upload/update/delete para admin/super_admin
create policy "rec_videos_storage_admin_write"
  on storage.objects for insert
  with check (
    bucket_id = 'rec-videos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'super_admin')
    )
  );

create policy "rec_videos_storage_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'rec-videos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'super_admin')
    )
  );

create policy "rec_videos_storage_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'rec-videos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'super_admin')
    )
  );

-- ── 7. Seed: vídeo de feedback Sandubão (opcional — preencher URL depois) ────
-- Descomente e preencha video_url com a URL pública do Supabase Storage depois
-- de fazer upload do arquivo feedbackduh.mp4:
--
-- insert into public.rec_videos
--   (title, client_name, category, video_url, storage_path, is_public, is_featured, is_feedback, show_in_cards, sort_order)
-- values
--   ('Depoimento Sandubão', 'Sandubão', 'feedback',
--    'https://<PROJETO>.supabase.co/storage/v1/object/public/rec-videos/feedback/feedbackduh.mp4',
--    'feedback/feedbackduh.mp4',
--    true, true, true, false, 999);
