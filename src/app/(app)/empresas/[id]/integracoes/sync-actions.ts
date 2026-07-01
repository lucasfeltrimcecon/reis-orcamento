"use server";

import { revalidatePath } from "next/cache";
import { requireMaster } from "@/lib/auth";
import { sincronizarMes, type SyncResumo } from "@/lib/conta-azul/sync";

export type SyncState = { ok?: boolean; erro?: string; resumo?: SyncResumo };

/** Sincroniza o mês num clique: puxa das bases, aplica Categorias ativas e grava. */
export async function sincronizar(
  empresaId: string,
  ano: number,
  mes: number,
): Promise<SyncState> {
  await requireMaster();
  if (!empresaId || !ano || !mes) return { erro: "Dados inválidos." };
  try {
    const resumo = await sincronizarMes(empresaId, ano, mes);
    if (resumo.bases.length === 0) {
      return { erro: "Nenhuma base ativa nesta empresa." };
    }
    revalidatePath(`/empresas/${empresaId}/realizado`);
    revalidatePath("/painel");
    return { ok: true, resumo };
  } catch (e) {
    return { erro: (e as Error).message || "Falha ao sincronizar." };
  }
}
