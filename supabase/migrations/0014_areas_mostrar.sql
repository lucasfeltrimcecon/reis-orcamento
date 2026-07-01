-- =========================================================================
-- Parte 1 -- Centros de custo visiveis. `mostrar` controla se a area (centro
-- de custo) aparece no painel. Area oculta sai do painel INTEIRO (relogios +
-- total de despesa/resultado), igual as categorias. Aditivo. ASCII-only.
-- =========================================================================

alter table public.areas
  add column if not exists mostrar boolean not null default true;
