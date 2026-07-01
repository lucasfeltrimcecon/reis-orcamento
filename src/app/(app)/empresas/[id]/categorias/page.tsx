import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMaster } from "@/lib/auth";
import { getEmpresa } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { CategoriasLista } from "./CategoriasLista";

export const metadata = { title: "Categorias · Reis" };

type Cat = {
  tipo: "receita" | "despesa";
  categoria_norm: string;
  categoria_label: string;
  classe: "normal" | "informativo" | "oculto";
};

export default async function CategoriasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMaster();
  const { id } = await params;
  const empresa = await getEmpresa(id);
  if (!empresa) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("mapa_categoria")
    .select("tipo, categoria_norm, categoria_label, classe")
    .eq("empresa_id", id)
    .order("categoria_label");

  const cats = (data ?? []) as Cat[];
  const receitas = cats.filter((c) => c.tipo === "receita");
  const despesas = cats.filter((c) => c.tipo === "despesa");

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href={`/empresas/${id}/realizado`}
        className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
      >
        ← Realizado
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
        Categorias — {empresa.nome}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Tudo que você importa fica registrado aqui. Classifique cada categoria:{" "}
        <b>Normal</b> conta no resultado/margem; <b>Informativo</b> aparece só
        num card à parte (não soma em nada); <b>Oculto</b> some do painel. Vale
        para receita e despesa e fica salvo entre as importações.
      </p>

      {cats.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Nenhuma categoria ainda.
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Importe os arquivos do Conta Azul e as categorias aparecem aqui.
          </p>
          <Link
            href={`/empresas/${id}/realizado/importar`}
            className="mt-5 inline-block rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white"
          >
            Importar realizado →
          </Link>
        </div>
      ) : (
        <CategoriasLista empresaId={id} receitas={receitas} despesas={despesas} />
      )}
    </div>
  );
}
