-- =========================================================================
-- Fase 4 — Realizado (área × descrição × mês), por tipo (receita/despesa)
-- area_id NULLABLE: linhas de receita podem não ter área de despesa.
-- valor = magnitude positiva; o tipo diz se entra ou sai.
-- =========================================================================

create table if not exists public.realizado (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  area_id       uuid references public.areas(id) on delete set null,
  ano           integer not null check (ano between 2020 and 2100),
  mes           integer not null check (mes between 1 and 12),
  descricao     text not null default '',
  valor         numeric(14,2) not null,
  tipo          text not null check (tipo in ('receita', 'despesa')),
  importacao_id uuid not null,
  importado_em  timestamptz not null default now()
);
create index if not exists realizado_empresa_ano_idx on public.realizado (empresa_id, ano, mes);
create index if not exists realizado_area_idx on public.realizado (empresa_id, area_id, ano, mes);

alter table public.realizado enable row level security;
drop policy if exists "master full realizado" on public.realizado;
create policy "master full realizado"
  on public.realizado for all
  using (public.is_master()) with check (public.is_master());

-- RPC atômica: reescreve TODO o realizado de um ano (delete + insert na mesma transação)
create or replace function public.substituir_realizado_ano(
  p_empresa_id uuid,
  p_ano integer,
  p_linhas jsonb,
  p_importacao_id uuid
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_qtd integer;
begin
  delete from public.realizado
    where empresa_id = p_empresa_id and ano = p_ano;

  insert into public.realizado
    (empresa_id, area_id, ano, mes, descricao, valor, tipo, importacao_id)
  select
    p_empresa_id,
    nullif(l->>'area_id', '')::uuid,
    p_ano,
    (l->>'mes')::integer,
    coalesce(l->>'descricao', ''),
    (l->>'valor')::numeric,
    l->>'tipo',
    p_importacao_id
  from jsonb_array_elements(p_linhas) l;

  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;
