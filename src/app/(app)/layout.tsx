import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const emailIniciais = (user.email ?? "?")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-full flex-col bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--navy)] text-base font-extrabold text-white">
              R
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-bold text-[var(--navy)] leading-tight">
                Controle Orçamentário
              </span>
              <span className="block text-xs text-[var(--muted)] font-semibold">
                Reis Aceleradora
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink href="/painel" label="Painel" />
            <NavLink href="/empresas" label="Empresas" />
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-bold text-[var(--foreground)] leading-tight">
                {user.email}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-[var(--muted)] font-semibold">
                Master
              </span>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e8f1f9] text-xs font-extrabold text-[var(--action)]">
              {emailIniciais}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-xl border border-[var(--border)] bg-white px-3.5 py-1.5 text-xs font-bold text-[var(--muted)] transition hover:border-[var(--red)] hover:text-[var(--red)]"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-bold text-[var(--muted)] transition hover:bg-[var(--background)] hover:text-[var(--navy)]"
    >
      {label}
    </Link>
  );
}
