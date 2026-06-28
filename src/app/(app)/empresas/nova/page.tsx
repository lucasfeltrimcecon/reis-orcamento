import Link from "next/link";
import { NovaEmpresaForm } from "./NovaEmpresaForm";

export const metadata = { title: "Nova empresa · Reis" };

export default function NovaEmpresaPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link
        href="/empresas"
        className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
      >
        ← Empresas
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
        Nova empresa
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Cadastre a empresa do cliente. Em seguida você define as áreas (centros de
        custo).
      </p>

      <div className="mt-8">
        <NovaEmpresaForm />
      </div>
    </div>
  );
}
