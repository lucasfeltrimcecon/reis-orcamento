"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";
import { parseMetasXlsx } from "@/lib/xlsx";
import { METRICAS_META } from "@/lib/metas";

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

  const { error } = await supabase
    .from("metas")
    .upsert(rows, { onConflict: "empresa_id,ano,mes" });
  if (error) throw new Error("Não foi possível salvar as metas. Tente de novo.");

  revalidatePath(`/empresas/${empresaId}/metas`);
  revalidatePath("/painel");
  redirect(`/empresas/${empresaId}/metas?ano=${ano}`);
}

export type ImportMetasState = { erro?: string };

/** Importa um .xlsx (Métrica | Jan..Dez) e REESCREVE as metas do ano. */
export async function importarMetasXlsx(
  _prev: ImportMetasState,
  formData: FormData,
): Promise<ImportMetasState> {
  await requireMaster();

  const empresaId = String(formData.get("empresaId") ?? "");
  const ano = Number(formData.get("ano"));
  const file = formData.get("arquivo") as File | null;

  if (!empresaId || !ano) return { erro: "Empresa ou ano inválidos." };
  if (!file || file.size === 0) return { erro: "Selecione um arquivo." };

  const parsed = parseMetasXlsx(await file.arrayBuffer());
  if (!parsed.ok) return { erro: parsed.erro };

  const supabase = await createClient();
  const valor = (campo: (typeof METRICAS_META)[number]["campo"], mes: number) =>
    parsed.valores[campo]?.[mes - 1] ?? 0;

  const rows = [];
  for (let mes = 1; mes <= 12; mes++) {
    rows.push({
      empresa_id: empresaId,
      ano,
      mes,
      meta_receita: valor("meta_receita", mes),
      meta_resultado: valor("meta_resultado", mes),
      meta_margem: valor("meta_margem", mes),
      meta_caixa: valor("meta_caixa", mes),
      caixa_real: valor("caixa_real", mes),
      updated_at: new Date().toISOString(),
    });
  }

  const { error } = await supabase
    .from("metas")
    .upsert(rows, { onConflict: "empresa_id,ano,mes" });
  if (error) return { erro: "Falha ao salvar no banco. Tente novamente." };

  revalidatePath(`/empresas/${empresaId}/metas`);
  revalidatePath("/painel");
  redirect(`/empresas/${empresaId}/metas?ano=${ano}`);
}
