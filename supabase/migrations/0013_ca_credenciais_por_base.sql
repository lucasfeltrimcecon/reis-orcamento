-- =========================================================================
-- Fase 15.1b -- Conta Azul: credenciais POR BASE (sem app global).
-- Cada conexao vira uma integracao autocontida: apelido + client_id +
-- client_secret + scope + tokens. O app global (singleton) e removido.
-- Tokens viram nullable (linha 'pendente' nasce sem token; vira 'ativa' no
-- callback do OAuth). state opaco guardado em oauth_state.
-- So master acessa. Idempotente. ASCII-only.
-- =========================================================================

alter table public.conta_azul_conexao
  add column if not exists client_id     text,
  add column if not exists client_secret text,
  add column if not exists status        text not null default 'ativa'
    check (status in ('pendente','ativa')),
  add column if not exists oauth_state    text;

-- tokens so existem depois do OAuth concluir
alter table public.conta_azul_conexao alter column access_token  drop not null;
alter table public.conta_azul_conexao alter column refresh_token drop not null;
alter table public.conta_azul_conexao alter column expires_at    drop not null;

create index if not exists conta_azul_conexao_oauth_state_idx
  on public.conta_azul_conexao (oauth_state);

-- comecar do zero: as conexoes atuais foram feitas com o modelo errado
delete from public.conta_azul_conexao;

-- app global deixa de existir (credenciais agora sao por base)
drop table if exists public.conta_azul_app;
