-- =========================================================================
-- Fase 12 -- Metas de topo (receita, resultado, margem%, caixa) por empresa/mes.
-- caixa_real = caixa gerado REALIZADO, lancado manualmente (nao vem do Conta
-- Azul). As outras realizadas saem do realizado/painel. Idempotente. ASCII-only.
-- =========================================================================

create table if not exists public.metas (
  id             uuid primary key default gen_random_uuid(),
  empresa_id     uuid not null references public.empresas(id) on delete cascade,
  ano            integer not null check (ano between 2020 and 2100),
  mes            integer not null check (mes between 1 and 12),
  meta_receita   numeric(14,2) not null default 0,
  meta_resultado numeric(14,2) not null default 0,
  meta_margem    numeric(6,2)  not null default 0, -- percentual (ex: 30 = 30%)
  meta_caixa     numeric(14,2) not null default 0,
  caixa_real     numeric(14,2) not null default 0, -- realizado manual
  updated_at     timestamptz not null default now(),
  unique (empresa_id, ano, mes)
);
create index if not exists metas_empresa_ano_idx on public.metas (empresa_id, ano);

alter table public.metas enable row level security;

drop policy if exists "master full metas" on public.metas;
create policy "master full metas" on public.metas for all
  using (public.is_master()) with check (public.is_master());

drop policy if exists "membro le metas" on public.metas;
create policy "membro le metas" on public.metas for select
  using (empresa_id = any(public.minhas_empresas()));
