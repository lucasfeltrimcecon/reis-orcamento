import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresa } from "@/lib/supabase/queries";
import { ImportarContaAzul } from "./ImportarContaAzul";

export const metadata = { title: "Importar realizado · Reis" };

export default async function ImportarRealizadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const { id } = await params;
  const { ano: anoParam, mes: mesParam } = await searchParams;
  const ano = Number(anoParam) || 2026;
  const mes = Math.min(Math.max(Number(mesParam) || 6, 1), 12);

  const empresa = await getEmpresa(id);
  if (!empresa) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href={`/empresas/${id}/realizado?ano=${ano}`}
        className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
      >
        ← Realizado
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
        Importar realizado — {empresa.nome}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Suba os arquivos do <b>Conta Azul</b> (Contas a Pagar e a Receber) do mês.
        Pode subir vários de uma vez. O sistema lê a coluna <b>Categoria 1</b>,
        usa o <b>Centro de Custo</b> como área, e aplica o filtro salvo da empresa
        — você só decide as categorias novas.
      </p>

      <div className="mt-3 rounded-lg bg-[#fdf4e3] px-3.5 py-2.5 text-xs font-semibold text-[#b8780c]">
        ⚠ Confirmar <b>substitui todo o realizado do mês escolhido</b>. Suba
        receitas e despesas juntas para o mês ficar completo.
      </div>

      <ImportarContaAzul empresaId={id} defaultAno={ano} defaultMes={mes} />
    </div>
  );
}
