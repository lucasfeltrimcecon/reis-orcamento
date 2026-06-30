import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresa } from "@/lib/supabase/queries";
import { requireMaster } from "@/lib/auth";
import { ImportarMetasForm } from "./ImportarMetasForm";

export const metadata = { title: "Importar metas · Reis" };

export default async function ImportarMetasPage({
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

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/empresas/${id}/metas?ano=${ano}`}
        className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
      >
        ← Metas
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
        Importar metas — {ano}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Suba uma planilha com a coluna <b>Métrica</b> e as 12 colunas de meses
        (Jan a Dez). A margem vai em <b>%</b> (ex: 30). Comece pelo modelo abaixo
        — ele já vem com as métricas e com os valores atuais de {ano}.
      </p>

      <a
        href={`/empresas/${id}/metas/modelo?ano=${ano}`}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--action)] transition hover:border-[var(--action)]"
      >
        ↓ Baixar modelo ({ano})
      </a>

      <ImportarMetasForm empresaId={id} ano={ano} />
    </div>
  );
}
