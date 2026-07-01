import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMaster } from "@/lib/auth";
import { getEmpresa, listAreas } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { fmtBRL, MESES_ABREV } from "@/lib/meses";
import { LancamentoForm } from "./LancamentoForm";
import { removerLancamento } from "./actions";

export const metadata = { title: "Lançamentos manuais · Reis" };

type Lanc = {
  id: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  ano: number;
  mes: number;
  area_id: string | null;
  classe: string | null;
};

export default async function LancamentosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMaster();
  const { id } = await params;

  const empresa = await getEmpresa(id);
  if (!empresa) notFound();

  const areas = await listAreas(id);
  const areaNome = new Map(areas.map((a) => [a.id, a.nome]));

  const supabase = await createClient();
  const { data } = await supabase
    .from("realizado")
    .select("id, tipo, descricao, valor, ano, mes, area_id, classe")
    .eq("empresa_id", id)
    .eq("manual", true)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false });
  const lancs = (data ?? []) as Lanc[];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href={`/empresas/${id}/realizado`}
        className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
      >
        ← Realizado
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
        Lançamentos manuais — {empresa.nome}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Suba na mão uma receita ou despesa específica. Fica numa camada própria:
        a <b>sincronização do Conta Azul não apaga</b> esses lançamentos.{" "}
        <b>Normal</b> conta no resultado; <b>Informativo</b> vai só pro card à
        parte.
      </p>

      <LancamentoForm
        empresaId={id}
        areas={areas.map((a) => ({ id: a.id, nome: a.nome }))}
      />

      <h2 className="mb-3 mt-8 text-sm font-bold text-[var(--ink)]">
        Lançamentos ({lancs.length})
      </h2>
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
        {lancs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
            Nenhum lançamento manual ainda.
          </p>
        ) : (
          <ul>
            {lancs.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold text-[var(--navy)]">
                      {l.descricao}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        l.tipo === "receita"
                          ? "bg-[#e7f6ec] text-[#15803d]"
                          : "bg-[#fceaea] text-[var(--red)]"
                      }`}
                    >
                      {l.tipo}
                    </span>
                    {l.classe === "informativo" && (
                      <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#b8780c]">
                        informativo
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--muted)]">
                    {MESES_ABREV[l.mes - 1]}/{l.ano}
                    {l.area_id ? ` · ${areaNome.get(l.area_id) ?? "—"}` : ""}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`tabular-nums text-sm font-bold ${
                      l.tipo === "receita"
                        ? "text-[#15803d]"
                        : "text-[var(--foreground)]"
                    }`}
                  >
                    {fmtBRL(Number(l.valor))}
                  </span>
                  <form action={removerLancamento}>
                    <input type="hidden" name="empresaId" value={id} />
                    <input type="hidden" name="id" value={l.id} />
                    <button
                      type="submit"
                      className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--red)]"
                    >
                      remover
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
