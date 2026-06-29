import { cookies } from "next/headers";
import { listEmpresas } from "@/lib/supabase/queries";

export const COOKIE_EMPRESA = "empresa_ativa";

export type EmpresaMini = { id: string; nome: string };

/** Empresas que o usuário atual pode ver (RLS: master = todas, cliente = as dele). */
export async function getEmpresasAcessiveis(): Promise<EmpresaMini[]> {
  const empresas = await listEmpresas();
  return empresas.map((e) => ({ id: e.id, nome: e.nome }));
}

/**
 * Empresa ativa = a do cookie (se ainda acessível) ou a primeira da lista.
 * null se o usuário não tem nenhuma empresa.
 */
export async function getEmpresaAtiva(
  empresas?: EmpresaMini[],
): Promise<EmpresaMini | null> {
  const lista = empresas ?? (await getEmpresasAcessiveis());
  if (lista.length === 0) return null;
  const c = (await cookies()).get(COOKIE_EMPRESA)?.value;
  const achada = c ? lista.find((e) => e.id === c) : undefined;
  return achada ?? lista[0];
}
