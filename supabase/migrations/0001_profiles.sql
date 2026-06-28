-- =========================================================================
-- Fase 1 — Profiles + helper is_master()
-- Rodar no Supabase: Painel → SQL Editor → New query → colar este arquivo → Run.
-- Idempotente (pode rodar mais de uma vez sem erro).
-- =========================================================================

-- Tabela de perfis (1:1 com auth.users; controla papel)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        text not null default 'master' check (role in ('master', 'cliente')),
  created_at  timestamptz not null default now()
);

-- Trigger: ao criar usuário em auth.users, criar profile com role='master'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'master')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS deny-by-default em profiles
alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Helper: usuário atual é MASTER? Usado por todas as outras políticas.
create or replace function public.is_master()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'master'
  );
$$;

-- Backfill: se já existe usuário em auth.users sem profile, cria.
insert into public.profiles (id, email, role)
select id, email, 'master'
from auth.users
on conflict (id) do nothing;
