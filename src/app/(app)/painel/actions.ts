"use server";

import { getDetalhesArea, type LinhaDetalhe, type Modo } from "@/lib/dashboard";
import { requireAcesso } from "@/lib/auth";

export async function carregarDetalhesArea(
  empresaId: string,
  areaId: string,
  ano: number,
  mesRef: number,
  modo: Modo,
): Promise<LinhaDetalhe[]> {
  // Leitura: master ou membro da empresa. O RLS já escopa os dados retornados.
  await requireAcesso();
  return getDetalhesArea(empresaId, areaId, ano, mesRef, modo);
}
