import { createClient } from "@/lib/supabase/server";
import type {
  Area,
  Empresa,
  EmpresaComContagem,
  OrcamentoArea,
} from "@/lib/types";

export async function listEmpresas(): Promise<EmpresaComContagem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresas")
    .select("*, areas(count)")
    .order("nome");

  if (error) throw new Error(error.message);

  return (data ?? []).map((e) => {
    const { areas, ...rest } = e as Empresa & {
      areas: { count: number }[];
    };
    return { ...rest, total_areas: areas?.[0]?.count ?? 0 };
  });
}

export async function getEmpresa(id: string): Promise<Empresa | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function listAreas(empresaId: string): Promise<Area[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("areas")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("ordem")
    .order("nome");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getOrcamento(
  empresaId: string,
  ano: number,
): Promise<OrcamentoArea[]> {
  const supabase = await createClient();

  const areas = await listAreas(empresaId);

  const { data: linhas, error } = await supabase
    .from("orcamento")
    .select("area_id, mes, valor")
    .eq("empresa_id", empresaId)
    .eq("ano", ano);

  if (error) throw new Error(error.message);

  const porArea = new Map<string, number[]>();
  for (const a of areas) porArea.set(a.id, Array(12).fill(0));
  for (const l of linhas ?? []) {
    const arr = porArea.get(l.area_id);
    if (arr && l.mes >= 1 && l.mes <= 12) arr[l.mes - 1] = Number(l.valor);
  }

  return areas.map((area) => {
    const valores = porArea.get(area.id) ?? Array(12).fill(0);
    return { area, valores, total: valores.reduce((s, v) => s + v, 0) };
  });
}

export type RealizadoResumo = {
  totalReceita: number;
  totalDespesa: number;
  qtdLinhas: number;
  ultimaImportacao: string | null;
};

export async function getRealizadoResumo(
  empresaId: string,
  ano: number,
): Promise<RealizadoResumo> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("realizado")
    .select("valor, tipo, importado_em")
    .eq("empresa_id", empresaId)
    .eq("ano", ano);

  if (error) throw new Error(error.message);

  let totalReceita = 0;
  let totalDespesa = 0;
  let ultima: string | null = null;
  for (const r of data ?? []) {
    const v = Number(r.valor);
    if (r.tipo === "receita") totalReceita += v;
    else totalDespesa += v;
    if (!ultima || r.importado_em > ultima) ultima = r.importado_em;
  }

  return {
    totalReceita,
    totalDespesa,
    qtdLinhas: data?.length ?? 0,
    ultimaImportacao: ultima,
  };
}
