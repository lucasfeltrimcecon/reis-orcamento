"use client";

import { useFormStatus } from "react-dom";
import { criarConexao } from "./actions";

const inputCls =
  "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm transition focus:border-[var(--action)] focus:outline-none";

function Conectar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[var(--action)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--action-hover)] active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? "Conectando…" : "+ Conectar base"}
    </button>
  );
}

export function ConectarBase({
  empresaId,
  redirectUri,
}: {
  empresaId: string;
  redirectUri: string;
}) {
  return (
    <form action={criarConexao}>
      <input type="hidden" name="empresaId" value={empresaId} />
      <p className="mb-3 text-xs font-bold text-[var(--foreground)]">
        Nova integração — cole as credenciais do app criado no Conta Azul{" "}
        <b>desta base</b>
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-bold text-[var(--muted)]">
            Apelido da base
          </label>
          <input
            name="apelido"
            type="text"
            placeholder="ex: EVO Matriz"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-[var(--muted)]">
            client_id
          </label>
          <input
            name="client_id"
            type="text"
            required
            placeholder="cole o client_id desta CA"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-bold text-[var(--muted)]">
            client_secret
          </label>
          <input
            name="client_secret"
            type="password"
            autoComplete="off"
            required
            placeholder="cole o client_secret desta CA"
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[11px] font-bold text-[var(--muted)]">
            scopes (opcional — separados por espaço)
          </label>
          <input
            name="scope"
            type="text"
            placeholder="ex: openid profile (deixe vazio se o portal não pedir)"
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-[11px] font-bold text-[var(--muted)]">
          URL de redirecionamento (cole no portal do app desta base)
        </label>
        <code className="block overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--navy)]">
          {redirectUri}
        </code>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Conectar />
        <span className="text-[11px] text-[var(--muted)]">
          Use o login do Conta Azul <b>desta base</b> (janela anônima se já
          estiver logado em outro).
        </span>
      </div>
    </form>
  );
}
