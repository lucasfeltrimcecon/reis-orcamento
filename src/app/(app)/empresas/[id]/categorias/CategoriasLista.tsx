"use client";

import { useState, useTransition } from "react";
import { definirClasse, type Classe } from "./actions";

type Cat = {
  tipo: "receita" | "despesa";
  categoria_norm: string;
  categoria_label: string;
  classe: Classe;
};

const OPCOES: { valor: Classe; rotulo: string; cor: string }[] = [
  { valor: "normal", rotulo: "Normal", cor: "var(--green)" },
  { valor: "informativo", rotulo: "Informativo", cor: "#b8780c" },
  { valor: "oculto", rotulo: "Oculto", cor: "var(--muted)" },
];

export function CategoriasLista({
  empresaId,
  receitas,
  despesas,
}: {
  empresaId: string;
  receitas: Cat[];
  despesas: Cat[];
}) {
  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <Grupo titulo="Receitas" empresaId={empresaId} cats={receitas} />
      <Grupo titulo="Despesas" empresaId={empresaId} cats={despesas} />
    </div>
  );
}

function Grupo({
  titulo,
  empresaId,
  cats,
}: {
  titulo: string;
  empresaId: string;
  cats: Cat[];
}) {
  const normais = cats.filter((c) => c.classe === "normal").length;
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--navy)]">{titulo}</h2>
        <span className="text-xs font-semibold text-[var(--muted)]">
          {normais}/{cats.length} no painel
        </span>
      </div>
      {cats.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Nenhuma categoria ainda. Importe ou sincronize o Conta Azul.
        </p>
      ) : (
        <ul className="mt-2">
          {cats.map((c) => (
            <Linha key={c.tipo + c.categoria_norm} empresaId={empresaId} cat={c} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Linha({ empresaId, cat }: { empresaId: string; cat: Cat }) {
  const [classe, setClasse] = useState<Classe>(cat.classe);
  const [pending, start] = useTransition();

  function escolher(nova: Classe) {
    if (nova === classe) return;
    const anterior = classe;
    setClasse(nova); // otimista
    start(async () => {
      const r = await definirClasse({
        empresaId,
        tipo: cat.tipo,
        categoriaNorm: cat.categoria_norm,
        classe: nova,
      });
      if (r.erro) setClasse(anterior); // rollback
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-2.5 last:border-0">
      <span
        className={
          classe === "oculto"
            ? "min-w-0 truncate text-sm text-[var(--muted)] line-through"
            : "min-w-0 truncate text-sm font-semibold text-[var(--ink)]"
        }
      >
        {cat.categoria_label}
      </span>
      <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
        {OPCOES.map((o) => {
          const on = classe === o.valor;
          return (
            <button
              key={o.valor}
              type="button"
              onClick={() => escolher(o.valor)}
              disabled={pending}
              aria-pressed={on}
              className={`px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-60 ${
                on ? "text-white" : "bg-white text-[var(--muted)] hover:bg-[var(--background)]"
              }`}
              style={on ? { backgroundColor: o.cor } : undefined}
            >
              {o.rotulo}
            </button>
          );
        })}
      </div>
    </li>
  );
}
