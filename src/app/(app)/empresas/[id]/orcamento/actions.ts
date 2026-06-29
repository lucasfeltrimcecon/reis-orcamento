"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";
import { parseOrcamentoXlsx } from "@/lib/xlsx";

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
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
  await requireMaster();

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
    const { error } = await supabase
      .from("orcamento")
      .upsert(rows, { onConflict: "empresa_id,area_id,ano,mes" });
    if (error)
      throw new Error("Não foi possível salvar o orçamento. Tente de novo.");
  }

  revalidatePath(`/empresas/${empresaId}/orcamento`);
  redirect(`/empresas/${empresaId}/orcamento?ano=${ano}`);
}

export type ImportState = {
  erro?: string;
};

/** Importa um .xlsx (Área | Jan..Dez) e REESCREVE todo o orçamento do ano (atômico). */
export async function importarOrcamentoXlsx(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireMaster();

  const empresaId = String(formData.get("empresaId") ?? "");
  const ano = Number(formData.get("ano"));
  const file = formData.get("arquivo") as File | null;

  if (!empresaId || !ano) return { erro: "Empresa ou ano inválidos." };
  if (!file || file.size === 0) return { erro: "Selecione um arquivo." };

  const parsed = parseOrcamentoXlsx(await file.arrayBuffer());
  if (!parsed.ok) return { erro: parsed.erro };

  const supabase = await createClient();

  const { data: areas, error: errAreas } = await supabase
    .from("areas")
    .select("id, nome, ordem")
    .eq("empresa_id", empresaId);
  if (errAreas) return { erro: "Falha ao ler as áreas. Tente novamente." };

  const mapa = new Map((areas ?? []).map((a) => [normalizar(a.nome), a.id]));
  let proximaOrdem = (areas ?? []).reduce((m, a) => Math.max(m, a.ordem), -1) + 1;

  // Cria em lote as áreas que ainda não existem.
  const nomesNovos = new Map<string, string>();
  for (const l of parsed.linhas) {
    const k = normalizar(l.area);
    if (k && !mapa.has(k) && !nomesNovos.has(k)) nomesNovos.set(k, l.area);
  }
  if (nomesNovos.size > 0) {
    const novas = Array.from(nomesNovos.values()).map((nome) => ({
      empresa_id: empresaId,
      nome,
      ordem: proximaOrdem++,
    }));
    const { data: criadas, error: errCriar } = await supabase
      .from("areas")
      .insert(novas)
      .select("id, nome");
    if (errCriar) return { erro: "Falha ao criar áreas novas. Tente novamente." };
    for (const c of criadas ?? []) mapa.set(normalizar(c.nome), c.id);
  }

  const linhas: { area_id: string; mes: number; valor: number }[] = [];
  for (const linha of parsed.linhas) {
    const areaId = mapa.get(normalizar(linha.area));
    if (!areaId) continue;
    for (let mes = 1; mes <= 12; mes++) {
      linhas.push({ area_id: areaId, mes, valor: linha.valores[mes - 1] ?? 0 });
    }
  }

  if (linhas.length === 0) return { erro: "Nada para importar." };

  const { error } = await supabase.rpc("substituir_orcamento_ano", {
    p_empresa_id: empresaId,
    p_ano: ano,
    p_linhas: linhas,
  });
  if (error) return { erro: "Falha ao salvar no banco. Tente novamente." };

  revalidatePath(`/empresas/${empresaId}/orcamento`);
  redirect(`/empresas/${empresaId}/orcamento?ano=${ano}`);
}
