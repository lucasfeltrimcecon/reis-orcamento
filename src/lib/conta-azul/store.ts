import { createClient } from "@/lib/supabase/server";

export type ConexaoStatus = "pendente" | "ativa";

/** View de listagem — NUNCA expõe client_secret/tokens. */
export type Conexao = {
  id: string;
  empresa_id: string;
  apelido: string;
  conta_azul_nome: string | null;
  status: ConexaoStatus;
  client_id: string | null; // só pra exibir "configurado", não é segredo
  expires_at: string | null;
  created_at: string;
};

/** Linha completa com credenciais — uso server-only (OAuth/reautorizar/sync). */
export type ConexaoCompleta = {
  id: string;
  empresa_id: string;
  apelido: string;
  client_id: string | null;
  client_secret: string | null;
  scope: string | null;
};

const LIST_COLS =
  "id, empresa_id, apelido, conta_azul_nome, status, client_id, expires_at, created_at";

/** Todas as conexões (resumo global). */
export async function listConexoes(): Promise<Conexao[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conta_azul_conexao")
    .select(LIST_COLS)
    .order("created_at");
  return (data ?? []) as Conexao[];
}

/** Bases de UMA empresa (a tela de conexão vive dentro da empresa). */
export async function listConexoesEmpresa(
  empresaId: string,
): Promise<Conexao[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conta_azul_conexao")
    .select(LIST_COLS)
    .eq("empresa_id", empresaId)
    .order("created_at");
  return (data ?? []) as Conexao[];
}

/** Credenciais de uma base pelo id (p/ reautorizar). */
export async function getConexao(id: string): Promise<ConexaoCompleta | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conta_azul_conexao")
    .select("id, empresa_id, apelido, client_id, client_secret, scope")
    .eq("id", id)
    .maybeSingle();
  return (data as ConexaoCompleta | null) ?? null;
}

/** Credenciais de uma base pelo state do OAuth (p/ o callback trocar o code). */
export async function getConexaoPorState(
  state: string,
): Promise<ConexaoCompleta | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conta_azul_conexao")
    .select("id, empresa_id, apelido, client_id, client_secret, scope")
    .eq("oauth_state", state)
    .maybeSingle();
  return (data as ConexaoCompleta | null) ?? null;
}

/**
 * Cria uma base 'pendente' (credenciais salvas, sem token) e devolve o state
 * do OAuth. Antes, apaga pendências órfãs da mesma empresa+apelido.
 */
export async function criarConexaoPendente(input: {
  empresaId: string;
  apelido: string;
  clientId: string;
  clientSecret: string;
  scope: string | null;
  conectadoPor: string;
  oauthState: string;
}): Promise<string | null> {
  const supabase = await createClient();
  await supabase
    .from("conta_azul_conexao")
    .delete()
    .eq("empresa_id", input.empresaId)
    .eq("apelido", input.apelido)
    .eq("status", "pendente");

  const { error } = await supabase.from("conta_azul_conexao").insert({
    empresa_id: input.empresaId,
    apelido: input.apelido,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    scope: input.scope,
    status: "pendente",
    oauth_state: input.oauthState,
    conectado_por: input.conectadoPor,
  });
  return error?.message ?? null;
}

/** Grava um novo state numa base já existente (p/ reautorizar). */
export async function definirOauthState(
  id: string,
  state: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("conta_azul_conexao")
    .update({ oauth_state: state })
    .eq("id", id);
}

/** Finaliza a conexão: grava tokens, marca 'ativa', limpa o state. */
export async function finalizarConexao(
  id: string,
  tok: {
    access_token: string;
    refresh_token: string;
    expires_at: string;
    scope: string | null;
    conta_azul_nome?: string | null;
  },
): Promise<string | null> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    expires_at: tok.expires_at,
    scope: tok.scope,
    status: "ativa",
    oauth_state: null,
    updated_at: new Date().toISOString(),
  };
  if (tok.conta_azul_nome !== undefined) patch.conta_azul_nome = tok.conta_azul_nome;
  const { error } = await supabase
    .from("conta_azul_conexao")
    .update(patch)
    .eq("id", id);
  return error?.message ?? null;
}
