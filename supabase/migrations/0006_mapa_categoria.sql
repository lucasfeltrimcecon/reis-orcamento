-- =========================================================================
-- Fase 7 — Mapa de categorias (de-para/filtro por empresa) + reescrita por mês
-- =========================================================================

create table if not exists public.mapa_categoria (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references public.empresas(id) on delete cascade,
  tipo            text not null check (tipo in ('receita', 'despesa')),
  categoria_norm  text not null,
  categoria_label text not null,
  ignorar         boolean not null default false,
  updated_at      timestamptz not null default now(),
  unique (empresa_id, tipo, categoria_norm)
);
create index if not exists mapa_categoria_empresa_idx
  on public.mapa_categoria (empresa_id, tipo);

alter table public.mapa_categoria enable row level security;
drop policy if exists "master full mapa_categoria" on public.mapa_categoria;
create policy "master full mapa_categoria"
  on public.mapa_categoria for all
  using (public.is_master()) with check (public.is_master());

-- Reescreve o realizado de UM mês (delete + insert atômico)
create or replace function public.substituir_realizado_mes(
  p_empresa_id uuid,
  p_ano integer,
  p_mes integer,
  p_linhas jsonb,
  p_importacao_id uuid
) returns integer
language plpgsql
security invoker
set search_path = public
as $func$
declare
  v_qtd integer;
begin
  delete from public.realizado
    where empresa_id = p_empresa_id and ano = p_ano and mes = p_mes;

  insert into public.realizado
    (empresa_id, area_id, ano, mes, descricao, valor, tipo, importacao_id)
  select
    p_empresa_id,
    nullif(l->>'area_id', '')::uuid,
    p_ano,
    p_mes,
    coalesce(l->>'descricao', ''),
    (l->>'valor')::numeric,
    l->>'tipo',
    p_importacao_id
  from jsonb_array_elements(p_linhas) l;

  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$func$;
