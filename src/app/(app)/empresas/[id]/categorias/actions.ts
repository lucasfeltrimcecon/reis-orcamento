"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";

export type Classe = "normal" | "informativo" | "oculto";

export async function definirClasse(payload: {
  empresaId: string;
  tipo: "receita" | "despesa";
  categoriaNorm: string;
  classe: Classe;
}): Promise<{ ok?: boolean; erro?: string }> {
  await requireMaster();
  const { empresaId, tipo, categoriaNorm, classe } = payload;
  if (!empresaId || !tipo || !categoriaNorm) return { erro: "Dados inválidos." };
  if (!["normal", "informativo", "oculto"].includes(classe)) {
    return { erro: "Classe inválida." };
  }

  const supabase = await createClient();
  // ignorar fica derivado de classe (compat com código legado).
  const { error } = await supabase
    .from("mapa_categoria")
    .update({ classe, ignorar: classe === "oculto" })
    .eq("empresa_id", empresaId)
    .eq("tipo", tipo)
    .eq("categoria_norm", categoriaNorm);
  if (error) return { erro: "Falha ao salvar." };

  revalidatePath(`/empresas/${empresaId}/categorias`);
  revalidatePath("/painel");
  return { ok: true };
}
