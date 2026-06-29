"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMaster } from "@/lib/auth";

export type UsuarioState = { erro?: string; ok?: string };

const CriarSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  senha: z.string().min(8, "Senha de no mínimo 8 caracteres"),
  nome: z.string().trim().optional(),
  empresaIds: z.array(z.string().uuid()).min(1, "Selecione ao menos uma empresa"),
});

export async function criarUsuario(
  _prev: UsuarioState,
  formData: FormData,
): Promise<UsuarioState> {
  await requireMaster();

  const parsed = CriarSchema.safeParse({
    email: formData.get("email"),
    senha: formData.get("senha"),
    nome: (formData.get("nome") as string) || undefined,
    empresaIds: formData.getAll("empresaIds").map(String),
  });
  if (!parsed.success) {
    const f = z.flattenError(parsed.error).fieldErrors;
    return {
      erro:
        f.email?.[0] || f.senha?.[0] || f.empresaIds?.[0] || "Dados inválidos.",
    };
  }

  // Cria a conta de auth (service-role). O trigger handle_new_user cria o
  // profile (role 'cliente') de forma síncrona.
  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.senha,
    email_confirm: true,
    user_metadata: parsed.data.nome ? { full_name: parsed.data.nome } : undefined,
  });
  if (error || !created.user) {
    const jaExiste =
      error?.message?.toLowerCase().includes("already") ||
      error?.message?.toLowerCase().includes("registered");
    return {
      erro: jaExiste
        ? "Já existe um usuário com esse e-mail."
        : "Não foi possível criar o usuário.",
    };
  }

  // Vincula as empresas (client anon do master → passa pelo RLS).
  const rows = parsed.data.empresaIds.map((empresa_id) => ({
    user_id: created.user.id,
    empresa_id,
  }));
  const supabase = await createClient();
  const { error: errVinc } = await supabase.from("empresa_membros").insert(rows);
  if (errVinc) {
    return {
      erro: "Usuário criado, mas falhou ao vincular as empresas. Ajuste o vínculo na lista.",
    };
  }

  revalidatePath("/usuarios");
  return { ok: `Acesso de ${parsed.data.email} criado.` };
}

export async function vincularEmpresa(formData: FormData) {
  await requireMaster();
  const userId = String(formData.get("userId") ?? "");
  const empresaId = String(formData.get("empresaId") ?? "");
  if (!userId || !empresaId) return;

  const supabase = await createClient();
  await supabase
    .from("empresa_membros")
    .upsert({ user_id: userId, empresa_id: empresaId });
  revalidatePath("/usuarios");
}

export async function desvincularEmpresa(formData: FormData) {
  await requireMaster();
  const userId = String(formData.get("userId") ?? "");
  const empresaId = String(formData.get("empresaId") ?? "");
  if (!userId || !empresaId) return;

  const supabase = await createClient();
  await supabase
    .from("empresa_membros")
    .delete()
    .eq("user_id", userId)
    .eq("empresa_id", empresaId);
  revalidatePath("/usuarios");
}

export async function excluirUsuario(formData: FormData) {
  const masterId = await requireMaster();
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === masterId) return; // nunca se autoexcluir

  // Recusa excluir qualquer conta master (proteção da equipe Reis).
  const supabase = await createClient();
  const { data: alvo } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (alvo?.role === "master") return;

  // deleteUser cascateia profiles e empresa_membros (FK on delete cascade).
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/usuarios");
}
