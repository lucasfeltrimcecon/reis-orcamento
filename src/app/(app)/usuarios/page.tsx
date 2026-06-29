import { requireMaster } from "@/lib/auth";
import { listEmpresas, listUsuarios } from "@/lib/supabase/queries";
import { UsuariosClient } from "./UsuariosClient";

export const metadata = { title: "Usuários · Reis" };

export default async function UsuariosPage() {
  await requireMaster();
  const [usuarios, empresas] = await Promise.all([
    listUsuarios(),
    listEmpresas(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-[var(--navy)]">
        Usuários
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Crie acessos para os clientes e vincule cada um às suas empresas. O
        cliente entra com e-mail e senha e enxerga <b>só</b> o que é da empresa
        dele (somente leitura).
      </p>

      <UsuariosClient
        usuarios={usuarios}
        empresas={empresas.map((e) => ({ id: e.id, nome: e.nome }))}
      />
    </div>
  );
}
