import { requireAcesso } from "@/lib/auth";
import { getEmpresasAcessiveis, getEmpresaAtiva } from "@/lib/empresa-ativa";
import { Sidebar } from "./Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Acesso = autenticado E (master OU vinculado a uma empresa).
  // Sem vínculo → /sem-acesso. O RLS escopa os dados do cliente.
  const { email, isMaster } = await requireAcesso();
  const empresas = await getEmpresasAcessiveis();
  const ativa = await getEmpresaAtiva(empresas);

  const emailIniciais = (email || "?").split("@")[0].slice(0, 2).toUpperCase();

  return (
    <div className="min-h-full bg-[var(--background)]">
      <Sidebar
        email={email}
        iniciais={emailIniciais}
        isMaster={isMaster}
        empresas={empresas}
        empresaAtivaId={ativa?.id ?? null}
      />
      <div className="lg:pl-64">
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
