import { createClient } from "@/lib/supabase/server";
import type { Documento, Fechamento, Pasta } from "@/lib/types";

export async function listPastas(empresaId: string): Promise<Pasta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pastas")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("ordem")
    .order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listDocumentos(empresaId: string): Promise<Documento[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getFechamentos(empresaId: string): Promise<Fechamento[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fechamentos")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
