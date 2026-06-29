import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresa, listAreas } from "@/lib/supabase/queries";
import { requireMaster } from "@/lib/auth";
import { adicionarArea } from "./actions";
import { AreaRow } from "./AreaRow";

export const metadata = { title: "Áreas · Reis" };

export default async function AreasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMaster();
  const { id } = await params;
  const empresa = await getEmpresa(id);
  if (!empresa) notFound();

  const areas = await listAreas(id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/empresas"
        className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
      >
        ← Empresas
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--navy)]">
            {empresa.nome}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Áreas (centros de custo). Devem bater com o centro de custo do Conta
            Azul para o realizado cruzar certo.
          </p>
        </div>
        <Link
          href={`/empresas/${empresa.id}/orcamento`}
          className="rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0458a0] active:scale-[0.98]"
        >
          Ir para o orçamento →
        </Link>
      </div>

      {/* Adicionar área */}
      <form
        action={adicionarArea}
        className="mt-7 flex max-w-md gap-2"
      >
        <input type="hidden" name="empresaId" value={empresa.id} />
        <input
          name="nome"
          required
          placeholder="Nome da nova área"
          className="flex-1 rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm transition focus:border-[var(--action)] focus:outline-none focus:ring-3 focus:ring-[#0369a126]"
        />
        <button
          type="submit"
          className="rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0458a0] active:scale-[0.98]"
        >
          Adicionar
        </button>
      </form>

      {/* Lista de áreas */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
        {areas.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">
            Nenhuma área ainda. Adicione a primeira acima.
          </p>
        ) : (
          <ul>
            {areas.map((a) => (
              <AreaRow key={a.id} area={a} empresaId={empresa.id} />
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 text-xs text-[var(--muted)]">
        {areas.length} área{areas.length === 1 ? "" : "s"} cadastrada
        {areas.length === 1 ? "" : "s"}.
      </p>
    </div>
  );
}
