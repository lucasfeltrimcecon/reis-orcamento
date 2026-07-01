import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Area,
  Empresa,
  EmpresaComContagem,
  OrcamentoArea,
  UsuarioComEmpresas,
} from "@/lib/types";

// cache() dedup a query no mesmo request (layout + page chamam isto).
export const listEmpresas = cache(
  async (): Promise<EmpresaComContagem[]> => {
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
  },
);

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
  const [{ data, error }, { data: catRows }] = await Promise.all([
    supabase
      .from("realizado")
      .select("valor, tipo, importado_em, categoria_norm, classe")
      .eq("empresa_id", empresaId)
      .eq("ano", ano),
    supabase
      .from("mapa_categoria")
      .select("tipo, categoria_norm, classe")
      .eq("empresa_id", empresaId),
  ]);

  if (error) throw new Error(error.message);

  // Só "normal" entra no resumo (coerente com o painel). Linha manual usa a
  // própria classe; senão herda do mapa_categoria.
  const classeCat = new Map(
    (catRows ?? []).map((m) => [
      `${m.tipo}:${m.categoria_norm}`,
      (m.classe ?? "normal") as string,
    ]),
  );
  const VALIDAS = ["normal", "informativo", "oculto"];

  let totalReceita = 0;
  let totalDespesa = 0;
  let ultima: string | null = null;
  for (const r of data ?? []) {
    const own = (r.classe as string | null) ?? null;
    const eff =
      own && VALIDAS.includes(own)
        ? own
        : r.categoria_norm
          ? (classeCat.get(`${r.tipo}:${r.categoria_norm}`) ?? "normal")
          : "normal";
    if (eff !== "normal") continue;
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

/**
 * Lista todos os usuários com as empresas vinculadas (só master enxerga, via RLS
 * "master le profiles" / "master full membros"). profiles e empresa_membros não
 * têm FK direta entre si (ambos apontam pra auth.users), então junta-se em JS.
 */
export async function listUsuarios(): Promise<UsuarioComEmpresas[]> {
  const supabase = await createClient();
  const [{ data: profiles }, { data: membros }, { data: empresas }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .order("created_at"),
      supabase.from("empresa_membros").select("user_id, empresa_id"),
      supabase.from("empresas").select("id, nome"),
    ]);

  const nomeById = new Map((empresas ?? []).map((e) => [e.id, e.nome]));
  const porUser = new Map<string, { id: string; nome: string }[]>();
  for (const m of membros ?? []) {
    const arr = porUser.get(m.user_id) ?? [];
    arr.push({ id: m.empresa_id, nome: nomeById.get(m.empresa_id) ?? "—" });
    porUser.set(m.user_id, arr);
  }

  return (profiles ?? []).map((p) => ({
    ...(p as UsuarioComEmpresas),
    empresas: porUser.get(p.id) ?? [],
  }));
}
