"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";
import {
  criarConexaoPendente,
  definirOauthState,
  getConexao,
} from "@/lib/conta-azul/store";
import { authorizeUrl } from "@/lib/conta-azul/oauth";

const schema = z.object({
  empresaId: z.string().uuid(),
  apelido: z.string().trim().max(60).optional(),
  clientId: z.string().trim().min(1),
  clientSecret: z.string().trim().min(1),
  scope: z.string().trim().max(200).optional(),
});

function paginaEmpresa(empresaId: string, q?: string): string {
  return `/empresas/${empresaId}/integracoes${q ? `?${q}` : ""}`;
}

/** Cadastra uma integração (credenciais da base) e inicia o OAuth. */
export async function criarConexao(formData: FormData) {
  const userId = await requireMaster();

  const parsed = schema.safeParse({
    empresaId: formData.get("empresaId"),
    apelido: formData.get("apelido"),
    clientId: formData.get("client_id"),
    clientSecret: formData.get("client_secret"),
    scope: formData.get("scope"),
  });

  if (!parsed.success) {
    const empresaId = String(formData.get("empresaId") ?? "");
    redirect(paginaEmpresa(empresaId, "erro=dados"));
  }

  const { empresaId, clientId, clientSecret } = parsed.data;
  const apelido = parsed.data.apelido?.trim() || "Conta Azul";
  const scope = parsed.data.scope?.trim() || null;
  const state = randomUUID();

  const erro = await criarConexaoPendente({
    empresaId,
    apelido,
    clientId,
    clientSecret,
    scope,
    conectadoPor: userId,
    oauthState: state,
  });
  if (erro) redirect(paginaEmpresa(empresaId, "erro=salvar"));

  redirect(authorizeUrl({ client_id: clientId, client_secret: clientSecret, scope }, state));
}

/** Refaz o OAuth de uma base já cadastrada, reusando as credenciais salvas. */
export async function reautorizar(formData: FormData) {
  await requireMaster();
  const id = String(formData.get("id") ?? "");
  const empresaId = String(formData.get("empresaId") ?? "");
  if (!id) redirect(paginaEmpresa(empresaId, "erro=dados"));

  const conexao = await getConexao(id);
  if (!conexao?.client_id || !conexao.client_secret) {
    redirect(paginaEmpresa(empresaId, "erro=sem_credencial"));
  }

  const state = randomUUID();
  await definirOauthState(id, state);
  redirect(
    authorizeUrl(
      {
        client_id: conexao!.client_id!,
        client_secret: conexao!.client_secret!,
        scope: conexao!.scope,
      },
      state,
    ),
  );
}

/** Remove uma base. */
export async function desconectarBase(formData: FormData) {
  await requireMaster();
  const id = String(formData.get("id") ?? "");
  const empresaId = String(formData.get("empresaId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("conta_azul_conexao").delete().eq("id", id);
  if (empresaId) revalidatePath(`/empresas/${empresaId}/integracoes`);
  revalidatePath("/integracoes");
}
