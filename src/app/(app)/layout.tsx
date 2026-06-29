import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "./Sidebar";

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

  // Autorização: só papel master acessa a área administrativa na V1.
  const { data: isMaster } = await supabase.rpc("is_master");
  if (!isMaster) {
    redirect("/login");
  }

  const emailIniciais = (user.email ?? "?")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-full bg-[var(--background)]">
      <Sidebar email={user.email ?? ""} iniciais={emailIniciais} />
      <div className="lg:pl-64">
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
