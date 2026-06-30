"use client";

import { useState } from "react";

export function ConectarBase({ empresaId }: { empresaId: string }) {
  const [apelido, setApelido] = useState("");

  function conectar() {
    const a = apelido.trim() || "Conta Azul";
    window.location.href = `/api/contaazul/conectar?empresa=${empresaId}&apelido=${encodeURIComponent(a)}`;
  }

  return (
    <div>
      <p className="mb-2 text-xs font-bold text-[var(--foreground)]">
        Conectar outra base
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={apelido}
          onChange={(e) => setApelido(e.target.value)}
          placeholder="apelido da base (ex: EVO Matriz)"
          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm transition focus:border-[var(--action)] focus:outline-none"
        />
        <button
          type="button"
          onClick={conectar}
          className="rounded-lg bg-[var(--action)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--action-hover)] active:scale-[0.98]"
        >
          + Conectar base
        </button>
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        Dica: use o login do Conta Azul <b>desta empresa</b> (numa janela
        anônima, se já estiver logado em outro Conta Azul).
      </p>
    </div>
  );
}
