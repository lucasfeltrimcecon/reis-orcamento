"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";

export async function definirCategoria(payload: {
  empresaId: string;
  tipo: "receita" | "despesa";
  categoriaNorm: string;
  ignorar: boolean;
}): Promise<{ ok?: boolean; erro?: string }> {
  await requireMaster();
  const { empresaId, tipo, categoriaNorm, ignorar } = payload;
  if (!empresaId || !tipo || !categoriaNorm) return { erro: "Dados inválidos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("mapa_categoria")
    .update({ ignorar })
    .eq("empresa_id", empresaId)
    .eq("tipo", tipo)
    .eq("categoria_norm", categoriaNorm);
  if (error) return { erro: "Falha ao salvar." };

  revalidatePath(`/empresas/${empresaId}/categorias`);
  revalidatePath("/painel");
  return { ok: true };
}
