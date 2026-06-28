import * as XLSX from "xlsx";

export type LinhaOrcamento = {
  area: string;
  valores: number[]; // 12 posições, Jan..Dez
};

export type ParseResult = {
  ok: boolean;
  erro?: string;
  linhas: LinhaOrcamento[];
};

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (v == null || v === "") return 0;
  // Aceita "1.234,56" (pt-BR) ou "1234.56"
  const s = String(v).trim().replace(/\s/g, "");
  if (s.includes(",")) {
    return Number(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return Number(s) || 0;
}

/**
 * Lê um .xlsx no formato: coluna A = Área, colunas B..M = Jan..Dez.
 * A primeira linha é cabeçalho (ignorada).
 */
export function parseOrcamentoXlsx(buffer: ArrayBuffer): ParseResult {
  let rows: unknown[][];
  try {
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { ok: false, erro: "Planilha vazia.", linhas: [] };
    rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
    });
  } catch {
    return { ok: false, erro: "Não consegui ler o arquivo (formato inválido).", linhas: [] };
  }

  if (rows.length < 2) {
    return { ok: false, erro: "A planilha precisa ter o cabeçalho e ao menos uma área.", linhas: [] };
  }

  const linhas: LinhaOrcamento[] = [];
  // pula a primeira linha (cabeçalho)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const area = String(row[0] ?? "").trim();
    if (!area) continue;
    const valores = Array.from({ length: 12 }, (_, m) => toNumber(row[m + 1]));
    linhas.push({ area, valores });
  }

  if (linhas.length === 0) {
    return { ok: false, erro: "Nenhuma área encontrada na planilha.", linhas: [] };
  }

  return { ok: true, linhas };
}
