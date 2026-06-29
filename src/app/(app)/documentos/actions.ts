"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMaster } from "@/lib/auth";

const BUCKET = "documentos";
const LIMITE_BYTES = 25 * 1024 * 1024;

export type DocState = { erro?: string; ok?: string };

function sanitizeNome(nome: string): string {
  const dot = nome.lastIndexOf(".");
  const ext =
    dot > 0 ? nome.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base =
    (dot > 0 ? nome.slice(0, dot) : nome)
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "arquivo";
  return ext ? `${base}.${ext}` : base;
}

/** Sobe o binário pro Storage e cria a linha de metadados. Retorna o id do doc. */
async function subirArquivo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  empresaId: string,
  userId: string,
  file: File,
  meta: {
    titulo: string;
    categoria: "mapeamento" | "fechamento" | "documento";
    pastaId: string | null;
    ano: number | null;
    mes: number | null;
  },
): Promise<{ id?: string; erro?: string }> {
  if (file.size > LIMITE_BYTES) return { erro: "Arquivo acima de 25MB." };
  const path = `${empresaId}/${randomUUID()}-${sanitizeNome(file.name)}`;
  const bytes = await file.arrayBuffer();
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return { erro: "Falha ao enviar o arquivo." };

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      empresa_id: empresaId,
      pasta_id: meta.pastaId,
      categoria: meta.categoria,
      titulo: meta.titulo,
      ano: meta.ano,
      mes: meta.mes,
      storage_path: path,
      mime: file.type || null,
      tamanho_bytes: file.size,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    await supabase.storage.from(BUCKET).remove([path]); // rollback do binário
    return { erro: "Arquivo enviado, mas falhou ao registrar." };
  }
  return { id: data.id };
}

// ---------------- Pastas ----------------
export async function criarPasta(formData: FormData) {
  await requireMaster();
  const empresaId = String(formData.get("empresaId") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!empresaId || nome.length < 2) return;

  const supabase = await createClient();
  const { data: max } = await supabase
    .from("pastas")
    .select("ordem")
    .eq("empresa_id", empresaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  await supabase
    .from("pastas")
    .insert({ empresa_id: empresaId, nome, ordem: (max?.ordem ?? -1) + 1 });
  revalidatePath("/documentos");
}

export async function removerPasta(formData: FormData) {
  await requireMaster();
  const pastaId = String(formData.get("pastaId") ?? "");
  if (!pastaId) return;
  const supabase = await createClient();
  await supabase.from("pastas").delete().eq("id", pastaId);
  revalidatePath("/documentos");
}

// ---------------- Documentos ----------------
export async function uploadDocumento(
  _prev: DocState,
  formData: FormData,
): Promise<DocState> {
  const userId = await requireMaster();
  const empresaId = String(formData.get("empresaId") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "documento");
  const pastaId = String(formData.get("pastaId") ?? "") || null;
  const file = formData.get("arquivo") as File | null;

  if (!empresaId) return { erro: "Empresa inválida." };
  if (!file || file.size === 0) return { erro: "Selecione um arquivo." };
  if (categoria !== "mapeamento" && categoria !== "documento") {
    return { erro: "Categoria inválida." };
  }

  const supabase = await createClient();
  const r = await subirArquivo(supabase, empresaId, userId, file, {
    titulo: titulo || file.name,
    categoria,
    pastaId,
    ano: null,
    mes: null,
  });
  if (r.erro) return { erro: r.erro };

  revalidatePath("/documentos");
  return { ok: `Documento "${titulo || file.name}" enviado.` };
}

export async function removerDocumento(formData: FormData) {
  await requireMaster();
  const documentoId = String(formData.get("documentoId") ?? "");
  if (!documentoId) return;

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documentos")
    .select("storage_path")
    .eq("id", documentoId)
    .maybeSingle();
  if (doc?.storage_path) {
    await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  }
  await supabase.from("documentos").delete().eq("id", documentoId);
  revalidatePath("/documentos");
}

// ---------------- Fechamentos mensais ----------------
export async function salvarFechamento(
  _prev: DocState,
  formData: FormData,
): Promise<DocState> {
  const userId = await requireMaster();
  const empresaId = String(formData.get("empresaId") ?? "");
  const ano = Number(formData.get("ano"));
  const mes = Number(formData.get("mes"));
  const resumo = String(formData.get("resumo") ?? "").trim();
  const file = formData.get("arquivo") as File | null;

  if (!empresaId || !ano || !mes) return { erro: "Empresa, ano ou mês inválidos." };

  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("fechamentos")
    .select("id, documento_id")
    .eq("empresa_id", empresaId)
    .eq("ano", ano)
    .eq("mes", mes)
    .maybeSingle();

  let documentoId = existente?.documento_id ?? null;
  if (file && file.size > 0) {
    const r = await subirArquivo(supabase, empresaId, userId, file, {
      titulo: `Fechamento ${String(mes).padStart(2, "0")}/${ano}`,
      categoria: "fechamento",
      pastaId: null,
      ano,
      mes,
    });
    if (r.erro) return { erro: r.erro };
    documentoId = r.id ?? documentoId;
  }

  if (existente) {
    await supabase
      .from("fechamentos")
      .update({ resumo, documento_id: documentoId, updated_at: new Date().toISOString() })
      .eq("id", existente.id);
  } else {
    await supabase.from("fechamentos").insert({
      empresa_id: empresaId,
      ano,
      mes,
      resumo,
      documento_id: documentoId,
      created_by: userId,
    });
  }

  revalidatePath("/documentos");
  return { ok: `Fechamento ${String(mes).padStart(2, "0")}/${ano} salvo (rascunho).` };
}

export async function definirStatusFechamento(formData: FormData) {
  await requireMaster();
  const fechamentoId = String(formData.get("fechamentoId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!fechamentoId || (status !== "rascunho" && status !== "publicado")) return;
  const supabase = await createClient();
  await supabase
    .from("fechamentos")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", fechamentoId);
  revalidatePath("/documentos");
}
