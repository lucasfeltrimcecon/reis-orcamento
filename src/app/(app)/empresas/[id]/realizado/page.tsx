import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmpresa, getRealizadoResumo } from "@/lib/supabase/queries";
import { requireMaster } from "@/lib/auth";
import { fmtBRL } from "@/lib/meses";

export const metadata = { title: "Realizado · Reis" };

const ANOS = [2025, 2026, 2027];

export default async function RealizadoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ano?: string }>;
}) {
  await requireMaster();
  const { id } = await params;
  const { ano: anoParam } = await searchParams;
  const ano = Number(anoParam) || 2026;

  const empresa = await getEmpresa(id);
  if (!empresa) notFound();

  const resumo = await getRealizadoResumo(id, ano);
  const resultado = resumo.totalReceita - resumo.totalDespesa;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/empresas"
        className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--navy)]"
      >
        ← Empresas
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--navy)]">
            Realizado — {empresa.nome}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            O que de fato entrou e saiu (vindo do Conta Azul).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/empresas/${id}/categorias`}
            className="rounded-xl border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--action)] transition hover:border-[var(--action)]"
          >
            Categorias
          </Link>
          <Link
            href={`/empresas/${id}/realizado/importar?ano=${ano}`}
            className="rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0458a0] active:scale-[0.98]"
          >
            Importar realizado
          </Link>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          Ano:
        </span>
        {ANOS.map((a) => (
          <Link
            key={a}
            href={`/empresas/${id}/realizado?ano=${a}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
              a === ano
                ? "bg-[var(--navy)] text-white"
                : "bg-white text-[var(--muted)] border border-[var(--border)] hover:text-[var(--navy)]"
            }`}
          >
            {a}
          </Link>
        ))}
      </div>

      {resumo.qtdLinhas === 0 ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Nenhum realizado importado para {ano}.
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Importe a planilha de realizado para começar a comparar com o
            orçamento.
          </p>
          <Link
            href={`/empresas/${id}/realizado/importar?ano=${ano}`}
            className="mt-5 inline-block rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0458a0]"
          >
            Importar realizado
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Card label="Entrou (receita)" valor={fmtBRL(resumo.totalReceita)} cor="green" />
            <Card label="Saiu (despesa)" valor={fmtBRL(resumo.totalDespesa)} cor="ink" />
            <Card
              label="Resultado"
              valor={fmtBRL(resultado)}
              cor={resultado >= 0 ? "green" : "red"}
            />
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            {resumo.qtdLinhas} lançamentos no ano de {ano}.{" "}
            <Link href="/painel" className="font-bold text-[var(--action)]">
              Ver no painel de relógios →
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

function Card({
  label,
  valor,
  cor,
}: {
  label: string;
  valor: string;
  cor: "green" | "red" | "ink";
}) {
  const c =
    cor === "green"
      ? "var(--green)"
      : cor === "red"
        ? "var(--red)"
        : "var(--navy)";
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-extrabold tabular-nums" style={{ color: c }}>
        {valor}
      </div>
    </div>
  );
}
