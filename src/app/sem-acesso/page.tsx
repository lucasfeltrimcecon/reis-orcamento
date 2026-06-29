import { signOut } from "@/app/login/actions";

export const metadata = { title: "Sem acesso · Reis" };

export default function SemAcessoPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--background)] px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white px-8 py-10 text-center shadow-sm">
        <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-xl bg-[var(--navy)] text-lg font-extrabold text-white">
          R
        </span>
        <h1 className="text-xl font-extrabold text-[var(--navy)]">
          Conta sem empresa vinculada
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Seu acesso ainda não foi liberado para nenhuma empresa. Fale com a
          equipe da <b className="text-[var(--navy)]">Reis Aceleradora</b> para
          liberar o seu painel.
        </p>
        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="rounded-xl border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--muted)] transition hover:border-[var(--red)] hover:text-[var(--red)]"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
