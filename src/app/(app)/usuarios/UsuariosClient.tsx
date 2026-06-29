"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { UsuarioComEmpresas } from "@/lib/types";
import {
  criarUsuario,
  vincularEmpresa,
  desvincularEmpresa,
  excluirUsuario,
  type UsuarioState,
} from "./actions";

type EmpresaMini = { id: string; nome: string };

function gerarSenha(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 12; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function BotaoCriar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[var(--action)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0458a0] active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? "Criando…" : "Criar acesso"}
    </button>
  );
}

export function UsuariosClient({
  usuarios,
  empresas,
}: {
  usuarios: UsuarioComEmpresas[];
  empresas: EmpresaMini[];
}) {
  const [state, action] = useActionState<UsuarioState, FormData>(
    criarUsuario,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [senha, setSenha] = useState("");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setSenha("");
    }
  }, [state.ok]);

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm transition focus:border-[var(--action)] focus:outline-none";

  return (
    <div className="mt-8 space-y-8">
      {/* ---------- Novo acesso ---------- */}
      <section className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-[var(--navy)]">Novo acesso</h2>
        <form ref={formRef} action={action} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
                E-mail
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="cliente@empresa.com.br"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
                Nome (opcional)
              </label>
              <input name="nome" type="text" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
              Senha temporária
            </label>
            <div className="flex gap-2">
              <input
                name="senha"
                type="text"
                required
                minLength={8}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="mín. 8 caracteres"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => setSenha(gerarSenha())}
                className="shrink-0 rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-xs font-bold text-[var(--action)] transition hover:border-[var(--action)]"
              >
                Gerar
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Anote e passe ao cliente — ele pode trocar depois.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[var(--foreground)]">
              Empresas que esse usuário acessa
            </label>
            {empresas.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">
                Cadastre uma empresa primeiro.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {empresas.map((e) => (
                  <label
                    key={e.id}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--navy)] transition has-[:checked]:border-[var(--action)] has-[:checked]:bg-[#f4f9fd]"
                  >
                    <input
                      type="checkbox"
                      name="empresaIds"
                      value={e.id}
                      className="accent-[var(--action)]"
                    />
                    {e.nome}
                  </label>
                ))}
              </div>
            )}
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

          <BotaoCriar />
        </form>
      </section>

      {/* ---------- Lista ---------- */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-[var(--ink)]">
          Acessos ({usuarios.length})
        </h2>
        <div className="space-y-3">
          {usuarios.map((u) => (
            <UsuarioCard key={u.id} u={u} empresas={empresas} />
          ))}
        </div>
      </section>
    </div>
  );
}

function UsuarioCard({
  u,
  empresas,
}: {
  u: UsuarioComEmpresas;
  empresas: EmpresaMini[];
}) {
  const isMaster = u.role === "master";
  const naoVinculadas = empresas.filter(
    (e) => !u.empresas.some((x) => x.id === e.id),
  );

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold text-[var(--navy)]">
              {u.email}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                isMaster
                  ? "bg-[var(--navy)] text-white"
                  : "bg-[#e8f1f9] text-[var(--action)]"
              }`}
            >
              {isMaster ? "Master" : "Cliente"}
            </span>
          </div>
          {u.full_name && (
            <p className="text-xs text-[var(--muted)]">{u.full_name}</p>
          )}
        </div>

        {!isMaster && (
          <form
            action={excluirUsuario}
            onSubmit={(e) => {
              if (!confirm(`Excluir o acesso de ${u.email}?`))
                e.preventDefault();
            }}
          >
            <input type="hidden" name="userId" value={u.id} />
            <button
              type="submit"
              className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-bold text-[var(--muted)] transition hover:border-[var(--red)] hover:text-[var(--red)]"
            >
              Excluir
            </button>
          </form>
        )}
      </div>

      {isMaster ? (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Acesso total a todas as empresas (equipe Reis).
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {u.empresas.length === 0 ? (
              <span className="text-xs font-semibold text-[var(--red)]">
                Sem empresa vinculada — não consegue entrar.
              </span>
            ) : (
              u.empresas.map((emp) => (
                <span
                  key={emp.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#f4f9fd] px-2.5 py-1 text-xs font-semibold text-[var(--navy)]"
                >
                  {emp.nome}
                  <form action={desvincularEmpresa} className="inline">
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="empresaId" value={emp.id} />
                    <button
                      type="submit"
                      aria-label={`Remover ${emp.nome}`}
                      className="text-[var(--muted)] transition hover:text-[var(--red)]"
                    >
                      ✕
                    </button>
                  </form>
                </span>
              ))
            )}
          </div>

          {naoVinculadas.length > 0 && (
            <form
              action={vincularEmpresa}
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="userId" value={u.id} />
              <select
                name="empresaId"
                defaultValue={naoVinculadas[0].id}
                className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-semibold"
              >
                {naoVinculadas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-bold text-[var(--action)] transition hover:border-[var(--action)]"
              >
                + vincular
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
