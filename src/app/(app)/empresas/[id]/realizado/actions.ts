"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";
import { parseRealizadoXlsx } from "@/lib/xlsx";

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type ImportRealizadoState = { erro?: string };

type LinhaRpc = {
  area_id: string | null;
  mes: number;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
};

export async function importarRealizadoXlsx(
  _prev: ImportRealizadoState,
  formData: FormData,
): Promise<ImportRealizadoState> {
  await requireMaster();

  const empresaId = String(formData.get("empresaId") ?? "");
  const ano = Number(formData.get("ano"));
  const file = formData.get("arquivo") as File | null;

  if (!empresaId || !ano) return { erro: "Empresa ou ano inválidos." };
  if (!file || file.size === 0) return { erro: "Selecione um arquivo." };

  const parsed = parseRealizadoXlsx(await file.arrayBuffer());
  if (!parsed.ok) return { erro: parsed.erro };

  // Toda DESPESA precisa de área (senão sumiria dos relógios mas contaria no Gastou).
  const semArea = parsed.linhas.filter((l) => l.tipo === "despesa" && !l.area);
  if (semArea.length > 0) {
    return {
      erro: `${semArea.length} linha(s) de despesa estão sem Área. Toda despesa precisa de uma área para entrar no relógio.`,
    };
  }

  const supabase = await createClient();

  const { data: areas, error: errAreas } = await supabase
    .from("areas")
    .select("id, nome, ordem")
    .eq("empresa_id", empresaId);
  if (errAreas) return { erro: "Falha ao ler as áreas. Tente novamente." };

  const mapa = new Map((areas ?? []).map((a) => [normalizar(a.nome), a.id]));
  let proximaOrdem = (areas ?? []).reduce((m, a) => Math.max(m, a.ordem), -1) + 1;

  // Cria em lote as áreas de despesa que ainda não existem.
  const nomesNovos = new Map<string, string>(); // normalizado -> nome original
  for (const l of parsed.linhas) {
    if (l.tipo !== "despesa") continue;
    const k = normalizar(l.area);
    if (!mapa.has(k) && !nomesNovos.has(k)) nomesNovos.set(k, l.area);
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

  const linhas: LinhaRpc[] = [];
  for (const linha of parsed.linhas) {
    const areaId =
      linha.tipo === "despesa" ? (mapa.get(normalizar(linha.area)) ?? null) : null;

    // Salvaguarda: despesa precisa ter resolvido área.
    if (linha.tipo === "despesa" && !areaId) {
      return { erro: "Não consegui vincular uma despesa a uma área. Tente novamente." };
    }

    for (let mes = 1; mes <= 12; mes++) {
      const valor = linha.valores[mes - 1] ?? 0;
      if (valor === 0) continue;
      linhas.push({
        area_id: areaId,
        mes,
        descricao: linha.descricao,
        valor,
        tipo: linha.tipo,
      });
    }
  }

  if (linhas.length === 0) return { erro: "Nada para importar." };

  const importacaoId = randomUUID();
  const { error } = await supabase.rpc("substituir_realizado_ano", {
    p_empresa_id: empresaId,
    p_ano: ano,
    p_linhas: linhas,
    p_importacao_id: importacaoId,
  });

  if (error) return { erro: "Falha ao salvar no banco. Tente novamente." };

  revalidatePath(`/empresas/${empresaId}/realizado`);
  redirect(`/empresas/${empresaId}/realizado?ano=${ano}`);
}
