import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMaster } from "@/lib/auth";
import { getEmpresa } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { MESES_ABREV } from "@/lib/meses";
import { METRICAS_META } from "@/lib/metas";
import { salvarMetas } from "../actions";

export const metadata = { title: "Editar metas · Reis" };

const ANOS = [2025, 2026, 2027];

type MetaRow = Record<string, number> & { mes: number };

export default async function EditarMetasPage({
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
  const val = (campo: string, mes: number): string => {
    const r = byMes.get(mes);
    const v = r ? Number(r[campo]) : 0;
    return v === 0 ? "" : String(v);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link
        href={`/empresas/${id}/metas?ano=${ano}`}
        className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
      >
        ← Metas
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
        Editar metas — {empresa.nome} · {ano}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Digite as metas de topo por mês. <b>Receita</b>, <b>resultado</b> e{" "}
        <b>margem</b> são comparados com o realizado do Conta Azul; o{" "}
        <b>caixa gerado realizado</b> você lança aqui. Prefere planilha?{" "}
        <Link
          href={`/empresas/${id}/metas/importar?ano=${ano}`}
          className="font-bold text-[var(--action)]"
        >
          Importar
        </Link>
        .
      </p>

      <div className="mt-5 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          Ano:
        </span>
        {ANOS.map((a) => (
          <Link
            key={a}
            href={`/empresas/${id}/metas/editar?ano=${a}`}
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

      <form action={salvarMetas} className="mt-6">
        <input type="hidden" name="empresaId" value={id} />
        <input type="hidden" name="ano" value={ano} />

        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white shadow-sm">
          <table className="text-sm" style={{ minWidth: 1100 }}>
            <thead>
              <tr className="border-b border-[var(--border)] bg-[#fbfcfe]">
                <th className="sticky left-0 z-10 bg-[#fbfcfe] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                  Métrica
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
              {METRICAS_META.map((linha) => (
                <tr
                  key={linha.campo}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="sticky left-0 z-10 bg-white px-4 py-2 font-bold text-[var(--navy)] whitespace-nowrap">
                    {linha.label}
                  </td>
                  {MESES_ABREV.map((_, m) => (
                    <td key={m} className="px-1 py-1.5">
                      <input
                        name={`${linha.campo}_${m + 1}`}
                        type="number"
                        step={linha.step}
                        defaultValue={val(linha.campo, m + 1)}
                        placeholder={linha.pct ? "%" : "0"}
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
            Salvar metas
          </button>
          <Link
            href={`/empresas/${id}/metas?ano=${ano}`}
            className="text-sm font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
