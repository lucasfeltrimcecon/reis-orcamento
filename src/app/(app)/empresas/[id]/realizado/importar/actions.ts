"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";
import {
  parseContaAzul,
  normalizarTexto,
  sugereIgnorar,
  type ItemContaAzul,
} from "@/lib/contaazul";

export type PreviewItem = {
  tipo: "receita" | "despesa";
  categoriaNorm: string;
  categoria: string;
  valor: number;
  area: string | null; // Centro de Custo (despesa)
  areaExiste: boolean;
  ignorar: boolean;
  isNew: boolean;
};

export type AnaliseResult = {
  erro?: string;
  ano?: number;
  mes?: number;
  itens?: PreviewItem[];
};

async function mergeArquivos(
  files: File[],
  tipo: "receita" | "despesa",
): Promise<Map<string, ItemContaAzul>> {
  const map = new Map<string, ItemContaAzul>();
  for (const f of files) {
    if (!f || f.size === 0) continue;
    const r = parseContaAzul(await f.arrayBuffer(), tipo);
    if (!r.ok) throw new Error(r.erro ?? "Falha ao ler arquivo.");
    for (const it of r.itens) {
      const e = map.get(it.categoriaNorm);
      if (e) {
        e.valor += it.valor;
        if (!e.area && it.area) e.area = it.area;
      } else {
        map.set(it.categoriaNorm, { ...it });
      }
    }
  }
  return map;
}

export async function analisarContaAzul(
  _prev: AnaliseResult,
  formData: FormData,
): Promise<AnaliseResult> {
  await requireMaster();

  const empresaId = String(formData.get("empresaId") ?? "");
  const ano = Number(formData.get("ano"));
  const mes = Number(formData.get("mes"));
  if (!empresaId || !ano || !mes) return { erro: "Empresa, ano ou mês inválidos." };

  const desp = formData.getAll("despesa").filter((x): x is File => x instanceof File && x.size > 0);
  const rec = formData.getAll("receita").filter((x): x is File => x instanceof File && x.size > 0);
  if (desp.length === 0 && rec.length === 0) {
    return { erro: "Selecione ao menos um arquivo de receita ou despesa." };
  }

  let despMap: Map<string, ItemContaAzul>;
  let recMap: Map<string, ItemContaAzul>;
  try {
    despMap = await mergeArquivos(desp, "despesa");
    recMap = await mergeArquivos(rec, "receita");
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Falha ao ler os arquivos." };
  }

  const supabase = await createClient();
  const [{ data: areas }, { data: mapa }] = await Promise.all([
    supabase.from("areas").select("id, nome").eq("empresa_id", empresaId),
    supabase
      .from("mapa_categoria")
      .select("tipo, categoria_norm, ignorar")
      .eq("empresa_id", empresaId),
  ]);

  const areaNorms = new Set((areas ?? []).map((a) => normalizarTexto(a.nome)));
  const chave = (tipo: string, cn: string) => `${tipo}:${cn}`;
  const salvos = new Map(
    (mapa ?? []).map((m) => [chave(m.tipo, m.categoria_norm), m.ignorar as boolean]),
  );

  const itens: PreviewItem[] = [];
  const grupos: [PreviewItem["tipo"], Map<string, ItemContaAzul>][] = [
    ["despesa", despMap],
    ["receita", recMap],
  ];
  for (const [tipo, m] of grupos) {
    for (const it of m.values()) {
      const salvo = salvos.get(chave(tipo, it.categoriaNorm));
      const isNew = salvo === undefined;
      const ignorar = isNew ? sugereIgnorar(it.categoria) : salvo;
      itens.push({
        tipo,
        categoriaNorm: it.categoriaNorm,
        categoria: it.categoria,
        valor: it.valor,
        area: it.area,
        areaExiste: it.area ? areaNorms.has(normalizarTexto(it.area)) : false,
        ignorar,
        isNew,
      });
    }
  }

  return { ano, mes, itens };
}

export async function confirmarContaAzul(payload: {
  empresaId: string;
  ano: number;
  mes: number;
  itens: PreviewItem[];
}): Promise<{ erro?: string; ok?: boolean }> {
  await requireMaster();

  const { empresaId, ano, mes, itens } = payload;
  if (!empresaId || !ano || !mes || !Array.isArray(itens)) {
    return { erro: "Dados inválidos." };
  }

  const supabase = await createClient();

  // 1) Salva as decisões no mapa de categorias
  const mapaRows = itens.map((it) => ({
    empresa_id: empresaId,
    tipo: it.tipo,
    categoria_norm: it.categoriaNorm,
    categoria_label: it.categoria,
    ignorar: !!it.ignorar,
  }));
  if (mapaRows.length > 0) {
    const { error } = await supabase
      .from("mapa_categoria")
      .upsert(mapaRows, { onConflict: "empresa_id,tipo,categoria_norm" });
    if (error) return { erro: "Falha ao salvar o mapa de categorias." };
  }

  // 2) Resolve/cria as áreas (Centro de Custo) das despesas incluídas
  const { data: areas } = await supabase
    .from("areas")
    .select("id, nome, ordem")
    .eq("empresa_id", empresaId);
  const areaMap = new Map((areas ?? []).map((a) => [normalizarTexto(a.nome), a.id]));
  let ordem = (areas ?? []).reduce((m, a) => Math.max(m, a.ordem), -1) + 1;

  const novas = new Map<string, string>();
  for (const it of itens) {
    if (it.tipo !== "despesa" || it.ignorar) continue;
    const nome = it.area || "Sem área";
    const k = normalizarTexto(nome);
    if (!areaMap.has(k) && !novas.has(k)) novas.set(k, nome);
  }
  if (novas.size > 0) {
    const ins = [...novas.values()].map((nome) => ({
      empresa_id: empresaId,
      nome,
      ordem: ordem++,
    }));
    const { data: criadas, error } = await supabase
      .from("areas")
      .insert(ins)
      .select("id, nome");
    if (error) return { erro: "Falha ao criar áreas novas." };
    for (const c of criadas ?? []) areaMap.set(normalizarTexto(c.nome), c.id);
  }

  // 3) Monta as linhas do realizado (só as incluídas)
  const linhas: {
    area_id: string | null;
    descricao: string;
    valor: number;
    tipo: string;
  }[] = [];
  for (const it of itens) {
    if (it.ignorar) continue;
    if (it.tipo === "despesa") {
      const areaId = areaMap.get(normalizarTexto(it.area || "Sem área")) ?? null;
      linhas.push({ area_id: areaId, descricao: it.categoria, valor: it.valor, tipo: "despesa" });
    } else {
      linhas.push({ area_id: null, descricao: it.categoria, valor: it.valor, tipo: "receita" });
    }
  }

  // 4) Reescreve SÓ o mês (atômico)
  const importacaoId = randomUUID();
  const { error } = await supabase.rpc("substituir_realizado_mes", {
    p_empresa_id: empresaId,
    p_ano: ano,
    p_mes: mes,
    p_linhas: linhas,
    p_importacao_id: importacaoId,
  });
  if (error) return { erro: "Falha ao salvar no banco." };

  revalidatePath(`/empresas/${empresaId}/realizado`);
  return { ok: true };
}
