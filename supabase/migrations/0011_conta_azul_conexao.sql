-- =========================================================================
-- Fase 15 -- Integracao Conta Azul: conexao OAuth por empresa.
-- Guarda os tokens (sensiveis) de cada conta conectada. SO master acessa
-- (cliente nunca le tokens). O cron de sync usa o client service-role.
-- Idempotente. ASCII-only.
-- =========================================================================

create table if not exists public.conta_azul_conexao (
  empresa_id      uuid primary key references public.empresas(id) on delete cascade,
  access_token    text not null,
  refresh_token   text not null,
  expires_at      timestamptz not null,
  scope           text,
  conta_azul_nome text,                                  -- identificacao da conta conectada
  conectado_por   uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.conta_azul_conexao enable row level security;

-- Apenas master. Sem policy de membro -> cliente nunca le os tokens.
drop policy if exists "master full ca_conexao" on public.conta_azul_conexao;
create policy "master full ca_conexao" on public.conta_azul_conexao for all
  using (public.is_master()) with check (public.is_master());
