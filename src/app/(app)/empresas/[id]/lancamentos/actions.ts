"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";
import { normalizarTexto } from "@/lib/contaazul";

const Schema = z.object({
  empresaId: z.string().uuid(),
  tipo: z.enum(["receita", "despesa"]),
  ano: z.coerce.number().int().min(2020).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  descricao: z.string().trim().min(1, "Descreva o lançamento").max(120),
  valor: z.coerce
    .number()
    .refine((v) => Number.isFinite(v) && v !== 0, "Valor inválido"),
  areaId: z.string().uuid().optional().or(z.literal("")),
  classe: z.enum(["normal", "informativo"]),
});

export type LancState = { ok?: boolean; erro?: string };

/** Insere um lançamento manual no realizado (camada preservada na sincronização). */
export async function adicionarLancamento(
  _prev: LancState,
  formData: FormData,
): Promise<LancState> {
  await requireMaster();

  const parsed = Schema.safeParse({
    empresaId: formData.get("empresaId"),
    tipo: formData.get("tipo"),
    ano: formData.get("ano"),
    mes: formData.get("mes"),
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    areaId: formData.get("areaId") ?? "",
    classe: formData.get("classe"),
  });
  if (!parsed.success) {
    return {
      erro:
        parsed.error.issues[0]?.message ??
        "Confira os campos (descrição e valor são obrigatórios).",
    };
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("realizado").insert({
    empresa_id: d.empresaId,
    area_id: d.tipo === "despesa" && d.areaId ? d.areaId : null,
    ano: d.ano,
    mes: d.mes,
    descricao: d.descricao.trim(),
    valor: Math.abs(d.valor),
    tipo: d.tipo,
    categoria_norm: normalizarTexto(d.descricao),
    classe: d.classe,
    manual: true,
    importacao_id: randomUUID(),
  });
  if (error) return { erro: "Falha ao salvar o lançamento." };

  revalidatePath(`/empresas/${d.empresaId}/lancamentos`);
  revalidatePath("/painel");
  return { ok: true };
}

export async function removerLancamento(formData: FormData) {
  await requireMaster();
  const empresaId = String(formData.get("empresaId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("realizado").delete().eq("id", id).eq("manual", true);
  if (empresaId) revalidatePath(`/empresas/${empresaId}/lancamentos`);
  revalidatePath("/painel");
}
