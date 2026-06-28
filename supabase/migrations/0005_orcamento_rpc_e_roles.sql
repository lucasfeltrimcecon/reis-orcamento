-- =========================================================================
-- Fase 4/5 (pós-revisão) — RPC atômica de orçamento + correção de papéis
-- =========================================================================

-- 1) Reescrita atômica do orçamento do ano (simétrico ao realizado)
create or replace function public.substituir_orcamento_ano(
  p_empresa_id uuid,
  p_ano integer,
  p_linhas jsonb
) returns integer
language plpgsql
security invoker
set search_path = public
as $func$
declare
  v_qtd integer;
begin
  delete from public.orcamento
    where empresa_id = p_empresa_id and ano = p_ano;

  insert into public.orcamento (empresa_id, area_id, ano, mes, valor)
  select
    p_empresa_id,
    (l->>'area_id')::uuid,
    p_ano,
    (l->>'mes')::integer,
    (l->>'valor')::numeric
  from jsonb_array_elements(p_linhas) l;

  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$func$;

-- 2) Papel padrão = cliente (master só por allowlist explícita)
alter table public.profiles alter column role set default 'cliente';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_role text;
begin
  if new.email = 'lucas@reisaceleradora.com' then
    v_role := 'master';
  else
    v_role := 'cliente';
  end if;
  insert into public.profiles (id, email, role)
  values (new.id, new.email, v_role)
  on conflict (id) do nothing;
  return new;
end;
$func$;

-- 3) Garante o usuário master atual
update public.profiles set role = 'master'
  where email = 'lucas@reisaceleradora.com';
