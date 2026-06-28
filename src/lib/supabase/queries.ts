import { createClient } from "@/lib/supabase/server";
import type { Area, Empresa, EmpresaComContagem } from "@/lib/types";

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
