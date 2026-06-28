"use server";

import { getDetalhesArea, type LinhaDetalhe, type Modo } from "@/lib/dashboard";
import { requireMaster } from "@/lib/auth";

export async function carregarDetalhesArea(
  empresaId: string,
  areaId: string,
  ano: number,
  mesRef: number,
  modo: Modo,
): Promise<LinhaDetalhe[]> {
  await requireMaster();
  return getDetalhesArea(empresaId, areaId, ano, mesRef, modo);
}
