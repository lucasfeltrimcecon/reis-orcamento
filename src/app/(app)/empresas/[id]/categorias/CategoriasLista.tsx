"use client";

import { useState, useTransition } from "react";
import { definirCategoria } from "./actions";

type Cat = {
  tipo: "receita" | "despesa";
  categoria_norm: string;
  categoria_label: string;
  ignorar: boolean;
};

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
  const ativas = cats.filter((c) => !c.ignorar).length;
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[var(--navy)]">{titulo}</h2>
        <span className="text-xs font-semibold text-[var(--muted)]">
          {ativas}/{cats.length} no painel
        </span>
      </div>
      {cats.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Nenhuma categoria ainda. Importe um arquivo do Conta Azul.
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
  const [ativo, setAtivo] = useState(!cat.ignorar); // ativo = considerar no painel
  const [pending, start] = useTransition();

  function toggle() {
    const novo = !ativo;
    setAtivo(novo); // otimista
    start(async () => {
      const r = await definirCategoria({
        empresaId,
        tipo: cat.tipo,
        categoriaNorm: cat.categoria_norm,
        ignorar: !novo,
      });
      if (r.erro) setAtivo(!novo); // rollback
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-2.5 last:border-0">
      <span
        className={
          ativo
            ? "text-sm font-semibold text-[var(--ink)]"
            : "text-sm text-[var(--muted)] line-through"
        }
      >
        {cat.categoria_label}
      </span>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        role="switch"
        aria-checked={ativo}
        aria-label={`${ativo ? "Tirar do" : "Incluir no"} painel: ${cat.categoria_label}`}
        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${
          ativo ? "bg-[var(--green)]" : "bg-[var(--border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            ativo ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </li>
  );
}
