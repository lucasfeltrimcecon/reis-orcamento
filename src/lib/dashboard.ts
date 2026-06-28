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

export type PainelData = {
  faturou: number;
  gastou: number;
  resultado: number;
  margemMensal: number | null; // resultado/faturou do período
  margemAcumulada: number | null; // resultado/faturou de Jan..mesRef
  totalOrcado: number;
  totalRealizado: number; // = gastou (despesa)
  execGeral: number | null;
  areas: GaugeArea[];
};

type OrcRow = { area_id: string; mes: number; valor: number };
type RealRow = {
  area_id: string | null;
  mes: number;
  valor: number;
  tipo: "receita" | "despesa";
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

  const [{ data: areas }, { data: orcRows }, { data: realRows }] =
    await Promise.all([
      supabase
        .from("areas")
        .select("id, nome, ordem")
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
        .select("area_id, mes, valor, tipo")
        .eq("empresa_id", empresaId)
        .eq("ano", ano),
    ]);

  const orc = (orcRows ?? []) as OrcRow[];
  const real = (realRows ?? []) as RealRow[];

  // --- KPIs do período ---
  let faturou = 0;
  let gastou = 0;
  for (const r of real) {
    if (!noPeriodo(r.mes, mesRef, modo)) continue;
    if (r.tipo === "receita") faturou += Number(r.valor);
    else gastou += Number(r.valor);
  }
  const resultado = faturou - gastou;
  const margemMensal = faturou > 0 ? resultado / faturou : null;

  // --- Margem acumulada (sempre Jan..mesRef) ---
  let faturouAcum = 0;
  let gastouAcum = 0;
  for (const r of real) {
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
    if (r.tipo !== "despesa" || !r.area_id) continue;
    if (!noPeriodo(r.mes, mesRef, modo)) continue;
    realPorArea.set(
      r.area_id,
      (realPorArea.get(r.area_id) ?? 0) + Number(r.valor),
    );
  }

  const gauges: GaugeArea[] = [];
  for (const a of areas ?? []) {
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

  return {
    faturou,
    gastou,
    resultado,
    margemMensal,
    margemAcumulada,
    totalOrcado,
    totalRealizado,
    execGeral,
    areas: gauges,
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
  const { data } = await supabase
    .from("realizado")
    .select("descricao, valor, mes")
    .eq("empresa_id", empresaId)
    .eq("area_id", areaId)
    .eq("ano", ano)
    .eq("tipo", "despesa");

  // Agrupa por descrição dentro do período
  const mapa = new Map<string, number>();
  for (const r of data ?? []) {
    if (!noPeriodo(r.mes as number, mesRef, modo)) continue;
    const desc = (r.descricao as string) || "(sem descrição)";
    mapa.set(desc, (mapa.get(desc) ?? 0) + Number(r.valor));
  }

  return Array.from(mapa.entries())
    .map(([descricao, valor]) => ({ descricao, valor }))
    .sort((a, b) => b.valor - a.valor);
}
