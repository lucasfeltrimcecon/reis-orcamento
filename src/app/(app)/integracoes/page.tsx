import { requireMaster } from "@/lib/auth";
import { listEmpresas } from "@/lib/supabase/queries";
import { getCaApp, listConexoes, type Conexao } from "@/lib/conta-azul/store";
import { CA_REDIRECT_URI } from "@/lib/conta-azul/oauth";
import { AppConfigForm } from "./AppConfigForm";
import { ConectarBase } from "./ConectarBase";
import { desconectarBase } from "./actions";

export const metadata = { title: "Integrações · Reis" };

const ERROS: Record<string, string> = {
  sem_app: "Configure o client_id e o client_secret antes de conectar.",
  empresa: "Empresa não informada.",
  callback: "Retorno do Conta Azul incompleto.",
  state: "Sessão de conexão inválida. Tente de novo.",
  token: "Falha ao trocar o código por token. Confira client_id/secret e os scopes.",
  salvar: "Não foi possível salvar a conexão.",
};

export default async function IntegracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await requireMaster();
  const sp = await searchParams;
  const [empresas, app, conexoes] = await Promise.all([
    listEmpresas(),
    getCaApp(),
    listConexoes(),
  ]);

  const porEmpresa = new Map<string, Conexao[]>();
  for (const c of conexoes) {
    const arr = porEmpresa.get(c.empresa_id) ?? [];
    arr.push(c);
    porEmpresa.set(c.empresa_id, arr);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-[var(--navy)]">
        Integrações
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Conecte o <b>Conta Azul</b> de cada empresa para puxar receita e despesa
        automaticamente (no lugar de subir arquivo). Uma empresa pode ter{" "}
        <b>várias bases</b>.
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

      {/* App config */}
      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-[var(--navy)]">
          App do Conta Azul
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Credenciais do app que você criou no portal do desenvolvedor. Valem
          para todas as empresas.
        </p>
        <AppConfigForm
          clientId={app?.client_id ?? ""}
          temSecret={!!app?.client_secret}
          scope={app?.scope ?? ""}
          redirectUri={CA_REDIRECT_URI}
        />
      </section>

      {/* Conexões por empresa */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-[var(--ink)]">
          Conexões por empresa
        </h2>
        {!app && (
          <p className="mb-3 text-xs font-semibold text-[#b8780c]">
            Salve as credenciais do app acima para liberar a conexão.
          </p>
        )}
        <div className="space-y-3">
          {empresas.map((e) => {
            const bases = porEmpresa.get(e.id) ?? [];
            return (
              <div
                key={e.id}
                className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[var(--navy)]">{e.nome}</span>
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    {bases.length} base{bases.length === 1 ? "" : "s"}
                  </span>
                </div>

                {bases.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {bases.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-[var(--background)] px-3 py-2"
                      >
                        <span className="text-sm font-semibold text-[var(--navy)]">
                          {b.apelido}
                          {b.conta_azul_nome ? (
                            <span className="ml-1 font-normal text-[var(--muted)]">
                              · {b.conta_azul_nome}
                            </span>
                          ) : null}
                        </span>
                        <form action={desconectarBase}>
                          <input type="hidden" name="id" value={b.id} />
                          <button
                            type="submit"
                            className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--red)]"
                          >
                            desconectar
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}

                {app && (
                  <div className="mt-3">
                    <ConectarBase empresaId={e.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
