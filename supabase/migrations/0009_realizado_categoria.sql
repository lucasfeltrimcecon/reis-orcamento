-- =========================================================================
-- Fase 11 -- Filtro persistente de categorias.
-- Guarda a categoria (normalizada) em cada linha de realizado, para o painel
-- poder esconder categorias marcadas como "ignorar" em mapa_categoria, sem
-- precisar reimportar. Idempotente. ASCII-only.
-- =========================================================================

alter table public.realizado add column if not exists categoria_norm text;
create index if not exists realizado_categoria_idx
  on public.realizado (empresa_id, tipo, categoria_norm);

-- Reescreve o realizado de UM mes, agora gravando categoria_norm.
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
    (empresa_id, area_id, ano, mes, descricao, valor, tipo, categoria_norm, importacao_id)
  select
    p_empresa_id,
    nullif(l->>'area_id', '')::uuid,
    p_ano,
    p_mes,
    coalesce(l->>'descricao', ''),
    (l->>'valor')::numeric,
    l->>'tipo',
    nullif(l->>'categoria_norm', ''),
    p_importacao_id
  from jsonb_array_elements(p_linhas) l;

  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$func$;
