"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAcesso } from "@/lib/auth";
import { getEmpresasAcessiveis, COOKIE_EMPRESA } from "@/lib/empresa-ativa";

async function definirEmpresa(empresaId: string, destino: string) {
  await requireAcesso();
  const empresas = await getEmpresasAcessiveis();
  if (empresas.some((e) => e.id === empresaId)) {
    (await cookies()).set(COOKIE_EMPRESA, empresaId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  const alvo = destino && destino.startsWith("/") ? destino : "/painel";
  revalidatePath(alvo);
  redirect(alvo);
}

/** Chamado pelo switcher (client component). */
export async function selecionarEmpresa(empresaId: string, destino?: string) {
  await definirEmpresa(empresaId, destino || "/painel");
}

/** Chamado por <form action> (tela de seleção no login). */
export async function selecionarEmpresaForm(formData: FormData) {
  await definirEmpresa(
    String(formData.get("empresaId") ?? ""),
    String(formData.get("destino") ?? "/painel"),
  );
}
