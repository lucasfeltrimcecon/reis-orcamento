import * as XLSX from "xlsx";
import { toNumber } from "@/lib/xlsx";

export function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Sugere ignorar quando a categoria parece movimentação não operacional. */
export function sugereIgnorar(categoria: string): boolean {
  const s = normalizarTexto(categoria);
  return /(emprest|transfer|aplica|rendiment|aporte|resgate|saldo inicial|entre contas|mesmo grupo)/.test(
    s,
  );
}

export type ItemContaAzul = {
  categoriaNorm: string;
  categoria: string; // rótulo original
  valor: number; // magnitude (positiva)
  area: string | null; // Centro de Custo (só despesa)
};

export type ParseContaAzulResult = {
  ok: boolean;
  erro?: string;
  itens: ItemContaAzul[];
};

function acharColuna(header: unknown[], alvo: string): number {
  const alvoNorm = normalizarTexto(alvo);
  return header.findIndex((h) => normalizarTexto(String(h ?? "")) === alvoNorm);
}

/**
 * Lê um export do Conta Azul (Contas a Pagar / a Receber).
 * - Categoria: "Categoria 1".
 * - Valor da RECEITA: "Valor recebido da parcela (R$)" (o que de fato entrou).
 * - Valor da DESPESA: "Valor na Categoria 1" (respeita o rateio por centro de custo).
 * - Área (só despesa): "Centro de Custo 1".
 * Agrega por categoria. Valores em módulo. Sem categoria -> "Sem categoria".
 */
export function parseContaAzul(
  buffer: ArrayBuffer,
  tipo: "receita" | "despesa",
): ParseContaAzulResult {
  let rows: unknown[][];
  try {
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return { ok: false, erro: "Planilha vazia.", itens: [] };
    rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
  } catch {
    return { ok: false, erro: "Não consegui ler o arquivo.", itens: [] };
  }

  if (rows.length < 2) {
    return { ok: false, erro: "Arquivo sem dados.", itens: [] };
  }

  const header = rows[0] ?? [];
  const catIdx = acharColuna(header, "Categoria 1");
  const ccIdx = acharColuna(header, "Centro de Custo 1");

  // Receita: usa o valor efetivamente recebido (não o "Valor na Categoria 1").
  let valIdx = -1;
  if (tipo === "receita") {
    valIdx = acharColuna(header, "Valor recebido da parcela (R$)");
    if (valIdx === -1) valIdx = acharColuna(header, "Valor na Categoria 1");
  } else {
    valIdx = acharColuna(header, "Valor na Categoria 1");
  }

  if (catIdx === -1 || valIdx === -1) {
    return {
      ok: false,
      erro:
        tipo === "receita"
          ? 'Não encontrei as colunas "Categoria 1" e "Valor recebido da parcela (R$)". É um export do Conta Azul?'
          : 'Não encontrei as colunas "Categoria 1" e "Valor na Categoria 1". É um export do Conta Azul?',
      itens: [],
    };
  }

  // Agrega por categoria; guarda o centro de custo dominante (por valor).
  const acc = new Map<
    string,
    { categoria: string; valor: number; areas: Map<string, number> }
  >();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const categoria = String(row[catIdx] ?? "").trim() || "Sem categoria";
    const valor = Math.abs(toNumber(row[valIdx]));
    if (valor === 0) continue;

    const k = normalizarTexto(categoria);
    let entry = acc.get(k);
    if (!entry) {
      entry = { categoria, valor: 0, areas: new Map() };
      acc.set(k, entry);
    }
    entry.valor += valor;

    if (tipo === "despesa" && ccIdx !== -1) {
      const cc = String(row[ccIdx] ?? "").trim();
      if (cc) entry.areas.set(cc, (entry.areas.get(cc) ?? 0) + valor);
    }
  }

  const itens: ItemContaAzul[] = Array.from(acc.entries()).map(([k, e]) => {
    let area: string | null = null;
    if (e.areas.size > 0) {
      area = [...e.areas.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
    return { categoriaNorm: k, categoria: e.categoria, valor: e.valor, area };
  });

  if (itens.length === 0) {
    return { ok: false, erro: "Nenhuma categoria com valor encontrada.", itens: [] };
  }

  itens.sort((a, b) => b.valor - a.valor);
  return { ok: true, itens };
}
