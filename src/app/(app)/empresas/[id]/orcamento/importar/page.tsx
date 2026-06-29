import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresa } from "@/lib/supabase/queries";
import { requireMaster } from "@/lib/auth";
import { ImportarForm } from "./ImportarForm";

export const metadata = { title: "Importar orçamento · Reis" };

export default async function ImportarOrcamentoPage({
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

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/empresas/${id}/orcamento?ano=${ano}`}
        className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
      >
        ← Orçamento
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
        Importar orçamento — {ano}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Suba uma planilha com a coluna <b>Área</b> e as 12 colunas de meses (Jan a
        Dez). As áreas que não existirem ainda serão criadas automaticamente.
      </p>

      <a
        href={`/empresas/${id}/orcamento/modelo`}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--action)] transition hover:border-[var(--action)]"
      >
        ↓ Baixar modelo (já com suas áreas)
      </a>

      <ImportarForm empresaId={id} ano={ano} />
    </div>
  );
}
