import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMaster } from "@/lib/auth";
import { getEmpresa } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { MESES_ABREV, fmtNum } from "@/lib/meses";
import { METRICAS_META, type MetricaMeta } from "@/lib/metas";

export const metadata = { title: "Metas · Reis" };

const ANOS = [2025, 2026, 2027];

type MetaRow = Record<string, number> & { mes: number };

function celula(m: MetricaMeta, v: number): string {
  if (v === 0) return "—";
  return m.pct ? `${fmtNum(v)}%` : fmtNum(v);
}

export default async function MetasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ano?: string }>;
}) {
  await requireMaster();
  const { id } = await params;
  const { ano: anoParam } = await searchParams;
  const ano = Number(anoParam) || new Date().getFullYear();

  const empresa = await getEmpresa(id);
  if (!empresa) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("metas")
    .select("*")
    .eq("empresa_id", id)
    .eq("ano", ano);

  const byMes = new Map<number, MetaRow>(
    (data ?? []).map((r) => [r.mes as number, r as MetaRow]),
  );
  const valor = (campo: string, mes: number): number => {
    const r = byMes.get(mes);
    return r ? Number(r[campo]) : 0;
  };
  const algumPreenchido = (data ?? []).some((r) =>
    METRICAS_META.some((m) => Number((r as MetaRow)[m.campo]) !== 0),
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link
        href="/empresas"
        className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
      >
        ← Empresas
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--navy)]">
            Metas — {empresa.nome}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Metas de topo por mês: receita, resultado, margem e caixa gerado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/empresas/${id}/metas/importar?ano=${ano}`}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--action)] transition hover:border-[var(--action)]"
          >
            Importar planilha
          </Link>
          <Link
            href={`/empresas/${id}/metas/editar?ano=${ano}`}
            className="rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0458a0] active:scale-[0.98]"
          >
            {algumPreenchido ? "Editar valores" : "Digitar valores"}
          </Link>
        </div>
      </div>

      {/* Seletor de ano */}
      <div className="mt-6 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          Ano:
        </span>
        {ANOS.map((a) => (
          <Link
            key={a}
            href={`/empresas/${id}/metas?ano=${a}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
              a === ano
                ? "bg-[var(--navy)] text-white"
                : "bg-white text-[var(--muted)] border border-[var(--border)] hover:text-[var(--navy)]"
            }`}
          >
            {a}
          </Link>
        ))}
      </div>

      {/* Matriz (visão) */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--border)] bg-white shadow-sm">
        <table className="text-sm" style={{ minWidth: 1100 }}>
          <thead>
            <tr className="border-b border-[var(--border)] bg-[#fbfcfe]">
              <th className="sticky left-0 z-10 bg-[#fbfcfe] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                Métrica
              </th>
              {MESES_ABREV.map((m) => (
                <th
                  key={m}
                  className="px-2 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]"
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICAS_META.map((linha) => (
              <tr
                key={linha.campo}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-3 font-bold text-[var(--navy)] whitespace-nowrap">
                  {linha.label}
                </td>
                {MESES_ABREV.map((_, m) => {
                  const v = valor(linha.campo, m + 1);
                  return (
                    <td
                      key={m}
                      className="px-2 py-3 text-right tabular-nums text-[var(--foreground)]"
                    >
                      {v === 0 ? (
                        <span className="text-[var(--border)]">—</span>
                      ) : (
                        celula(linha, v)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
