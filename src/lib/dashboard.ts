import { createClient } from "@/lib/supabase/server";

export type Modo = "mes" | "acumulado";

export type GaugeArea = {
  areaId: string;
  nome: string;
  orcado: number;
  realizado: number;
  execPct: number | null; // realizado/orcado * 100; null se orçado = 0
  cor: "y" | "r"; // amarelo (<100%) | vermelho (>=100% ou não planejado)
  naoPlanejado: boolean; // orçado = 0 mas houve gasto
};

export type MetaKPI = {
  realizado: number;
  meta: number;
  pct: number | null; // realizado / meta (null se meta = 0)
};

export type PainelMetas = {
  temMetas: boolean;
  receita: MetaKPI;
  resultado: MetaKPI;
  caixa: MetaKPI; // caixa gerado (realizado manual)
  margem: { realizado: number | null; meta: number }; // ambos em % (ex: 30)
};

export type PainelData = {
  faturou: number;
  gastou: number;
  resultado: number;
  margemMensal: number | null; // resultado/faturou do período
  margemAcumulada: number | null; // resultado/faturou de Jan..mesRef
  totalOrcado: number;
  totalRealizado: number; // = gastou (despesa)
  execGeral: number | null;
  informativo: { receita: number; despesa: number }; // não soma no resultado
  areas: GaugeArea[];
  metas: PainelMetas;
};

type OrcRow = { area_id: string; mes: number; valor: number };
type RealRow = {
  area_id: string | null;
  mes: number;
  valor: number;
  tipo: "receita" | "despesa";
  categoria_norm: string | null;
  classe: string | null; // override da linha (lançamento manual); null herda do mapa
};

function noPeriodo(mes: number, mesRef: number, modo: Modo): boolean {
  return modo === "mes" ? mes === mesRef : mes >= 1 && mes <= mesRef;
}

export async function getPainel(
  empresaId: string,
  ano: number,
  mesRef: number,
  modo: Modo,
): Promise<PainelData> {
  const supabase = await createClient();

  const [
    { data: areas },
    { data: orcRows },
    { data: realRows },
    { data: classeRows },
    { data: metaRows },
  ] = await Promise.all([
    supabase
      .from("areas")
      .select("id, nome, ordem, mostrar")
      .eq("empresa_id", empresaId)
      .order("ordem")
      .order("nome"),
    supabase
      .from("orcamento")
      .select("area_id, mes, valor")
      .eq("empresa_id", empresaId)
      .eq("ano", ano),
    supabase
      .from("realizado")
      .select("area_id, mes, valor, tipo, categoria_norm, classe")
      .eq("empresa_id", empresaId)
      .eq("ano", ano),
    supabase
      .from("mapa_categoria")
      .select("tipo, categoria_norm, classe")
      .eq("empresa_id", empresaId),
    supabase
      .from("metas")
      .select("mes, meta_receita, meta_resultado, meta_margem, meta_caixa, caixa_real")
      .eq("empresa_id", empresaId)
      .eq("ano", ano),
  ]);

  const orc = (orcRows ?? []) as OrcRow[];
  const real = (realRows ?? []) as RealRow[];

  // Classe da categoria: normal (conta), informativo (só card), oculto (fora).
  const classeCat = new Map<string, "normal" | "informativo" | "oculto">(
    (classeRows ?? []).map((m) => [
      `${m.tipo}:${m.categoria_norm}`,
      (m.classe ?? "normal") as "normal" | "informativo" | "oculto",
    ]),
  );
  const classeDe = (r: RealRow): "normal" | "informativo" | "oculto" => {
    // Lançamento manual carrega a própria classe; senão herda do mapa_categoria.
    if (r.classe === "normal" || r.classe === "informativo" || r.classe === "oculto")
      return r.classe;
    return r.categoria_norm
      ? (classeCat.get(`${r.tipo}:${r.categoria_norm}`) ?? "normal")
      : "normal";
  };

  // Centro de custo oculto sai do painel INTEIRO (total + relógios).
  const ocultas = new Set(
    (areas ?? []).filter((a) => !a.mostrar).map((a) => a.id),
  );
  const areaOculta = (r: RealRow) =>
    r.tipo === "despesa" && r.area_id !== null && ocultas.has(r.area_id);
  // Conta nos KPIs de resultado: normal + centro de custo visível.
  const contaNormal = (r: RealRow) => classeDe(r) === "normal" && !areaOculta(r);

  // --- KPIs do período ---
  let faturou = 0;
  let gastou = 0;
  let receitaInfo = 0;
  let despesaInfo = 0;
  for (const r of real) {
    if (!noPeriodo(r.mes, mesRef, modo)) continue;
    const c = classeDe(r);
    if (c === "oculto") continue;
    if (areaOculta(r)) continue; // centro de custo oculto: fora do painel INTEIRO
    if (c === "informativo") {
      if (r.tipo === "receita") receitaInfo += Number(r.valor);
      else despesaInfo += Number(r.valor);
      continue;
    }
    if (r.tipo === "receita") faturou += Number(r.valor);
    else gastou += Number(r.valor);
  }
  const resultado = faturou - gastou;
  const margemMensal = faturou > 0 ? resultado / faturou : null;

  // --- Margem acumulada (sempre Jan..mesRef) ---
  let faturouAcum = 0;
  let gastouAcum = 0;
  for (const r of real) {
    if (!contaNormal(r)) continue;
    if (r.mes < 1 || r.mes > mesRef) continue;
    if (r.tipo === "receita") faturouAcum += Number(r.valor);
    else gastouAcum += Number(r.valor);
  }
  const margemAcumulada =
    faturouAcum > 0 ? (faturouAcum - gastouAcum) / faturouAcum : null;

  // --- Por área (despesa) ---
  const orcPorArea = new Map<string, number>();
  for (const o of orc) {
    if (!noPeriodo(o.mes, mesRef, modo)) continue;
    orcPorArea.set(o.area_id, (orcPorArea.get(o.area_id) ?? 0) + Number(o.valor));
  }

  const realPorArea = new Map<string, number>();
  for (const r of real) {
    if (!contaNormal(r)) continue;
    if (r.tipo !== "despesa" || !r.area_id) continue;
    if (!noPeriodo(r.mes, mesRef, modo)) continue;
    realPorArea.set(
      r.area_id,
      (realPorArea.get(r.area_id) ?? 0) + Number(r.valor),
    );
  }

  const gauges: GaugeArea[] = [];
  for (const a of areas ?? []) {
    if (!a.mostrar) continue; // centro de custo oculto não vira relógio
    // Orçado é guardado com o sinal que o usuário digitou (despesa = negativo).
    // No painel usamos a MAGNITUDE para comparar com o realizado (gasto).
    const orcado = Math.abs(orcPorArea.get(a.id) ?? 0);
    const realizado = realPorArea.get(a.id) ?? 0;
    if (orcado === 0 && realizado === 0) continue; // sem dados → não mostra
    const naoPlanejado = orcado === 0 && realizado > 0;
    const execPct = orcado > 0 ? (realizado / orcado) * 100 : null;
    const cor: "y" | "r" =
      naoPlanejado || (execPct !== null && execPct >= 100) ? "r" : "y";
    gauges.push({
      areaId: a.id,
      nome: a.nome,
      orcado,
      realizado,
      execPct,
      cor,
      naoPlanejado,
    });
  }

  const totalOrcado = gauges.reduce((s, g) => s + g.orcado, 0);
  const totalRealizado = gastou;
  const execGeral = totalOrcado > 0 ? gastou / totalOrcado : null;

  // --- Metas de topo (Meta × Realizado) ---
  type MetaRow = {
    mes: number;
    meta_receita: number;
    meta_resultado: number;
    meta_margem: number;
    meta_caixa: number;
    caixa_real: number;
  };
  const mrows = (metaRows ?? []) as MetaRow[];
  let metaReceita = 0,
    metaResultado = 0,
    metaCaixa = 0,
    caixaReal = 0;
  for (const m of mrows) {
    if (!noPeriodo(m.mes, mesRef, modo)) continue;
    metaReceita += Number(m.meta_receita);
    metaResultado += Number(m.meta_resultado);
    metaCaixa += Number(m.meta_caixa);
    caixaReal += Number(m.caixa_real);
  }
  // Margem é percentual (não soma). No mês: meta do mês de referência.
  // No acumulado: média das metas de margem definidas no período (Jan..mesRef),
  // coerente com a margem realizada que também é acumulada.
  let metaMargem = 0;
  if (modo === "mes") {
    const mref = mrows.find((m) => m.mes === mesRef);
    metaMargem = mref ? Number(mref.meta_margem) : 0;
  } else {
    const noPer = mrows.filter(
      (m) => noPeriodo(m.mes, mesRef, modo) && Number(m.meta_margem) > 0,
    );
    metaMargem =
      noPer.length > 0
        ? noPer.reduce((s, m) => s + Number(m.meta_margem), 0) / noPer.length
        : 0;
  }
  const margemRealPct =
    modo === "mes"
      ? margemMensal !== null
        ? margemMensal * 100
        : null
      : margemAcumulada !== null
        ? margemAcumulada * 100
        : null;

  const metas: PainelMetas = {
    temMetas: mrows.some(
      (m) =>
        Number(m.meta_receita) ||
        Number(m.meta_resultado) ||
        Number(m.meta_margem) ||
        Number(m.meta_caixa) ||
        Number(m.caixa_real),
    ),
    receita: {
      realizado: faturou,
      meta: metaReceita,
      pct: metaReceita > 0 ? faturou / metaReceita : null,
    },
    resultado: {
      realizado: resultado,
      meta: metaResultado,
      pct: metaResultado > 0 ? resultado / metaResultado : null,
    },
    caixa: {
      realizado: caixaReal,
      meta: metaCaixa,
      pct: metaCaixa > 0 ? caixaReal / metaCaixa : null,
    },
    margem: { realizado: margemRealPct, meta: metaMargem },
  };

  return {
    faturou,
    gastou,
    resultado,
    margemMensal,
    margemAcumulada,
    totalOrcado,
    totalRealizado,
    execGeral,
    informativo: { receita: receitaInfo, despesa: despesaInfo },
    areas: gauges,
    metas,
  };
}

export type LinhaDetalhe = { descricao: string; valor: number };

export async function getDetalhesArea(
  empresaId: string,
  areaId: string,
  ano: number,
  mesRef: number,
  modo: Modo,
): Promise<LinhaDetalhe[]> {
  const supabase = await createClient();
  const [{ data }, { data: catRows }] = await Promise.all([
    supabase
      .from("realizado")
      .select("descricao, valor, mes, categoria_norm, classe")
      .eq("empresa_id", empresaId)
      .eq("area_id", areaId)
      .eq("ano", ano)
      .eq("tipo", "despesa"),
    supabase
      .from("mapa_categoria")
      .select("categoria_norm, classe")
      .eq("empresa_id", empresaId)
      .eq("tipo", "despesa"),
  ]);

  // Só "normal" entra no relógio → o detalhe também só mostra normal.
  const foraNormal = new Set(
    (catRows ?? [])
      .filter((m) => (m.classe ?? "normal") !== "normal")
      .map((m) => m.categoria_norm),
  );

  // Agrupa por descrição dentro do período (pula informativo/oculto)
  const mapa = new Map<string, number>();
  for (const r of data ?? []) {
    if (!noPeriodo(r.mes as number, mesRef, modo)) continue;
    const cn = r.categoria_norm as string | null;
    const own = r.classe as string | null;
    const eff = own ?? (cn && foraNormal.has(cn) ? "oculto" : "normal");
    if (eff !== "normal") continue; // só normal entra no detalhe do relógio
    const desc = (r.descricao as string) || "(sem descrição)";
    mapa.set(desc, (mapa.get(desc) ?? 0) + Number(r.valor));
  }

  return Array.from(mapa.entries())
    .map(([descricao, valor]) => ({ descricao, valor }))
    .sort((a, b) => b.valor - a.valor);
}
