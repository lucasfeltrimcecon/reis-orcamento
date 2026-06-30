import Link from "next/link";
import { requireMaster } from "@/lib/auth";
import { listEmpresas } from "@/lib/supabase/queries";
import { listConexoes } from "@/lib/conta-azul/store";
import { CA_REDIRECT_URI } from "@/lib/conta-azul/oauth";

export const metadata = { title: "Integrações · Reis" };

export default async function IntegracoesPage() {
  await requireMaster();
  const [empresas, conexoes] = await Promise.all([
    listEmpresas(),
    listConexoes(),
  ]);

  const totalPorEmpresa = new Map<string, number>();
  for (const c of conexoes) {
    totalPorEmpresa.set(
      c.empresa_id,
      (totalPorEmpresa.get(c.empresa_id) ?? 0) + 1,
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-[var(--navy)]">
        Integrações
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Cada base do Conta Azul tem o <b>próprio</b> client_id/client_secret (do
        app criado no Conta Azul daquele CNPJ). Conecte as bases <b>dentro de
        cada empresa</b>, em <b>Empresas › [empresa] › Conta Azul</b>.
      </p>

      {/* URL de redirecionamento (vale pra todo app criado no portal) */}
      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-[var(--navy)]">
          URL de redirecionamento
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Cole esta mesma URL no portal do desenvolvedor de <b>cada</b> app que
          você criar no Conta Azul.
        </p>
        <code className="mt-3 block overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--navy)]">
          {CA_REDIRECT_URI}
        </code>
      </section>

      {/* Resumo por empresa (gerenciar é dentro da empresa) */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-[var(--ink)]">
          Conexões por empresa
        </h2>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
          {empresas.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
              Nenhuma empresa cadastrada ainda.
            </p>
          ) : (
            <ul>
              {empresas.map((e) => {
                const n = totalPorEmpresa.get(e.id) ?? 0;
                return (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-3.5 last:border-0"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-bold text-[var(--navy)]">
                        {e.nome}
                      </span>
                      <span className="text-xs font-semibold text-[var(--muted)]">
                        {n} base{n === 1 ? "" : "s"} conectada{n === 1 ? "" : "s"}
                      </span>
                    </div>
                    <Link
                      href={`/empresas/${e.id}/integracoes`}
                      className="shrink-0 rounded-lg border border-[var(--border)] bg-white px-3.5 py-1.5 text-xs font-bold text-[var(--action)] transition hover:border-[var(--action)]"
                    >
                      Gerenciar →
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
