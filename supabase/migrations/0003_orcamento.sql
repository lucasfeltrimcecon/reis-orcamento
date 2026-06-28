-- =========================================================================
-- Fase 3 — Orçamento (orçado por área × mês × ano)
-- Uma linha por (empresa, área, ano, mês). Simétrico com o realizado.
-- Depende de 0002 (empresas, areas) e 0001 (is_master).
-- =========================================================================

create table if not exists public.orcamento (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  area_id     uuid not null references public.areas(id) on delete cascade,
  ano         integer not null check (ano between 2020 and 2100),
  mes         integer not null check (mes between 1 and 12),
  valor       numeric(14,2) not null default 0,
  updated_at  timestamptz not null default now(),
  unique (empresa_id, area_id, ano, mes)
);
create index if not exists orcamento_empresa_ano_idx on public.orcamento (empresa_id, ano, mes);

alter table public.orcamento enable row level security;
drop policy if exists "master full orcamento" on public.orcamento;
create policy "master full orcamento"
  on public.orcamento for all
  using (public.is_master()) with check (public.is_master());
