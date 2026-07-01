"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";

const AddSchema = z.object({
  empresaId: z.string().uuid(),
  nome: z.string().trim().min(2, "Nome muito curto"),
});

export async function adicionarArea(formData: FormData) {
  await requireMaster();
  const parsed = AddSchema.safeParse({
    empresaId: formData.get("empresaId"),
    nome: formData.get("nome"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();

  const { data: max } = await supabase
    .from("areas")
    .select("ordem")
    .eq("empresa_id", parsed.data.empresaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("areas").insert({
    empresa_id: parsed.data.empresaId,
    nome: parsed.data.nome,
    ordem: (max?.ordem ?? -1) + 1,
  });
  if (error) throw new Error("Não foi possível adicionar a área.");

  revalidatePath(`/empresas/${parsed.data.empresaId}/areas`);
}

const RenameSchema = z.object({
  empresaId: z.string().uuid(),
  areaId: z.string().uuid(),
  nome: z.string().trim().min(2, "Nome muito curto"),
});

export async function renomearArea(formData: FormData) {
  await requireMaster();
  const parsed = RenameSchema.safeParse({
    empresaId: formData.get("empresaId"),
    areaId: formData.get("areaId"),
    nome: formData.get("nome"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("areas")
    .update({ nome: parsed.data.nome })
    .eq("id", parsed.data.areaId);
  if (error) throw new Error("Não foi possível renomear a área.");

  revalidatePath(`/empresas/${parsed.data.empresaId}/areas`);
}

const MostrarSchema = z.object({
  empresaId: z.string().uuid(),
  areaId: z.string().uuid(),
  mostrar: z.boolean(),
});

/** Liga/desliga a área no painel (oculta = fora do painel inteiro). */
export async function definirMostrarArea(payload: {
  empresaId: string;
  areaId: string;
  mostrar: boolean;
}): Promise<{ ok?: boolean; erro?: string }> {
  await requireMaster();
  const parsed = MostrarSchema.safeParse(payload);
  if (!parsed.success) return { erro: "Dados inválidos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("areas")
    .update({ mostrar: parsed.data.mostrar })
    .eq("id", parsed.data.areaId);
  if (error) return { erro: "Falha ao salvar." };

  revalidatePath(`/empresas/${parsed.data.empresaId}/areas`);
  revalidatePath("/painel");
  return { ok: true };
}

const RemoveSchema = z.object({
  empresaId: z.string().uuid(),
  areaId: z.string().uuid(),
});

export async function removerArea(formData: FormData) {
  await requireMaster();
  const parsed = RemoveSchema.safeParse({
    empresaId: formData.get("empresaId"),
    areaId: formData.get("areaId"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("areas")
    .delete()
    .eq("id", parsed.data.areaId);
  if (error) throw new Error("Não foi possível remover a área.");

  revalidatePath(`/empresas/${parsed.data.empresaId}/areas`);
}
