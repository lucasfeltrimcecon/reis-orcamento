"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";

export type AppState = { erro?: string; ok?: string };

export async function salvarApp(
  _prev: AppState,
  formData: FormData,
): Promise<AppState> {
  await requireMaster();

  const clientId = String(formData.get("client_id") ?? "").trim();
  const clientSecret = String(formData.get("client_secret") ?? "").trim();
  const scope = String(formData.get("scope") ?? "").trim();
  if (!clientId) return { erro: "Informe o client_id." };

  const supabase = await createClient();

  // Secret em branco => mantém o atual (não força recolar a cada edição).
  let secret = clientSecret;
  if (!secret) {
    const { data } = await supabase
      .from("conta_azul_app")
      .select("client_secret")
      .maybeSingle();
    secret = data?.client_secret ?? "";
  }
  if (!secret) return { erro: "Informe o client_secret na primeira vez." };

  const { error } = await supabase.from("conta_azul_app").upsert({
    id: true,
    client_id: clientId,
    client_secret: secret,
    scope: scope || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { erro: "Não foi possível salvar as credenciais." };

  revalidatePath("/integracoes");
  return { ok: "Credenciais salvas." };
}
