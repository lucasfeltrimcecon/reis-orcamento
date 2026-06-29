import Link from "next/link";
import { listEmpresas } from "@/lib/supabase/queries";
import { getPainel, type Modo } from "@/lib/dashboard";
import { fmtBRL, MESES_ABREV } from "@/lib/meses";
import { PainelGauges } from "./PainelGauges";
import { EmpresaSelect } from "./EmpresaSelect";

export const metadata = { title: "Painel · Reis" };

function pct(v: number | null): string {
  return v === null
    ? "—"
    : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

// Valor já em porcentagem (ex: 30 -> "30%")
function fmtPct(v: number): string {
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{
    empresa?: string;
    ano?: string;
    mes?: string;
    modo?: string;
  }>;
}) {
  const sp = await searchParams;
  const empresas = await listEmpresas();

  if (empresas.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16 text-center">
        <h1 className="text-3xl font-extrabold text-[var(--navy)]">Painel</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Cadastre uma empresa e suba o orçamento para ver os relógios.
        </p>
        <Link
          href="/empresas/nova"
          className="mt-6 inline-block rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white"
        >
          + Nova empresa
        </Link>
      </div>
    );
  }

  const empresaId =
    sp.empresa && empresas.some((e) => e.id === sp.empresa)
      ? sp.empresa
      : empresas[0].id;
  const empresa = empresas.find((e) => e.id === empresaId)!;
  const hoje = new Date();
  const ano = Number(sp.ano) || hoje.getFullYear();
  const mesRef = Math.min(
    Math.max(Number(sp.mes) || hoje.getMonth() + 1, 1),
    12,
  );
  const modo: Modo = sp.modo === "mes" ? "mes" : "acumulado";

  const d = await getPainel(empresaId, ano, mesRef, modo);

  const base = (over: Record<string, string | number>) => {
    const q = new URLSearchParams({
      empresa: empresaId,
      ano: String(ano),
      mes: String(mesRef),
      modo,
      ...Object.fromEntries(Object.entries(over).map(([k, v]) => [k, String(v)])),
    });
    return `/painel?${q.toString()}`;
  };

  const heroFrac = d.totalOrcado > 0 ? Math.min(d.totalRealizado / d.totalOrcado, 1) : 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <EmpresaSelect
            empresas={empresas}
            value={empresaId}
            ano={ano}
            mes={mesRef}
            modo={modo}
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
              Painel
            </p>
            <p className="text-sm font-semibold text-[var(--navy)]">
              {modo === "mes"
                ? `${MESES_ABREV[mesRef - 1]}/${ano}`
                : `Acumulado até ${MESES_ABREV[mesRef - 1]}/${ano}`}
            </p>
          </div>
        </div>
        <div className="inline-flex rounded-lg border border-[var(--border)] bg-white p-0.5">
          <Link
            href={base({ modo: "mes" })}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${modo === "mes" ? "bg-[var(--navy)] text-white" : "text-[var(--muted)]"}`}
          >
            Mês
          </Link>
          <Link
            href={base({ modo: "acumulado" })}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${modo === "acumulado" ? "bg-[var(--navy)] text-white" : "text-[var(--muted)]"}`}
          >
            Acumulado
          </Link>
        </div>
      </div>

      {/* Seletor de mês */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {MESES_ABREV.map((m, i) => (
          <Link
            key={m}
            href={base({ mes: i + 1 })}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
              i + 1 === mesRef
                ? "bg-[var(--action)] text-white"
                : "bg-white text-[var(--muted)] border border-[var(--border)] hover:text-[var(--navy)]"
            }`}
          >
            {m}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Faturou" valor={fmtBRL(d.faturou)} cor="green" />
        <Kpi label="Gastou" valor={fmtBRL(d.gastou)} cor="ink" />
        <Kpi
          label="Resultado"
          valor={fmtBRL(d.resultado)}
          cor={d.resultado >= 0 ? "green" : "red"}
        />
        <Kpi label="Margem do período" valor={pct(d.margemMensal)} cor="ink" />
        <Kpi label="Margem acumulada" valor={pct(d.margemAcumulada)} cor="ink" />
      </div>

      {/* Metas × Realizado */}
      {d.metas.temMetas && (
        <div className="mt-7">
          <h2 className="mb-3 text-sm font-bold text-[var(--ink)]">
            Metas × Realizado
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetaCard
              label="Receita"
              realizado={fmtBRL(d.metas.receita.realizado)}
              meta={fmtBRL(d.metas.receita.meta)}
              pct={d.metas.receita.pct}
            />
            <MetaCard
              label="Resultado líquido"
              realizado={fmtBRL(d.metas.resultado.realizado)}
              meta={fmtBRL(d.metas.resultado.meta)}
              pct={d.metas.resultado.pct}
            />
            <MetaCard
              label="Margem"
              realizado={
                d.metas.margem.realizado !== null
                  ? fmtPct(d.metas.margem.realizado)
                  : "—"
              }
              meta={d.metas.margem.meta > 0 ? fmtPct(d.metas.margem.meta) : "—"}
              pct={
                d.metas.margem.meta > 0 && d.metas.margem.realizado !== null
                  ? d.metas.margem.realizado / d.metas.margem.meta
                  : null
              }
            />
            <MetaCard
              label="Caixa gerado"
              realizado={fmtBRL(d.metas.caixa.realizado)}
              meta={fmtBRL(d.metas.caixa.meta)}
              pct={d.metas.caixa.pct}
            />
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold text-[var(--navy)]">
            Orçamento planejado × realizado
          </h2>
          <span className="text-sm font-bold text-[var(--muted)] tabular-nums">
            {pct(d.execGeral)} executado
          </span>
        </div>
        <div className="mt-3 h-7 overflow-hidden rounded-lg bg-[var(--border)]">
          <div
            className="h-full rounded-lg transition-all"
            style={{
              width: `${heroFrac * 100}%`,
              background: "linear-gradient(90deg,#0a59a8,#04274d)",
            }}
          />
        </div>
        <div className="mt-2 flex justify-between text-sm font-semibold">
          <span className="text-[var(--muted)] tabular-nums">
            Planejado: {fmtBRL(d.totalOrcado)}
          </span>
          <span className="text-[var(--navy)] tabular-nums">
            Realizado: {fmtBRL(d.totalRealizado)}
          </span>
        </div>
      </div>

      {/* Relógios */}
      <div className="mb-3 mt-7 flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--ink)]">
          Consumo do orçamento por área
        </h2>
        <div className="flex gap-3 text-xs font-semibold text-[var(--muted)]">
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[var(--yellow)]" />
            Dentro (&lt;100%)
          </span>
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[var(--red)]" />
            Estourou (≥100%)
          </span>
        </div>
      </div>

      {d.areas.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Sem dados neste período.
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Suba o orçamento e o realizado de {empresa.nome} para ver os relógios.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link
              href={`/empresas/${empresaId}/orcamento?ano=${ano}`}
              className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-bold text-[var(--action)]"
            >
              Orçamento
            </Link>
            <Link
              href={`/empresas/${empresaId}/realizado?ano=${ano}`}
              className="rounded-xl bg-[var(--action)] px-4 py-2 text-sm font-bold text-white"
            >
              Realizado
            </Link>
          </div>
        </div>
      ) : (
        <PainelGauges
          areas={d.areas}
          empresaId={empresaId}
          ano={ano}
          mesRef={mesRef}
          modo={modo}
        />
      )}
    </div>
  );
}

function Kpi({
  label,
  valor,
  cor,
}: {
  label: string;
  valor: string;
  cor: "green" | "red" | "ink";
}) {
  const c =
    cor === "green"
      ? "var(--green)"
      : cor === "red"
        ? "var(--red)"
        : "var(--navy)";
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </div>
      <div
        className="mt-1.5 text-xl font-extrabold tabular-nums"
        style={{ color: c }}
      >
        {valor}
      </div>
    </div>
  );
}

function MetaCard({
  label,
  realizado,
  meta,
  pct: ratio,
}: {
  label: string;
  realizado: string;
  meta: string;
  pct: number | null; // realizado/meta (1 = bateu a meta)
}) {
  const cor =
    ratio === null
      ? "var(--muted)"
      : ratio >= 1
        ? "var(--green)"
        : ratio >= 0.8
          ? "var(--yellow)"
          : "var(--red)";
  const w = ratio === null ? 0 : Math.max(0, Math.min(ratio, 1)) * 100;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
          {label}
        </span>
        <span className="text-xs font-bold tabular-nums" style={{ color: cor }}>
          {ratio === null ? "sem meta" : `${Math.round(ratio * 100)}%`}
        </span>
      </div>
      <div
        className="mt-1.5 text-xl font-extrabold tabular-nums"
        style={{ color: cor }}
      >
        {realizado}
      </div>
      <div className="text-xs text-[var(--muted)] tabular-nums">meta {meta}</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${w}%`, background: cor }}
        />
      </div>
    </div>
  );
}
