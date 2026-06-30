import "server-only";
import { createClient } from "@/lib/supabase/server";
import { refreshToken, type CaCreds } from "./oauth";

// Cliente da API financeira do Conta Azul (puxa receita/despesa de um mês).
const API_BASE =
  "https://api-v2.contaazul.com/v1/financeiro/eventos-financeiros";

/** Um lançamento (conta a receber/pagar) como a API devolve. */
export type EventoCA = {
  id: string;
  status: string; // "ACQUITTED" = pago/recebido
  total: number;
  pago: number;
  descricao: string;
  data_vencimento: string;
  data_competencia: string;
  categorias: { id: string; nome: string }[];
  centros_de_custo: { id: string; nome: string }[];
};

export type ConexaoTokens = {
  id: string;
  empresa_id: string;
  apelido: string;
  client_id: string | null;
  client_secret: string | null;
  scope: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

const COLS_TOKENS =
  "id, empresa_id, apelido, client_id, client_secret, scope, access_token, refresh_token, expires_at";

/** Conexão com tokens+credenciais (server-only) p/ sincronizar. */
export async function getConexaoTokens(
  id: string,
): Promise<ConexaoTokens | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conta_azul_conexao")
    .select(COLS_TOKENS)
    .eq("id", id)
    .maybeSingle();
  return (data as ConexaoTokens | null) ?? null;
}

/** Todas as bases ATIVAS de uma empresa (p/ sincronizar a empresa toda). */
export async function getConexoesTokensEmpresa(
  empresaId: string,
): Promise<ConexaoTokens[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conta_azul_conexao")
    .select(COLS_TOKENS)
    .eq("empresa_id", empresaId)
    .eq("status", "ativa")
    .order("created_at");
  return (data ?? []) as ConexaoTokens[];
}

/**
 * Garante um access_token válido. Se expirou (margem de 60s), renova e
 * PERSISTE a rotação (access + refresh novos) — senão o refresh de uso único
 * se perde e a base "quebra" em 1h.
 */
export async function tokenValido(con: ConexaoTokens): Promise<string> {
  const exp = con.expires_at ? new Date(con.expires_at).getTime() : 0;
  if (con.access_token && exp - 60_000 > Date.now()) return con.access_token;

  if (!con.client_id || !con.client_secret || !con.refresh_token) {
    throw new Error("Base sem credenciais salvas — reautorize a conexão.");
  }
  const creds: CaCreds = {
    client_id: con.client_id,
    client_secret: con.client_secret,
    scope: con.scope,
  };
  const tok = await refreshToken(creds, con.refresh_token);
  const expiresAt = new Date(
    Date.now() + (tok.expires_in ?? 3600) * 1000,
  ).toISOString();

  const supabase = await createClient();
  await supabase
    .from("conta_azul_conexao")
    .update({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expires_at: expiresAt,
      scope: tok.scope ?? con.scope ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", con.id);

  return tok.access_token;
}

type Pagina = { itens?: EventoCA[]; itens_totais?: number };

async function buscarTipo(
  token: string,
  tipo: "contas-a-receber" | "contas-a-pagar",
  de: string,
  ate: string,
): Promise<EventoCA[]> {
  const TAM = 200;
  const url = (p: number) =>
    `${API_BASE}/${tipo}/buscar?data_vencimento_de=${de}&data_vencimento_ate=${ate}&pagina=${p}&tamanho_pagina=${TAM}`;

  async function pega(p: number): Promise<Pagina> {
    const res = await fetch(url(p), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Conta Azul ${tipo}: HTTP ${res.status}`);
    return (await res.json()) as Pagina;
  }

  // Página 1 revela o total → busca as demais em lotes (não estoura timeout).
  const primeira = await pega(1);
  const itens: EventoCA[] = [...(primeira.itens ?? [])];
  const total = primeira.itens_totais ?? itens.length;
  const nPaginas = Math.min(60, Math.ceil(total / TAM));

  const restantes: number[] = [];
  for (let p = 2; p <= nPaginas; p++) restantes.push(p);

  const LIMITE = 6;
  for (let i = 0; i < restantes.length; i += LIMITE) {
    const lote = restantes.slice(i, i + LIMITE);
    const res = await Promise.all(lote.map(pega));
    for (const r of res) itens.push(...(r.itens ?? []));
  }
  return itens;
}

/** Puxa receita + despesa de um mês (por data de vencimento). */
export async function buscarMes(
  con: ConexaoTokens,
  ano: number,
  mes: number,
): Promise<{ receita: EventoCA[]; despesa: EventoCA[] }> {
  const token = await tokenValido(con);
  const mm = String(mes).padStart(2, "0");
  const de = `${ano}-${mm}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const ate = `${ano}-${mm}-${String(ultimoDia).padStart(2, "0")}`;

  const [receita, despesa] = await Promise.all([
    buscarTipo(token, "contas-a-receber", de, ate),
    buscarTipo(token, "contas-a-pagar", de, ate),
  ]);
  return { receita, despesa };
}
