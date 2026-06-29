-- =========================================================================
-- Fase 15 -- Integracao Conta Azul: config do app (em tela) + N bases/empresa.
-- conta_azul_app: credenciais do app (client_id/secret/scope), linha unica.
-- conta_azul_conexao: refeita para 1:N (uma empresa pode ter varias bases CA).
-- So master acessa. Idempotente. ASCII-only.
-- =========================================================================

-- App (singleton: sempre 1 linha; id boolean fixo em true)
create table if not exists public.conta_azul_app (
  id            boolean primary key default true check (id),
  client_id     text not null,
  client_secret text not null,
  scope         text,
  updated_at    timestamptz not null default now()
);
alter table public.conta_azul_app enable row level security;
drop policy if exists "master full ca_app" on public.conta_azul_app;
create policy "master full ca_app" on public.conta_azul_app for all
  using (public.is_master()) with check (public.is_master());

-- Conexoes: 1:N por empresa (a tabela 0011 estava vazia)
drop table if exists public.conta_azul_conexao;
create table public.conta_azul_conexao (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas(id) on delete cascade,
  apelido         text not null default 'Conta Azul',
  access_token    text not null,
  refresh_token   text not null,
  expires_at      timestamptz not null,
  scope           text,
  conta_azul_nome text,
  conectado_por   uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists conta_azul_conexao_empresa_idx
  on public.conta_azul_conexao (empresa_id);

alter table public.conta_azul_conexao enable row level security;
drop policy if exists "master full ca_conexao" on public.conta_azul_conexao;
create policy "master full ca_conexao" on public.conta_azul_conexao for all
  using (public.is_master()) with check (public.is_master());
