"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";
import { slugify } from "@/lib/slug";

const AREAS_PADRAO = [
  "Comercial",
  "Financeiro",
  "Administrativo",
  "Marketing",
  "Recursos Humanos",
  "Diretoria",
  "Impostos e Taxas",
];

const NovaEmpresaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da empresa"),
  criarAreasPadrao: z.boolean(),
});

export type NovaEmpresaState = { error?: string };

export async function criarEmpresa(
  _prev: NovaEmpresaState,
  formData: FormData,
): Promise<NovaEmpresaState> {
  await requireMaster();

  const parsed = NovaEmpresaSchema.safeParse({
    nome: formData.get("nome"),
    criarAreasPadrao: formData.get("criarAreasPadrao") === "on",
  });

  if (!parsed.success) {
    return { error: z.flattenError(parsed.error).fieldErrors.nome?.[0] };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const baseSlug = slugify(parsed.data.nome) || "empresa";

  // Garante slug único anexando sufixo numérico se preciso
  let slug = baseSlug;
  for (let i = 2; i < 50; i++) {
    const { data: existe } = await supabase
      .from("empresas")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existe) break;
    slug = `${baseSlug}-${i}`;
  }

  const { data: empresa, error } = await supabase
    .from("empresas")
    .insert({ nome: parsed.data.nome, slug, created_by: user.id })
    .select("id")
    .single();

  if (error || !empresa) {
    return { error: "Não foi possível criar a empresa. Tente novamente." };
  }

  if (parsed.data.criarAreasPadrao) {
    await supabase.from("areas").insert(
      AREAS_PADRAO.map((nome, i) => ({
        empresa_id: empresa.id,
        nome,
        ordem: i,
      })),
    );
  }

  revalidatePath("/empresas");
  redirect(`/empresas/${empresa.id}/areas`);
}
