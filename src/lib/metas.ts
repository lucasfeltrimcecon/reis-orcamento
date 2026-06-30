// Métricas de topo (metas + caixa realizado). Fonte única usada pela tela de
// edição (grid), pela visão, pelo modelo de planilha e pelo parser de import.
export type CampoMeta =
  | "meta_receita"
  | "meta_resultado"
  | "meta_margem"
  | "meta_caixa"
  | "caixa_real";

export type MetricaMeta = {
  campo: CampoMeta;
  label: string;
  step: string;
  pct: boolean;
};

export const METRICAS_META: MetricaMeta[] = [
  { campo: "meta_receita", label: "Receita (meta)", step: "0.01", pct: false },
  { campo: "meta_resultado", label: "Resultado líquido (meta)", step: "0.01", pct: false },
  { campo: "meta_margem", label: "Margem (meta %)", step: "0.1", pct: true },
  { campo: "meta_caixa", label: "Caixa gerado (meta)", step: "0.01", pct: false },
  { campo: "caixa_real", label: "Caixa gerado (realizado)", step: "0.01", pct: false },
];
