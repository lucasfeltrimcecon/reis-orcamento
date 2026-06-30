import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMaster } from "@/lib/auth";
import { getEmpresa } from "@/lib/supabase/queries";
import { getCaApp, listConexoesEmpresa } from "@/lib/conta-azul/store";
import { ConectarBase } from "./ConectarBase";
import { desconectarBase } from "./actions";

export const metadata = { title: "Conta Azul · Reis" };

const ERROS: Record<string, string> = {
  sem_app: "Configure o app do Conta Azul antes de conectar (em Integrações).",
  empresa: "Empresa não informada.",
  callback: "Retorno do Conta Azul incompleto.",
  state: "Sessão de conexão inválida. Tente de novo.",
  token: "Falha ao trocar o código por token. Confira o app e os scopes.",
  salvar: "Não foi possível salvar a conexão.",
};

function dataBR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function EmpresaContaAzulPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await requireMaster();
  const { id } = await params;
  const sp = await searchParams;

  const empresa = await getEmpresa(id);
  if (!empresa) notFound();

  const [app, bases] = await Promise.all([
    getCaApp(),
    listConexoesEmpresa(id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/empresas"
        className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
      >
        ← Empresas
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
        Conta Azul — {empresa.nome}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Conecte uma ou <b>mais bases</b> do Conta Azul desta empresa. Cada base
        usa o login próprio do Conta Azul daquela empresa — receita e despesa são
        puxadas automaticamente.
      </p>

      {sp.erro && (
        <div className="mt-4 rounded-lg bg-[#fceaea] px-3.5 py-2.5 text-xs font-semibold text-[var(--red)]">
          {ERROS[sp.erro] ?? `Erro: ${sp.erro}`}
        </div>
      )}
      {sp.ok === "conectado" && (
        <div className="mt-4 rounded-lg bg-[#e7f6ec] px-3.5 py-2.5 text-xs font-semibold text-[#15803d]">
          Base conectada com sucesso.
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[var(--navy)]">
            Bases conectadas
          </h2>
          <span className="text-xs font-semibold text-[var(--muted)]">
            {bases.length} base{bases.length === 1 ? "" : "s"}
          </span>
        </div>

        {bases.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Nenhuma base conectada ainda.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {bases.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-[var(--background)] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[var(--navy)]">
                    {b.apelido}
                    {b.conta_azul_nome ? (
                      <span className="ml-1 font-normal text-[var(--muted)]">
                        · {b.conta_azul_nome}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--muted)]">
                    conectada em {dataBR(b.created_at)}
                  </span>
                </div>
                <form action={desconectarBase}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="empresaId" value={id} />
                  <button
                    type="submit"
                    className="shrink-0 text-xs font-bold text-[var(--muted)] transition hover:text-[var(--red)]"
                  >
                    desconectar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 border-t border-[var(--border)] pt-5">
          {app ? (
            <ConectarBase empresaId={id} />
          ) : (
            <p className="text-xs font-semibold text-[#b8780c]">
              O app do Conta Azul ainda não foi configurado.{" "}
              <Link
                href="/integracoes"
                className="font-bold text-[var(--action)] underline"
              >
                Configurar em Integrações
              </Link>
              .
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
