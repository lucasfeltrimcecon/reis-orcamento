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
  chave: string; // chave única de agregação (categoria; + centro de custo na despesa)
  categoriaNorm: string; // unidade de filtro (mapa_categoria)
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
 * - Valor da DESPESA: "Valor pago da parcela (R$)" (o que de fato saiu).
 * - Área (só despesa): "Centro de Custo 1".
 * Despesa: agrega por (categoria, centro de custo) — preserva o rateio de uma
 * categoria entre vários centros. Receita: agrega por categoria.
 * Valores em módulo. Sem categoria -> "Sem categoria".
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

  // Valor efetivamente movimentado (não o "Valor na Categoria 1").
  const colValor =
    tipo === "receita"
      ? "Valor recebido da parcela (R$)"
      : "Valor pago da parcela (R$)";
  let valIdx = acharColuna(header, colValor);
  if (valIdx === -1) valIdx = acharColuna(header, "Valor na Categoria 1");

  if (catIdx === -1 || valIdx === -1) {
    return {
      ok: false,
      erro: `Não encontrei as colunas "Categoria 1" e "${colValor}". É um export do Conta Azul?`,
      itens: [],
    };
  }

  // Despesa: uma entrada por (categoria, centro de custo). Receita: por categoria.
  const acc = new Map<string, ItemContaAzul>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const categoria = String(row[catIdx] ?? "").trim() || "Sem categoria";
    const valor = Math.abs(toNumber(row[valIdx]));
    if (valor === 0) continue;

    const categoriaNorm = normalizarTexto(categoria);
    let area: string | null = null;
    if (tipo === "despesa" && ccIdx !== -1) {
      const cc = String(row[ccIdx] ?? "").trim();
      area = cc || null;
    }
    const chave =
      tipo === "despesa"
        ? `${categoriaNorm}|${normalizarTexto(area ?? "")}`
        : categoriaNorm;

    const e = acc.get(chave);
    if (e) {
      e.valor += valor;
    } else {
      acc.set(chave, { chave, categoriaNorm, categoria, valor, area });
    }
  }

  const itens: ItemContaAzul[] = Array.from(acc.values());

  if (itens.length === 0) {
    return { ok: false, erro: "Nenhuma categoria com valor encontrada.", itens: [] };
  }

  itens.sort((a, b) => b.valor - a.valor);
  return { ok: true, itens };
}
