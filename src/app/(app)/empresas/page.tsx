import Link from "next/link";
import { listEmpresas } from "@/lib/supabase/queries";

export const metadata = { title: "Empresas · Reis" };

export default async function EmpresasPage() {
  const empresas = await listEmpresas();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--navy)]">
            Empresas
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Empresas dos clientes e suas áreas (centros de custo).
          </p>
        </div>
        <Link
          href="/empresas/nova"
          className="rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0458a0] hover:shadow-lg active:scale-[0.98]"
        >
          + Nova empresa
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
        {empresas.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Nenhuma empresa cadastrada ainda.
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Comece cadastrando a empresa-piloto.
            </p>
            <Link
              href="/empresas/nova"
              className="mt-5 inline-block rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0458a0]"
            >
              + Nova empresa
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[#fbfcfe]">
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                  Empresa
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                  Áreas
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {empresas.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-[var(--border)] last:border-0 transition hover:bg-[#fafbfd]"
                >
                  <td className="px-5 py-4">
                    <span className="text-sm font-bold text-[var(--navy)]">
                      {e.nome}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">
                    {e.total_areas} área{e.total_areas === 1 ? "" : "s"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/empresas/${e.id}/areas`}
                        className="rounded-lg border border-[var(--border)] bg-white px-3.5 py-1.5 text-xs font-bold text-[var(--muted)] transition hover:border-[var(--action)] hover:text-[var(--action)]"
                      >
                        Áreas
                      </Link>
                      <Link
                        href={`/empresas/${e.id}/orcamento`}
                        className="rounded-lg border border-[var(--border)] bg-white px-3.5 py-1.5 text-xs font-bold text-[var(--action)] transition hover:border-[var(--action)]"
                      >
                        Orçamento
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
