import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { normalizarTexto, sugereIgnorar } from "@/lib/contaazul";
import {
  buscarMes,
  getConexoesTokensEmpresa,
  type EventoCA,
} from "./api";

// Motor de sincronização Conta Azul -> realizado.
// Reusa EXATAMENTE a lógica do import por arquivo: agrega por categoria
// (receita) ou (categoria, centro de custo) (despesa), valor = "pago"
// (magnitude), e grava via RPC substituir_realizado_mes.

export type LinhaSync = {
  tipo: "receita" | "despesa";
  categoria: string;
  categoriaNorm: string;
  area: string | null; // centro de custo (só despesa)
  valor: number;
};

export type LinhaPreview = LinhaSync & {
  ignorar: boolean; // fora do painel?
  isNew: boolean; // categoria nova (ainda não está em mapa_categoria)
};

export type BaseResumo = {
  apelido: string;
  receita: number;
  despesa: number;
  erro?: string;
};

export type AnaliseSync = {
  ano: number;
  mes: number;
  bases: BaseResumo[];
  linhas: LinhaPreview[];
  totalReceita: number; // só "no painel" (exclui ignoradas)
  totalDespesa: number;
  totalReceitaBruto: number; // tudo que veio
  totalDespesaBruto: number;
};

/** Agrega eventos da API no mesmo esquema do parser de arquivo. */
function agregar(
  eventos: EventoCA[],
  tipo: "receita" | "despesa",
  acc: Map<string, LinhaSync>,
): void {
  for (const ev of eventos) {
    const valor = Math.abs(Number(ev.pago) || 0);
    if (valor === 0) continue;

    const categoria = (ev.categorias?.[0]?.nome ?? "").trim() || "Sem categoria";
    const categoriaNorm = normalizarTexto(categoria);

    let area: string | null = null;
    if (tipo === "despesa") {
      const cc = (ev.centros_de_custo?.[0]?.nome ?? "").trim();
      area = cc || null;
    }

    const chave =
      tipo === "despesa"
        ? `despesa|${categoriaNorm}|${normalizarTexto(area ?? "")}`
        : `receita|${categoriaNorm}`;

    const e = acc.get(chave);
    if (e) e.valor += valor;
    else acc.set(chave, { tipo, categoria, categoriaNorm, area, valor });
  }
}

/** Puxa todas as bases ativas da empresa, agrega e monta a prévia. */
export async function analisarSync(
  empresaId: string,
  ano: number,
  mes: number,
): Promise<AnaliseSync> {
  const conexoes = await getConexoesTokensEmpresa(empresaId);
  const acc = new Map<string, LinhaSync>();
  const bases: BaseResumo[] = [];

  for (const con of conexoes) {
    try {
      const { receita, despesa } = await buscarMes(con, ano, mes);
      agregar(receita, "receita", acc);
      agregar(despesa, "despesa", acc);
      const somaPago = (lista: EventoCA[]) =>
        lista.reduce((s, e) => s + Math.abs(Number(e.pago) || 0), 0);
      bases.push({
        apelido: con.apelido,
        receita: somaPago(receita),
        despesa: somaPago(despesa),
      });
    } catch (err) {
      bases.push({
        apelido: con.apelido,
        receita: 0,
        despesa: 0,
        erro: (err as Error).message,
      });
    }
  }

  // Decora com isNew/ignorar (a partir do mapa_categoria existente).
  const supabase = await createClient();
  const { data: mapaRows } = await supabase
    .from("mapa_categoria")
    .select("tipo, categoria_norm, ignorar")
    .eq("empresa_id", empresaId);
  const mapa = new Map(
    (mapaRows ?? []).map((m) => [
      `${m.tipo}:${m.categoria_norm}`,
      m.ignorar as boolean,
    ]),
  );

  const linhas: LinhaPreview[] = [...acc.values()]
    .map((l) => {
      const k = `${l.tipo}:${l.categoriaNorm}`;
      const existe = mapa.has(k);
      const ignorar = existe
        ? (mapa.get(k) as boolean)
        : sugereIgnorar(l.categoria);
      return { ...l, ignorar, isNew: !existe };
    })
    .sort((a, b) => b.valor - a.valor);

  const soma = (tipo: string, soIncluidas: boolean) =>
    linhas
      .filter((l) => l.tipo === tipo && (!soIncluidas || !l.ignorar))
      .reduce((s, l) => s + l.valor, 0);

  return {
    ano,
    mes,
    bases,
    linhas,
    totalReceita: soma("receita", true),
    totalDespesa: soma("despesa", true),
    totalReceitaBruto: soma("receita", false),
    totalDespesaBruto: soma("despesa", false),
  };
}

export type SyncResumo = {
  ano: number;
  mes: number;
  bases: BaseResumo[];
  totalReceita: number; // no painel (exclui ignoradas)
  totalDespesa: number;
  totalReceitaBruto: number;
  totalDespesaBruto: number;
  qtd: number; // linhas gravadas
  novas: { tipo: "receita" | "despesa"; categoria: string }[]; // categorias novas
};

/**
 * Sincroniza um mês de uma vez: puxa das bases, aplica Categorias ativas
 * (persistidas) e grava direto no realizado. Sem gate de confirmação — a
 * curadoria é a tela de Categorias ativas.
 */
export async function sincronizarMes(
  empresaId: string,
  ano: number,
  mes: number,
): Promise<SyncResumo> {
  const a = await analisarSync(empresaId, ano, mes);

  // categorias novas (deduplicadas) só p/ avisar — já entram com sugestão
  const vistas = new Set<string>();
  const novas: { tipo: "receita" | "despesa"; categoria: string }[] = [];
  for (const l of a.linhas) {
    if (!l.isNew) continue;
    const k = `${l.tipo}:${l.categoriaNorm}`;
    if (vistas.has(k)) continue;
    vistas.add(k);
    novas.push({ tipo: l.tipo, categoria: l.categoria });
  }

  const linhas: LinhaSync[] = a.linhas.map((l) => ({
    tipo: l.tipo,
    categoria: l.categoria,
    categoriaNorm: l.categoriaNorm,
    area: l.area,
    valor: l.valor,
  }));
  const r = await salvarSync(empresaId, ano, mes, linhas);
  if (!r.ok) throw new Error(r.erro ?? "Falha ao gravar no realizado.");

  return {
    ano,
    mes,
    bases: a.bases,
    totalReceita: a.totalReceita,
    totalDespesa: a.totalDespesa,
    totalReceitaBruto: a.totalReceitaBruto,
    totalDespesaBruto: a.totalDespesaBruto,
    qtd: r.qtd ?? 0,
    novas,
  };
}

/** Grava no realizado (mesmo caminho do import: categorias/áreas + RPC). */
export async function salvarSync(
  empresaId: string,
  ano: number,
  mes: number,
  linhas: LinhaSync[],
): Promise<{ ok: boolean; erro?: string; qtd?: number }> {
  const supabase = await createClient();

  // 1) registra categorias novas (ignorar = sugestão inicial)
  const { data: existentes } = await supabase
    .from("mapa_categoria")
    .select("tipo, categoria_norm")
    .eq("empresa_id", empresaId);
  const jaSalvas = new Set(
    (existentes ?? []).map((m) => `${m.tipo}:${m.categoria_norm}`),
  );
  const seen = new Set<string>();
  const novasCategorias = [];
  for (const l of linhas) {
    const k = `${l.tipo}:${l.categoriaNorm}`;
    if (jaSalvas.has(k) || seen.has(k)) continue;
    seen.add(k);
    novasCategorias.push({
      empresa_id: empresaId,
      tipo: l.tipo,
      categoria_norm: l.categoriaNorm,
      categoria_label: l.categoria,
      ignorar: sugereIgnorar(l.categoria),
    });
  }
  if (novasCategorias.length > 0) {
    const { error } = await supabase
      .from("mapa_categoria")
      .insert(novasCategorias);
    if (error) return { ok: false, erro: "Falha ao registrar categorias." };
  }

  // 2) cria áreas faltantes (despesa -> centro de custo)
  const { data: areas } = await supabase
    .from("areas")
    .select("id, nome, ordem")
    .eq("empresa_id", empresaId);
  const areaMap = new Map(
    (areas ?? []).map((a) => [normalizarTexto(a.nome), a.id]),
  );
  let ordem = (areas ?? []).reduce((m, a) => Math.max(m, a.ordem), -1) + 1;
  const novasAreas = new Map<string, string>();
  for (const l of linhas) {
    if (l.tipo !== "despesa") continue;
    const nome = l.area || "Sem área";
    const k = normalizarTexto(nome);
    if (!areaMap.has(k) && !novasAreas.has(k)) novasAreas.set(k, nome);
  }
  if (novasAreas.size > 0) {
    const ins = [...novasAreas.values()].map((nome) => ({
      empresa_id: empresaId,
      nome,
      ordem: ordem++,
    }));
    const { data: criadas, error } = await supabase
      .from("areas")
      .insert(ins)
      .select("id, nome");
    if (error) return { ok: false, erro: "Falha ao criar áreas." };
    for (const c of criadas ?? []) areaMap.set(normalizarTexto(c.nome), c.id);
  }

  // 3) monta linhas do realizado (todas; o filtro é no painel)
  const rows = linhas.map((l) => ({
    area_id:
      l.tipo === "despesa"
        ? (areaMap.get(normalizarTexto(l.area || "Sem área")) ?? null)
        : null,
    descricao: l.categoria,
    valor: l.valor,
    tipo: l.tipo,
    categoria_norm: l.categoriaNorm,
  }));

  // 4) grava atômico (reescreve o mês)
  const { error } = await supabase.rpc("substituir_realizado_mes", {
    p_empresa_id: empresaId,
    p_ano: ano,
    p_mes: mes,
    p_linhas: rows,
    p_importacao_id: randomUUID(),
  });
  if (error) return { ok: false, erro: "Falha ao gravar no realizado." };

  return { ok: true, qtd: rows.length };
}
