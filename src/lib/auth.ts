import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Garante que há um usuário autenticado com papel master.
 * Defesa em profundidade: Server Actions não passam pelos layouts, então
 * cada mutação valida explicitamente, além do RLS no banco.
 * Retorna o id do usuário master.
 */
export async function requireMaster(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isMaster } = await supabase.rpc("is_master");
  if (!isMaster) redirect("/login");

  return user.id;
}

export type Acesso = {
  userId: string;
  email: string;
  isMaster: boolean;
  empresaIds: string[]; // vazio para master (vê todas via RLS)
};

/**
 * Garante acesso à área logada: autenticado E (master OU vinculado a ao menos
 * uma empresa). Master vê tudo; cliente é escopado pelo RLS às empresas dele.
 * Quem não tem vínculo nenhum cai em /sem-acesso (fora do grupo (app), para
 * não entrar em loop de redirecionamento).
 */
export async function requireAcesso(): Promise<Acesso> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: isMaster } = await supabase.rpc("is_master");
  if (isMaster) {
    return { userId: user.id, email: user.email ?? "", isMaster: true, empresaIds: [] };
  }

  const { data: empresas } = await supabase.rpc("minhas_empresas");
  const empresaIds = (empresas as string[] | null) ?? [];
  if (empresaIds.length === 0) redirect("/sem-acesso");

  return { userId: user.id, email: user.email ?? "", isMaster: false, empresaIds };
}
