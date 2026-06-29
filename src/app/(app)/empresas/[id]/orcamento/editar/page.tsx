import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresa, getOrcamento } from "@/lib/supabase/queries";
import { requireMaster } from "@/lib/auth";
import { MESES_ABREV } from "@/lib/meses";
import { salvarOrcamentoForm } from "../actions";

export const metadata = { title: "Editar orçamento · Reis" };

export default async function EditarOrcamentoPage({
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

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link
        href={`/empresas/${id}/orcamento?ano=${ano}`}
        className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
      >
        ← Orçamento
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
        Digitar orçamento — {empresa.nome} · {ano}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Preencha os valores orçados de cada área por mês. Pode deixar em branco o
        que for zero. Use ponto ou vírgula para centavos.
      </p>

      {orcamento.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--muted)]">
          Cadastre as áreas antes de digitar o orçamento.
        </p>
      ) : (
        <form action={salvarOrcamentoForm} className="mt-7">
          <input type="hidden" name="empresaId" value={id} />
          <input type="hidden" name="ano" value={ano} />

          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white shadow-sm">
            <table className="text-sm" style={{ minWidth: 1000 }}>
              <thead>
                <tr className="border-b border-[var(--border)] bg-[#fbfcfe]">
                  <th className="sticky left-0 z-10 bg-[#fbfcfe] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                    Área
                  </th>
                  {MESES_ABREV.map((m) => (
                    <th
                      key={m}
                      className="px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]"
                    >
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orcamento.map((o) => (
                  <tr
                    key={o.area.id}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 font-bold text-[var(--navy)] whitespace-nowrap">
                      {o.area.nome}
                    </td>
                    {o.valores.map((v, m) => (
                      <td key={m} className="px-1 py-1.5">
                        <input
                          name={`v_${o.area.id}_${m + 1}`}
                          type="number"
                          step="0.01"
                          defaultValue={v === 0 ? "" : v}
                          placeholder="0"
                          className="w-20 rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-right text-sm tabular-nums transition focus:border-[var(--action)] focus:outline-none focus:ring-2 focus:ring-[#0369a126]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-[var(--action)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0458a0] active:scale-[0.98]"
            >
              Salvar orçamento
            </button>
            <Link
              href={`/empresas/${id}/orcamento?ano=${ano}`}
              className="text-sm font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
