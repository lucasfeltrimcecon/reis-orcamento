import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMaster } from "@/lib/auth";
import { getEmpresa } from "@/lib/supabase/queries";
import { listConexoesEmpresa, type Conexao } from "@/lib/conta-azul/store";
import { CA_REDIRECT_URI } from "@/lib/conta-azul/oauth";
import { ConectarBase } from "./ConectarBase";
import { SincronizarMes } from "./SincronizarMes";
import { desconectarBase, reautorizar } from "./actions";

export const metadata = { title: "Conta Azul · Reis" };

const ERROS: Record<string, string> = {
  dados: "Confira os campos: client_id e client_secret são obrigatórios.",
  salvar: "Não foi possível salvar a integração.",
  sem_credencial: "Esta base não tem credenciais salvas. Recadastre-a.",
  callback: "Retorno do Conta Azul incompleto.",
  state: "Sessão de conexão inválida ou expirada. Conecte de novo.",
  token: "Falha ao trocar o código por token. Confira client_id/secret e os scopes.",
};

function dataBR(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function StatusBadge({ b }: { b: Conexao }) {
  if (b.status === "pendente") {
    return (
      <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#b8780c]">
        aguardando autorização
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[#e7f6ec] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#15803d]">
      ativa
    </span>
  );
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

  const bases = await listConexoesEmpresa(id);

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
        tem o <b>próprio</b> client_id/client_secret (do app criado no Conta Azul
        daquele CNPJ) — receita e despesa são puxadas automaticamente.
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
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-[var(--navy)]">
                      {b.apelido}
                      {b.conta_azul_nome ? (
                        <span className="ml-1 font-normal text-[var(--muted)]">
                          · {b.conta_azul_nome}
                        </span>
                      ) : null}
                    </span>
                    <StatusBadge b={b} />
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--muted)]">
                    {b.status === "ativa"
                      ? `conectada em ${dataBR(b.created_at)}`
                      : "credenciais salvas — falta autorizar"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <form action={reautorizar}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="empresaId" value={id} />
                    <button
                      type="submit"
                      className="text-xs font-bold text-[var(--action)] transition hover:underline"
                    >
                      {b.status === "ativa" ? "Reautorizar" : "Autorizar"}
                    </button>
                  </form>
                  <form action={desconectarBase}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="empresaId" value={id} />
                    <button
                      type="submit"
                      className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--red)]"
                    >
                      desconectar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 border-t border-[var(--border)] pt-5">
          <ConectarBase empresaId={id} redirectUri={CA_REDIRECT_URI} />
        </div>
      </section>

      {bases.some((b) => b.status === "ativa") && (
        <SincronizarMes empresaId={id} />
      )}
    </div>
  );
}
