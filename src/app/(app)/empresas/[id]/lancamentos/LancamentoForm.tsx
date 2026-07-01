"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { MESES_ABREV } from "@/lib/meses";
import { adicionarLancamento, type LancState } from "./actions";

const ANOS = [2025, 2026, 2027];
const inputCls =
  "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm transition focus:border-[var(--action)] focus:outline-none";

function Salvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--action-hover)] active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? "Salvando…" : "Adicionar lançamento"}
    </button>
  );
}

function Seg<T extends string>({
  valor,
  opcoes,
  onChange,
}: {
  valor: T;
  opcoes: { v: T; rotulo: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-[var(--border)]">
      {opcoes.map((o) => {
        const on = o.v === valor;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`px-3 py-1.5 text-xs font-bold transition ${
              on
                ? "bg-[var(--navy)] text-white"
                : "bg-white text-[var(--muted)] hover:bg-[var(--background)]"
            }`}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

export function LancamentoForm({
  empresaId,
  areas,
}: {
  empresaId: string;
  areas: { id: string; nome: string }[];
}) {
  const [state, action] = useActionState<LancState, FormData>(
    adicionarLancamento,
    {},
  );
  const agora = new Date();
  const [tipo, setTipo] = useState<"receita" | "despesa">("despesa");
  const [classe, setClasse] = useState<"normal" | "informativo">("normal");

  return (
    <form action={action} className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <input type="hidden" name="empresaId" value={empresaId} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="classe" value={classe} />

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
            Tipo
          </span>
          <Seg
            valor={tipo}
            onChange={setTipo}
            opcoes={[
              { v: "despesa", rotulo: "Despesa" },
              { v: "receita", rotulo: "Receita" },
            ]}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
            Classificação
          </span>
          <Seg
            valor={classe}
            onChange={setClasse}
            opcoes={[
              { v: "normal", rotulo: "Normal" },
              { v: "informativo", rotulo: "Informativo" },
            ]}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-[11px] font-bold text-[var(--muted)]">
            Ano
          </label>
          <select name="ano" defaultValue={agora.getFullYear()} className={inputCls}>
            {ANOS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-[var(--muted)]">
            Mês
          </label>
          <select name="mes" defaultValue={agora.getMonth() + 1} className={inputCls}>
            {MESES_ABREV.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-[var(--muted)]">
            Valor (R$)
          </label>
          <input
            name="valor"
            type="number"
            step="0.01"
            required
            placeholder="0,00"
            className={`${inputCls} text-right tabular-nums`}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-[var(--muted)]">
            Centro de custo {tipo === "receita" ? "(só despesa)" : ""}
          </label>
          <select
            name="areaId"
            disabled={tipo === "receita"}
            defaultValue=""
            className={`${inputCls} disabled:opacity-50`}
          >
            <option value="">Sem área</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-[11px] font-bold text-[var(--muted)]">
          Descrição
        </label>
        <input
          name="descricao"
          type="text"
          required
          maxLength={120}
          placeholder="ex: Ajuste de receita não faturada"
          className={inputCls}
        />
      </div>

      {state.erro && (
        <div className="mt-3 rounded-lg bg-[#fceaea] px-3.5 py-2.5 text-xs font-semibold text-[var(--red)]">
          {state.erro}
        </div>
      )}
      {state.ok && (
        <div className="mt-3 rounded-lg bg-[#e7f6ec] px-3.5 py-2.5 text-xs font-semibold text-[#15803d]">
          Lançamento adicionado.
        </div>
      )}

      <div className="mt-4">
        <Salvar />
      </div>
    </form>
  );
}
