-- =========================================================================
-- Fase 2 — Empresas + Áreas (centros de custo)
-- Rodar no Supabase: SQL Editor → New query → colar → Run.
-- Depende de 0001 (precisa da função public.is_master()).
-- Idempotente.
-- =========================================================================

create table if not exists public.empresas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now(),
  created_by  uuid not null references auth.users(id)
);

create table if not exists public.areas (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  nome        text not null,
  ordem       integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (empresa_id, nome)
);
create index if not exists areas_empresa_idx on public.areas (empresa_id);

-- RLS deny-by-default; só MASTER acessa (cliente entra na V2 com política própria)
alter table public.empresas enable row level security;
alter table public.areas    enable row level security;

drop policy if exists "master full empresas" on public.empresas;
create policy "master full empresas"
  on public.empresas for all
  using (public.is_master()) with check (public.is_master());

drop policy if exists "master full areas" on public.areas;
create policy "master full areas"
  on public.areas for all
  using (public.is_master()) with check (public.is_master());
