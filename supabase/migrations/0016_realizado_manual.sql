-- =========================================================================
-- Parte 3 -- Lancamentos manuais. `manual` marca linhas lancadas na mao;
-- `classe` guarda a classificacao (normal/informativo) da linha manual
-- (linhas sincronizadas deixam classe nula e herdam do mapa_categoria).
-- A RPC de sincronizacao passa a NAO apagar as linhas manuais do mes.
-- Aditivo + recria a funcao. ASCII-only. $func$ dollar-quoting.
-- =========================================================================

alter table public.realizado
  add column if not exists manual boolean not null default false;

alter table public.realizado
  add column if not exists classe text
    check (classe is null or classe in ('normal','informativo','oculto'));

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
  -- apaga so o que veio de import/sync (preserva os lancamentos manuais)
  delete from public.realizado
    where empresa_id = p_empresa_id and ano = p_ano and mes = p_mes
      and coalesce(manual, false) = false;

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
