"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { importarMetasXlsx, type ImportMetasState } from "../actions";

const initial: ImportMetasState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[var(--action)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0458a0] active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? "Importando…" : "Importar e salvar"}
    </button>
  );
}

export function ImportarMetasForm({
  empresaId,
  ano,
}: {
  empresaId: string;
  ano: number;
}) {
  const [state, formAction] = useActionState(importarMetasXlsx, initial);

  return (
    <form action={formAction} className="mt-6 max-w-xl space-y-4">
      <input type="hidden" name="empresaId" value={empresaId} />
      <input type="hidden" name="ano" value={ano} />

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-white px-6 py-10 text-center transition hover:border-[var(--action)] hover:bg-[#f4f9fd]">
        <svg
          width="40"
          height="40"
          fill="none"
          stroke="var(--action)"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        <span className="text-sm font-bold text-[var(--foreground)]">
          Clique para escolher a planilha (.xlsx)
        </span>
        <span className="text-xs text-[var(--muted)]">
          Formato: coluna Métrica + colunas Jan a Dez
        </span>
        <input
          type="file"
          name="arquivo"
          accept=".xlsx,.xls,.csv"
          required
          className="mt-2 text-xs"
        />
      </label>

      {state.erro && (
        <div className="rounded-lg bg-[#fceaea] px-3.5 py-2.5 text-xs font-semibold text-[var(--red)]">
          {state.erro}
        </div>
      )}

      <div className="rounded-lg bg-[#fdf4e3] px-3.5 py-2.5 text-xs font-semibold text-[#b8780c]">
        ⚠ Importar <b>substitui todas as metas de {ano}</b> (reescrita completa).
        Use o modelo acima, que já vem com os valores atuais.
      </div>

      <SubmitButton />
    </form>
  );
}
