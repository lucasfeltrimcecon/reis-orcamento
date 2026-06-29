-- =========================================================================
-- Fase 10 -- Documentos: pastas + documentos + fechamentos + Storage (RLS)
-- Depende de 0007 (minhas_empresas) e 0002 (empresas). Idempotente. ASCII-only.
-- =========================================================================

-- 1) Pastas (arvore por empresa)
create table if not exists public.pastas (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  parent_id  uuid references public.pastas(id) on delete cascade,
  nome       text not null,
  ordem      integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists pastas_empresa_idx on public.pastas (empresa_id, parent_id);
alter table public.pastas enable row level security;

drop policy if exists "master full pastas" on public.pastas;
create policy "master full pastas" on public.pastas for all
  using (public.is_master()) with check (public.is_master());
drop policy if exists "membro le pastas" on public.pastas;
create policy "membro le pastas" on public.pastas for select
  using (empresa_id = any(public.minhas_empresas()));

-- 2) Documentos (metadados; binario vive no Storage)
create table if not exists public.documentos (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  pasta_id      uuid references public.pastas(id) on delete set null,
  categoria     text not null check (categoria in ('mapeamento','fechamento','documento')),
  titulo        text not null,
  ano           integer check (ano between 2020 and 2100),
  mes           integer check (mes between 1 and 12),
  storage_path  text not null unique,
  mime          text,
  tamanho_bytes bigint,
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now()
);
create index if not exists documentos_empresa_idx on public.documentos (empresa_id, categoria);
create index if not exists documentos_pasta_idx on public.documentos (pasta_id);
alter table public.documentos enable row level security;

drop policy if exists "master full documentos" on public.documentos;
create policy "master full documentos" on public.documentos for all
  using (public.is_master()) with check (public.is_master());
drop policy if exists "membro le documentos" on public.documentos;
create policy "membro le documentos" on public.documentos for select
  using (empresa_id = any(public.minhas_empresas()));

-- 3) Fechamentos mensais (resumo + anexo opcional + status)
create table if not exists public.fechamentos (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references public.empresas(id) on delete cascade,
  ano          integer not null check (ano between 2020 and 2100),
  mes          integer not null check (mes between 1 and 12),
  resumo       text not null default '',
  documento_id uuid references public.documentos(id) on delete set null,
  status       text not null default 'rascunho' check (status in ('rascunho','publicado')),
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (empresa_id, ano, mes)
);
create index if not exists fechamentos_empresa_idx on public.fechamentos (empresa_id, ano, mes);
alter table public.fechamentos enable row level security;

drop policy if exists "master full fechamentos" on public.fechamentos;
create policy "master full fechamentos" on public.fechamentos for all
  using (public.is_master()) with check (public.is_master());
-- Cliente so ve fechamentos PUBLICADOS (rascunho fica escondido).
drop policy if exists "membro le fechamentos" on public.fechamentos;
create policy "membro le fechamentos" on public.fechamentos for select
  using (empresa_id = any(public.minhas_empresas()) and status = 'publicado');

-- 4) Storage: bucket privado + policies por prefixo do path = empresa_id
insert into storage.buckets (id, name, public, file_size_limit)
values ('documentos', 'documentos', false, 26214400)
on conflict (id) do nothing;

drop policy if exists "doc master all" on storage.objects;
create policy "doc master all" on storage.objects for all
  using (bucket_id = 'documentos' and public.is_master())
  with check (bucket_id = 'documentos' and public.is_master());

drop policy if exists "doc membro select" on storage.objects;
create policy "doc membro select" on storage.objects for select
  using (
    bucket_id = 'documentos'
    and ((storage.foldername(name))[1])::uuid = any(public.minhas_empresas())
  );
