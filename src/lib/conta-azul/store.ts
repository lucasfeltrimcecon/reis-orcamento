import { createClient } from "@/lib/supabase/server";
import type { CaApp } from "./oauth";

export type Conexao = {
  id: string;
  empresa_id: string;
  apelido: string;
  conta_azul_nome: string | null;
  expires_at: string;
  created_at: string;
};

/** Config do app (client_id/secret/scope). null se ainda não configurado. */
export async function getCaApp(): Promise<CaApp | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conta_azul_app")
    .select("client_id, client_secret, scope")
    .maybeSingle();
  return (data as CaApp | null) ?? null;
}

export async function temSecret(): Promise<boolean> {
  const app = await getCaApp();
  return !!app?.client_secret;
}

export async function listConexoes(): Promise<Conexao[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conta_azul_conexao")
    .select("id, empresa_id, apelido, conta_azul_nome, expires_at, created_at")
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
    .select("id, empresa_id, apelido, conta_azul_nome, expires_at, created_at")
    .eq("empresa_id", empresaId)
    .order("created_at");
  return (data ?? []) as Conexao[];
}
