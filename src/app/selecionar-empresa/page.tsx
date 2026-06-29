import { requireAcesso } from "@/lib/auth";
import { getEmpresasAcessiveis } from "@/lib/empresa-ativa";
import { selecionarEmpresaForm } from "@/lib/empresa-actions";
import { signOut } from "@/app/login/actions";

export const metadata = { title: "Escolher empresa · Reis" };

export default async function SelecionarEmpresaPage() {
  await requireAcesso();
  const empresas = await getEmpresasAcessiveis();

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--background)] px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white px-8 py-10 shadow-sm">
        <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-xl bg-[var(--navy)] text-lg font-extrabold text-white">
          R
        </span>
        <h1 className="text-center text-xl font-extrabold text-[var(--navy)]">
          Qual empresa você quer ver?
        </h1>
        <p className="mt-2 text-center text-sm text-[var(--muted)]">
          Você pode trocar a qualquer momento no menu lateral.
        </p>

        <div className="mt-6 space-y-2">
          {empresas.map((e) => (
            <form key={e.id} action={selecionarEmpresaForm}>
              <input type="hidden" name="empresaId" value={e.id} />
              <input type="hidden" name="destino" value="/painel" />
              <button
                type="submit"
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-left text-sm font-bold text-[var(--navy)] transition hover:border-[var(--action)] hover:bg-[#f4f9fd]"
              >
                <span className="truncate">{e.nome}</span>
                <span className="text-[var(--action)]">→</span>
              </button>
            </form>
          ))}
        </div>

        <form action={signOut} className="mt-6 text-center">
          <button
            type="submit"
            className="text-xs font-bold text-[var(--muted)] underline transition hover:text-[var(--red)]"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
