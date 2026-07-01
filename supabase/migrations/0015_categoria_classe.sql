-- =========================================================================
-- Parte 2 -- Classificacao da categoria em 3 estados.
--   normal      = conta no resultado/margem (cards Faturou/Gastou).
--   informativo = aparece so no card "Informativo" (nao soma em nada).
--   oculto      = fora do painel.
-- Migra do ignorar (true -> oculto). Mantem a coluna ignorar por compat
-- (derivada = classe='oculto'). Aditivo. ASCII-only.
-- =========================================================================

alter table public.mapa_categoria
  add column if not exists classe text not null default 'normal'
    check (classe in ('normal','informativo','oculto'));

update public.mapa_categoria set classe = 'oculto' where ignorar = true;
