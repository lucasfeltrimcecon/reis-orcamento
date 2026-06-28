import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresa } from "@/lib/supabase/queries";
import { ImportarRealizadoForm } from "./ImportarRealizadoForm";

export const metadata = { title: "Importar realizado · Reis" };

export default async function ImportarRealizadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ano?: string }>;
}) {
  const { id } = await params;
  const { ano: anoParam } = await searchParams;
  const ano = Number(anoParam) || 2026;

  const empresa = await getEmpresa(id);
  if (!empresa) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/empresas/${id}/realizado?ano=${ano}`}
        className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
      >
        ← Realizado
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
        Importar realizado — {ano}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Suba a planilha com as colunas <b>Tipo</b> (Receita/Despesa), <b>Área</b>,{" "}
        <b>Descrição</b> e os 12 meses. Use o export do Conta Azul formatado neste
        padrão. Linhas de <b>Despesa</b> entram no relógio da área; <b>Receita</b>{" "}
        soma no faturamento.
      </p>

      <a
        href={`/empresas/${id}/realizado/modelo`}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--action)] transition hover:border-[var(--action)]"
      >
        ↓ Baixar modelo (já com suas áreas)
      </a>

      <ImportarRealizadoForm empresaId={id} ano={ano} />
    </div>
  );
}
