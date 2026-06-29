import { requireAcesso } from "@/lib/auth";
import { Sidebar } from "./Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Acesso = autenticado E (master OU vinculado a uma empresa).
  // Sem vínculo → /sem-acesso. O RLS escopa os dados do cliente.
  const { email, isMaster } = await requireAcesso();

  const emailIniciais = (email || "?").split("@")[0].slice(0, 2).toUpperCase();

  return (
    <div className="min-h-full bg-[var(--background)]">
      <Sidebar email={email} iniciais={emailIniciais} isMaster={isMaster} />
      <div className="lg:pl-64">
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
