import * as XLSX from "xlsx";
import { METRICAS_META, type CampoMeta } from "./metas";

export type LinhaOrcamento = {
  area: string;
  valores: number[]; // 12 posições, Jan..Dez
};

export type ParseResult = {
  ok: boolean;
  erro?: string;
  linhas: LinhaOrcamento[];
};

export function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  let s = String(v).trim().replace(/\s/g, "").replace(/r\$/gi, "");
  if (s === "") return 0;

  const negativo = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()]/g, "").replace(/^-/, "");

  const temVirgula = s.includes(",");
  if (temVirgula) {
    // Vírgula é o separador decimal; pontos são milhar.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(".")) {
    const partes = s.split(".");
    const ultima = partes[partes.length - 1];
    // Vários pontos, ou um ponto com 3 dígitos no fim => milhar (ex.: "1.234", "1.234.567").
    if (partes.length > 2 || (partes.length === 2 && ultima.length === 3)) {
      s = s.replace(/\./g, "");
    }
    // Caso contrário o ponto é decimal (ex.: "1234.56", "1.5").
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return negativo ? -n : n;
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

export type LinhaRealizado = {
  tipo: "receita" | "despesa";
  area: string;
  descricao: string;
  valores: number[]; // 12 posições, Jan..Dez (magnitude positiva)
};

export type ParseRealizadoResult = {
  ok: boolean;
  erro?: string;
  linhas: LinhaRealizado[];
};

function normalizaTipo(v: unknown): "receita" | "despesa" | null {
  const s = String(v ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
  if (s === "") return null;
  if (/^(rec|ent|fat|vend|receb)/.test(s)) return "receita";
  if (/^(desp|sai|cust|gast|pag|desem)/.test(s)) return "despesa";
  return null;
}

/**
 * Lê um .xlsx no formato: Tipo | Área | Descrição | Jan..Dez.
 * Primeira linha é cabeçalho. Valores são tomados em módulo (o Tipo define entra/sai).
 */
export function parseRealizadoXlsx(buffer: ArrayBuffer): ParseRealizadoResult {
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
    return {
      ok: false,
      erro: "Não consegui ler o arquivo (formato inválido).",
      linhas: [],
    };
  }

  if (rows.length < 2) {
    return {
      ok: false,
      erro: "A planilha precisa ter o cabeçalho e ao menos uma linha.",
      linhas: [],
    };
  }

  const linhas: LinhaRealizado[] = [];
  const erros: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const area = String(row[1] ?? "").trim();
    const descricao = String(row[2] ?? "").trim();
    const temValor = Array.from({ length: 12 }, (_, m) =>
      toNumber(row[m + 3]),
    ).some((v) => v !== 0);
    // Linha totalmente vazia: ignora
    if (!area && !descricao && String(row[0] ?? "").trim() === "" && !temValor) {
      continue;
    }
    const tipo = normalizaTipo(row[0]);
    if (tipo === null) {
      erros.push(
        `Linha ${i + 1}: coluna "Tipo" vazia ou não reconhecida (use Receita ou Despesa).`,
      );
      continue;
    }
    const valores = Array.from({ length: 12 }, (_, m) =>
      Math.abs(toNumber(row[m + 3])),
    );
    if (valores.every((v) => v === 0)) continue;
    linhas.push({ tipo, area, descricao, valores });
  }

  if (erros.length > 0) {
    return {
      ok: false,
      erro: erros.slice(0, 5).join(" ") + (erros.length > 5 ? " …" : ""),
      linhas: [],
    };
  }

  if (linhas.length === 0) {
    return { ok: false, erro: "Nenhuma linha com valor encontrada.", linhas: [] };
  }

  return { ok: true, linhas };
}

export type ParseMetasResult = {
  ok: boolean;
  erro?: string;
  valores: Partial<Record<CampoMeta, number[]>>; // por métrica, 12 posições Jan..Dez
};

function normalizaLabel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Casa o texto da 1ª coluna com uma das métricas (label exato ou heurística). */
function matchCampoMeta(texto: string): CampoMeta | null {
  const n = normalizaLabel(texto);
  if (!n) return null;
  for (const m of METRICAS_META) if (normalizaLabel(m.label) === n) return m.campo;
  if (n.includes("margem")) return "meta_margem";
  if (n.includes("resultado")) return "meta_resultado";
  if (n.includes("caixa") && n.includes("realiz")) return "caixa_real";
  if (n.includes("caixa")) return "meta_caixa";
  if (n.includes("receita")) return "meta_receita";
  return null;
}

/**
 * Lê um .xlsx no formato: coluna A = Métrica, colunas B..M = Jan..Dez.
 * Primeira linha é cabeçalho. Cada métrica reconhecida vira 12 valores.
 */
export function parseMetasXlsx(buffer: ArrayBuffer): ParseMetasResult {
  let rows: unknown[][];
  try {
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { ok: false, erro: "Planilha vazia.", valores: {} };
    rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
    });
  } catch {
    return {
      ok: false,
      erro: "Não consegui ler o arquivo (formato inválido).",
      valores: {},
    };
  }

  if (rows.length < 2) {
    return {
      ok: false,
      erro: "A planilha precisa ter o cabeçalho e as linhas de métrica.",
      valores: {},
    };
  }

  const valores: Partial<Record<CampoMeta, number[]>> = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const campo = matchCampoMeta(String(row[0] ?? ""));
    if (!campo) continue;
    // % é separador de exibição da margem — removido antes de converter.
    valores[campo] = Array.from({ length: 12 }, (_, m) =>
      toNumber(String(row[m + 1] ?? "").replace(/%/g, "")),
    );
  }

  if (Object.keys(valores).length === 0) {
    return {
      ok: false,
      erro: "Nenhuma métrica reconhecida (use a coluna Métrica do modelo).",
      valores: {},
    };
  }

  return { ok: true, valores };
}
