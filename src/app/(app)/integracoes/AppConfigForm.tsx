"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { salvarApp, type AppState } from "./actions";

function Salvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--action-hover)] active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? "Salvando…" : "Salvar credenciais"}
    </button>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm transition focus:border-[var(--action)] focus:outline-none";

export function AppConfigForm({
  clientId,
  temSecret,
  scope,
  redirectUri,
}: {
  clientId: string;
  temSecret: boolean;
  scope: string;
  redirectUri: string;
}) {
  const [state, action] = useActionState<AppState, FormData>(salvarApp, {});

  return (
    <form action={action} className="mt-4 space-y-4">
      <div>
        <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
          URL de redirecionamento (cole no portal do Conta Azul)
        </label>
        <code className="block overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--navy)]">
          {redirectUri}
        </code>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
            client_id
          </label>
          <input
            name="client_id"
            type="text"
            defaultValue={clientId}
            placeholder="cole o client_id"
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
            client_secret
          </label>
          <input
            name="client_secret"
            type="password"
            autoComplete="off"
            placeholder={
              temSecret
                ? "•••••• (configurado — deixe em branco p/ manter)"
                : "cole o client_secret"
            }
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
          scopes (separados por espaço — o que você marcou no portal)
        </label>
        <input
          name="scope"
          type="text"
          defaultValue={scope}
          placeholder="ex: openid profile financial:read"
          className={inputCls}
        />
      </div>

      {state.erro && (
        <div className="rounded-lg bg-[#fceaea] px-3.5 py-2.5 text-xs font-semibold text-[var(--red)]">
          {state.erro}
        </div>
      )}
      {state.ok && (
        <div className="rounded-lg bg-[#e7f6ec] px-3.5 py-2.5 text-xs font-semibold text-[#15803d]">
          {state.ok}
        </div>
      )}

      <Salvar />
    </form>
  );
}
