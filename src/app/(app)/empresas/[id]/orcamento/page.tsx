import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresa, getOrcamento } from "@/lib/supabase/queries";
import { requireMaster } from "@/lib/auth";
import { MESES_ABREV, fmtNum } from "@/lib/meses";

export const metadata = { title: "Orçamento · Reis" };

const ANOS = [2025, 2026, 2027];

export default async function OrcamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ano?: string }>;
}) {
  await requireMaster();
  const { id } = await params;
  const { ano: anoParam } = await searchParams;
  const ano = Number(anoParam) || 2026;

  const empresa = await getEmpresa(id);
  if (!empresa) notFound();

  const orcamento = await getOrcamento(id, ano);
  const totalGeral = orcamento.reduce((s, o) => s + o.total, 0);
  const algumPreenchido = orcamento.some((o) => o.total !== 0);
  const totaisMes = Array.from({ length: 12 }, (_, m) =>
    orcamento.reduce((s, o) => s + o.valores[m], 0),
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
            Orçamento — {empresa.nome}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Valores orçados por área, mês a mês.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/empresas/${id}/orcamento/importar?ano=${ano}`}
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--action)] transition hover:border-[var(--action)]"
          >
            Importar planilha
          </Link>
          <Link
            href={`/empresas/${id}/orcamento/editar?ano=${ano}`}
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
            href={`/empresas/${id}/orcamento?ano=${a}`}
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

      {/* Matriz */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--border)] bg-white shadow-sm">
        {orcamento.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-[var(--muted)]">
            Esta empresa ainda não tem áreas.{" "}
            <Link
              href={`/empresas/${id}/areas`}
              className="font-bold text-[var(--action)]"
            >
              Cadastre as áreas primeiro.
            </Link>
          </p>
        ) : (
          <table className="w-full text-sm" style={{ minWidth: 900 }}>
            <thead>
              <tr className="border-b border-[var(--border)] bg-[#fbfcfe]">
                <th className="sticky left-0 z-10 bg-[#fbfcfe] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                  Área
                </th>
                {MESES_ABREV.map((m) => (
                  <th
                    key={m}
                    className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]"
                  >
                    {m}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-[var(--navy)]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {orcamento.map((o) => (
                <tr
                  key={o.area.id}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-bold text-[var(--navy)]">
                    {o.area.nome}
                  </td>
                  {o.valores.map((v, m) => (
                    <td
                      key={m}
                      className="px-3 py-3 text-right tabular-nums text-[var(--foreground)]"
                    >
                      {v === 0 ? (
                        <span className="text-[var(--border)]">—</span>
                      ) : (
                        fmtNum(v)
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--navy)]">
                    {fmtNum(o.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border)] bg-[#fbfcfe]">
                <td className="sticky left-0 z-10 bg-[#fbfcfe] px-4 py-3 font-extrabold text-[var(--navy)]">
                  Total
                </td>
                {totaisMes.map((t, m) => (
                  <td
                    key={m}
                    className="px-3 py-3 text-right font-bold tabular-nums text-[var(--navy)]"
                  >
                    {t === 0 ? "—" : fmtNum(t)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right font-extrabold tabular-nums text-[var(--navy)]">
                  {fmtNum(totalGeral)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
