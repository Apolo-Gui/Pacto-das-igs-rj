-- Pacto das IGs • Painel administrativo
-- Execute no SQL Editor de um projeto Supabase dedicado.
-- A autorização real acontece nas políticas RLS, não no JavaScript.

create extension if not exists pgcrypto;

create table if not exists public.pacto_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_pacto_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pacto_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on public.pacto_admins from anon, authenticated;
alter table public.pacto_admins enable row level security;
revoke all on function public.is_pacto_admin() from public;
grant execute on function public.is_pacto_admin() to authenticated, service_role;

create table if not exists public.pacto_news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 4 and 180),
  summary text not null default '',
  content text not null default '',
  category text not null default 'Novidade' check (category in ('Novidade','Evento','Comunicado')),
  image_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pacto_igs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 180),
  region text not null default '',
  product text not null default '',
  description text not null default '',
  image_url text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 100 check (sort_order between 0 and 9999),
  show_from timestamptz,
  show_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_feature_window check (show_until is null or show_from is null or show_until > show_from)
);

create or replace function public.pacto_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists pactonews_touch on public.pacto_news;
create trigger pactonews_touch before update on public.pacto_news
for each row execute function public.pacto_touch_updated_at();
drop trigger if exists pactoigs_touch on public.pacto_igs;
create trigger pactoigs_touch before update on public.pacto_igs
for each row execute function public.pacto_touch_updated_at();

create index if not exists pacto_news_public_idx on public.pacto_news(is_published, published_at desc);
create index if not exists pacto_igs_public_idx on public.pacto_igs(is_active, is_featured, sort_order);

alter table public.pacto_news enable row level security;
alter table public.pacto_igs enable row level security;

drop policy if exists "Ler noticias publicadas" on public.pacto_news;
create policy "Ler noticias publicadas" on public.pacto_news
for select to anon, authenticated
using (is_published = true and (published_at is null or published_at <= now()));

drop policy if exists "Administradores gerenciam noticias" on public.pacto_news;
create policy "Administradores gerenciam noticias" on public.pacto_news
for all to authenticated using ((select public.is_pacto_admin()))
with check ((select public.is_pacto_admin()));

drop policy if exists "Ler IGs em destaque no periodo" on public.pacto_igs;
create policy "Ler IGs em destaque no periodo" on public.pacto_igs
for select to anon, authenticated
using (
  is_active and is_featured
  and (show_from is null or show_from <= now())
  and (show_until is null or show_until > now())
);

drop policy if exists "Administradores gerenciam IGs" on public.pacto_igs;
create policy "Administradores gerenciam IGs" on public.pacto_igs
for all to authenticated using ((select public.is_pacto_admin()))
with check ((select public.is_pacto_admin()));

revoke all on public.pacto_news, public.pacto_igs from anon, authenticated;
grant select on public.pacto_news, public.pacto_igs to anon;
grant select, insert, update, delete on public.pacto_news, public.pacto_igs to authenticated;

-- Bucket público: apenas leitura pública; alterações restritas a admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pacto-media', 'pacto-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Pacto media leitura" on storage.objects;
create policy "Pacto media leitura" on storage.objects
for select to anon, authenticated using (bucket_id = 'pacto-media');

drop policy if exists "Pacto media upload admin" on storage.objects;
create policy "Pacto media upload admin" on storage.objects
for insert to authenticated with check (bucket_id = 'pacto-media' and (select public.is_pacto_admin()));

drop policy if exists "Pacto media atualizar admin" on storage.objects;
create policy "Pacto media atualizar admin" on storage.objects
for update to authenticated using (bucket_id = 'pacto-media' and (select public.is_pacto_admin()))
with check (bucket_id = 'pacto-media' and (select public.is_pacto_admin()));

drop policy if exists "Pacto media excluir admin" on storage.objects;
create policy "Pacto media excluir admin" on storage.objects
for delete to authenticated using (bucket_id = 'pacto-media' and (select public.is_pacto_admin()));

-- IMPORTANTE: criar manualmente um usuário em Authentication > Users e depois
-- executar o comando abaixo substituindo o UUID exato do usuário cadastrado:
-- insert into public.pacto_admins (user_id) values ('UUID-DO-USUARIO-AQUI');
-- Não habilite cadastro público para administradores.
