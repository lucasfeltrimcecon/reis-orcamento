"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseOrcamentoXlsx } from "@/lib/xlsx";

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

type LinhaUpsert = {
  empresa_id: string;
  area_id: string;
  ano: number;
  mes: number;
  valor: number;
};

/** Salva os valores digitados no formulário (grid área × mês). */
export async function salvarOrcamentoForm(formData: FormData) {
  const empresaId = String(formData.get("empresaId") ?? "");
  const ano = Number(formData.get("ano"));
  if (!empresaId || !ano) return;

  const supabase = await createClient();
  const { data: areas } = await supabase
    .from("areas")
    .select("id")
    .eq("empresa_id", empresaId);

  const rows: LinhaUpsert[] = [];
  for (const a of areas ?? []) {
    for (let mes = 1; mes <= 12; mes++) {
      const raw = formData.get(`v_${a.id}_${mes}`);
      const valor = Number(String(raw ?? "0").replace(",", ".")) || 0;
      rows.push({ empresa_id: empresaId, area_id: a.id, ano, mes, valor });
    }
  }

  if (rows.length > 0) {
    await supabase
      .from("orcamento")
      .upsert(rows, { onConflict: "empresa_id,area_id,ano,mes" });
  }

  revalidatePath(`/empresas/${empresaId}/orcamento`);
  redirect(`/empresas/${empresaId}/orcamento?ano=${ano}`);
}

export type ImportState = {
  erro?: string;
};

/** Importa um .xlsx (Área | Jan..Dez) e reescreve o orçamento daquelas áreas no ano. */
export async function importarOrcamentoXlsx(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const empresaId = String(formData.get("empresaId") ?? "");
  const ano = Number(formData.get("ano"));
  const file = formData.get("arquivo") as File | null;

  if (!empresaId || !ano) return { erro: "Empresa ou ano inválidos." };
  if (!file || file.size === 0) return { erro: "Selecione um arquivo." };

  const parsed = parseOrcamentoXlsx(await file.arrayBuffer());
  if (!parsed.ok) return { erro: parsed.erro };

  const supabase = await createClient();

  // Áreas existentes (mapa nome-normalizado → id)
  const { data: areas } = await supabase
    .from("areas")
    .select("id, nome, ordem")
    .eq("empresa_id", empresaId);

  const mapa = new Map((areas ?? []).map((a) => [normalizar(a.nome), a.id]));
  let proximaOrdem = (areas ?? []).reduce((m, a) => Math.max(m, a.ordem), -1) + 1;

  const rows: LinhaUpsert[] = [];
  for (const linha of parsed.linhas) {
    let areaId = mapa.get(normalizar(linha.area));

    // Área não cadastrada → cria automaticamente
    if (!areaId) {
      const { data: nova } = await supabase
        .from("areas")
        .insert({
          empresa_id: empresaId,
          nome: linha.area,
          ordem: proximaOrdem++,
        })
        .select("id")
        .single();
      if (!nova) continue;
      areaId = nova.id;
      mapa.set(normalizar(linha.area), areaId);
    }

    for (let mes = 1; mes <= 12; mes++) {
      rows.push({
        empresa_id: empresaId,
        area_id: areaId,
        ano,
        mes,
        valor: linha.valores[mes - 1] ?? 0,
      });
    }
  }

  if (rows.length === 0) return { erro: "Nada para importar." };

  const { error } = await supabase
    .from("orcamento")
    .upsert(rows, { onConflict: "empresa_id,area_id,ano,mes" });

  if (error) return { erro: "Falha ao salvar no banco. Tente novamente." };

  revalidatePath(`/empresas/${empresaId}/orcamento`);
  redirect(`/empresas/${empresaId}/orcamento?ano=${ano}`);
}
