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
