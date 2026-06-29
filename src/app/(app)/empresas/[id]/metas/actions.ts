"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";

function toNum(v: FormDataEntryValue | null): number {
  return Number(String(v ?? "0").replace(",", ".")) || 0;
}

export async function salvarMetas(formData: FormData) {
  await requireMaster();

  const empresaId = String(formData.get("empresaId") ?? "");
  const ano = Number(formData.get("ano"));
  if (!empresaId || !ano) return;

  const supabase = await createClient();
  const rows = [];
  for (let mes = 1; mes <= 12; mes++) {
    rows.push({
      empresa_id: empresaId,
      ano,
      mes,
      meta_receita: toNum(formData.get(`meta_receita_${mes}`)),
      meta_resultado: toNum(formData.get(`meta_resultado_${mes}`)),
      meta_margem: toNum(formData.get(`meta_margem_${mes}`)),
      meta_caixa: toNum(formData.get(`meta_caixa_${mes}`)),
      caixa_real: toNum(formData.get(`caixa_real_${mes}`)),
      updated_at: new Date().toISOString(),
    });
  }

  await supabase
    .from("metas")
    .upsert(rows, { onConflict: "empresa_id,ano,mes" });

  revalidatePath(`/empresas/${empresaId}/metas`);
  revalidatePath("/painel");
  redirect(`/empresas/${empresaId}/metas?ano=${ano}`);
}
