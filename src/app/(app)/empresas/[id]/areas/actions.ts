"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const AddSchema = z.object({
  empresaId: z.string().uuid(),
  nome: z.string().trim().min(2, "Nome muito curto"),
});

export async function adicionarArea(formData: FormData) {
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

  await supabase.from("areas").insert({
    empresa_id: parsed.data.empresaId,
    nome: parsed.data.nome,
    ordem: (max?.ordem ?? -1) + 1,
  });

  revalidatePath(`/empresas/${parsed.data.empresaId}/areas`);
}

const RenameSchema = z.object({
  empresaId: z.string().uuid(),
  areaId: z.string().uuid(),
  nome: z.string().trim().min(2, "Nome muito curto"),
});

export async function renomearArea(formData: FormData) {
  const parsed = RenameSchema.safeParse({
    empresaId: formData.get("empresaId"),
    areaId: formData.get("areaId"),
    nome: formData.get("nome"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("areas")
    .update({ nome: parsed.data.nome })
    .eq("id", parsed.data.areaId);

  revalidatePath(`/empresas/${parsed.data.empresaId}/areas`);
}

const RemoveSchema = z.object({
  empresaId: z.string().uuid(),
  areaId: z.string().uuid(),
});

export async function removerArea(formData: FormData) {
  const parsed = RemoveSchema.safeParse({
    empresaId: formData.get("empresaId"),
    areaId: formData.get("areaId"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.from("areas").delete().eq("id", parsed.data.areaId);

  revalidatePath(`/empresas/${parsed.data.empresaId}/areas`);
}
