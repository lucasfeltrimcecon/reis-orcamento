"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";

export async function desconectarBase(formData: FormData) {
  await requireMaster();
  const id = String(formData.get("id") ?? "");
  const empresaId = String(formData.get("empresaId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("conta_azul_conexao").delete().eq("id", id);
  if (empresaId) revalidatePath(`/empresas/${empresaId}/integracoes`);
  revalidatePath("/integracoes");
}
