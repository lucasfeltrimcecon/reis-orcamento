"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { criarEmpresa, type NovaEmpresaState } from "./actions";

const initialState: NovaEmpresaState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[var(--action)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0458a0] hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? "Criando…" : "Criar empresa"}
    </button>
  );
}

export function NovaEmpresaForm() {
  const [state, formAction] = useActionState(criarEmpresa, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="nome"
          className="mb-1.5 block text-xs font-bold text-[var(--foreground)]"
        >
          Nome da empresa
        </label>
        <input
          id="nome"
          name="nome"
          required
          autoFocus
          placeholder="Ex.: ESPEcast"
          className="w-full max-w-md rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm transition focus:border-[var(--action)] focus:outline-none focus:ring-3 focus:ring-[#0369a126]"
        />
      </div>

      <label className="flex max-w-md items-start gap-3 rounded-xl border border-[var(--border)] bg-white p-4 cursor-pointer">
        <input
          type="checkbox"
          name="criarAreasPadrao"
          defaultChecked
          className="mt-0.5 h-4 w-4 accent-[var(--action)]"
        />
        <span>
          <span className="block text-sm font-bold text-[var(--foreground)]">
            Já criar as áreas-padrão
          </span>
          <span className="block text-xs text-[var(--muted)]">
            Comercial, Financeiro, Administrativo, Marketing, RH, Diretoria,
            Impostos e Taxas. Você edita depois.
          </span>
        </span>
      </label>

      {state.error && (
        <div className="max-w-md rounded-lg bg-[#fceaea] px-3.5 py-2.5 text-xs font-semibold text-[var(--red)]">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
