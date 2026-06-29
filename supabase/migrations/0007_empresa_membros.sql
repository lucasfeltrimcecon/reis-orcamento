-- =========================================================================
-- Fase 8 — Multi-tenant: empresa_membros + minhas_empresas() + RLS de membro
-- Depende de 0001 (is_master, profiles) e 0002 (empresas).
-- Idempotente. ASCII-only. Rodar via Management API.
-- =========================================================================

-- 1) Vinculo usuario <-> empresa
create table if not exists public.empresa_membros (
  user_id    uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, empresa_id)
);
create index if not exists empresa_membros_empresa_idx
  on public.empresa_membros (empresa_id);

alter table public.empresa_membros enable row level security;

-- 2) Helper: empresas do usuario atual, como uuid[].
--    SECURITY DEFINER e OBRIGATORIO: a funcao le empresa_membros ignorando o
--    RLS da propria tabela, quebrando a recursao infinita que apareceria se as
--    policies de outras tabelas (que chamam esta funcao) reentrasse aqui.
--    STABLE: mesmo resultado na transacao. search_path fixo: blinda hijack.
create or replace function public.minhas_empresas()
returns uuid[]
language sql
security definer
stable
set search_path = public
as $func$
  select coalesce(array_agg(empresa_id), array[]::uuid[])
  from public.empresa_membros
  where user_id = auth.uid();
$func$;

-- 3) RLS de empresa_membros: leitura DIRETA do proprio vinculo (nunca chama o
--    helper, senao recursao) + master total.
drop policy if exists "self read membros" on public.empresa_membros;
create policy "self read membros"
  on public.empresa_membros for select
  using (user_id = auth.uid());

drop policy if exists "master full membros" on public.empresa_membros;
create policy "master full membros"
  on public.empresa_membros for all
  using (public.is_master()) with check (public.is_master());

-- 4) Policies de SELECT para membros nas tabelas de dados.
--    Permissivas: combinam por OR com as policies "master full" existentes.
--    Membros recebem APENAS select (sem insert/update/delete em lugar nenhum).
drop policy if exists "membro le empresas" on public.empresas;
create policy "membro le empresas"
  on public.empresas for select
  using (id = any(public.minhas_empresas()));

drop policy if exists "membro le areas" on public.areas;
create policy "membro le areas"
  on public.areas for select
  using (empresa_id = any(public.minhas_empresas()));

drop policy if exists "membro le orcamento" on public.orcamento;
create policy "membro le orcamento"
  on public.orcamento for select
  using (empresa_id = any(public.minhas_empresas()));

drop policy if exists "membro le realizado" on public.realizado;
create policy "membro le realizado"
  on public.realizado for select
  using (empresa_id = any(public.minhas_empresas()));

drop policy if exists "membro le mapa_categoria" on public.mapa_categoria;
create policy "membro le mapa_categoria"
  on public.mapa_categoria for select
  using (empresa_id = any(public.minhas_empresas()));

-- 5) profiles: master le todos (tela de usuarios). Mantem "read own profile".
drop policy if exists "master le profiles" on public.profiles;
create policy "master le profiles"
  on public.profiles for select
  using (public.is_master());
