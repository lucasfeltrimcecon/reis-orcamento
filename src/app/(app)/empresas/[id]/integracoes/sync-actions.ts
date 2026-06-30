"use server";

import { revalidatePath } from "next/cache";
import { requireMaster } from "@/lib/auth";
import {
  analisarSync,
  salvarSync,
  type AnaliseSync,
  type LinhaSync,
} from "@/lib/conta-azul/sync";

export type AnaliseState = { ok?: boolean; erro?: string; dados?: AnaliseSync };

/** Puxa o mês de todas as bases da empresa e devolve a prévia (sem gravar). */
export async function sincronizarAnalisar(
  empresaId: string,
  ano: number,
  mes: number,
): Promise<AnaliseState> {
  await requireMaster();
  if (!empresaId || !ano || !mes) return { erro: "Dados inválidos." };
  try {
    const dados = await analisarSync(empresaId, ano, mes);
    if (dados.bases.length === 0) {
      return { erro: "Nenhuma base ativa nesta empresa." };
    }
    return { ok: true, dados };
  } catch (e) {
    return { erro: (e as Error).message || "Falha ao buscar do Conta Azul." };
  }
}

/** Grava a prévia confirmada no realizado (reescreve o mês). */
export async function sincronizarConfirmar(
  empresaId: string,
  ano: number,
  mes: number,
  linhas: LinhaSync[],
): Promise<{ ok?: boolean; erro?: string; qtd?: number }> {
  await requireMaster();
  if (!empresaId || !ano || !mes) return { erro: "Dados inválidos." };
  if (!linhas?.length) return { erro: "Nada para gravar." };

  const r = await salvarSync(empresaId, ano, mes, linhas);
  if (!r.ok) return { erro: r.erro };

  revalidatePath(`/empresas/${empresaId}/realizado`);
  revalidatePath("/painel");
  return { ok: true, qtd: r.qtd };
}
