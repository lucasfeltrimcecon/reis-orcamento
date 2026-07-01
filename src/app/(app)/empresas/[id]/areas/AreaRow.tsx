"use client";

import { useState, useTransition } from "react";
import type { Area } from "@/lib/types";
import { renomearArea, removerArea, definirMostrarArea } from "./actions";

export function AreaRow({
  area,
  empresaId,
}: {
  area: Area;
  empresaId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [mostrar, setMostrar] = useState(area.mostrar);
  const [pending, start] = useTransition();

  function toggleMostrar() {
    const novo = !mostrar;
    setMostrar(novo); // otimista
    start(async () => {
      const r = await definirMostrarArea({
        empresaId,
        areaId: area.id,
        mostrar: novo,
      });
      if (r.erro) setMostrar(!novo); // rollback
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3 last:border-0 transition hover:bg-[#fafbfd]">
      {editing ? (
        <form
          action={async (fd) => {
            await renomearArea(fd);
            setEditing(false);
          }}
          className="flex flex-1 gap-2"
        >
          <input type="hidden" name="empresaId" value={empresaId} />
          <input type="hidden" name="areaId" value={area.id} />
          <input
            name="nome"
            defaultValue={area.nome}
            autoFocus
            className="flex-1 rounded-lg border border-[var(--action)] bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-3 focus:ring-[#0369a126]"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--action)] px-3 py-1.5 text-xs font-bold text-white"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]"
          >
            Cancelar
          </button>
        </form>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleMostrar}
              disabled={pending}
              role="switch"
              aria-checked={mostrar}
              aria-label={`${mostrar ? "Tirar do" : "Incluir no"} painel: ${area.nome}`}
              className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${
                mostrar ? "bg-[var(--green)]" : "bg-[var(--border)]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  mostrar ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
            <span
              className={
                mostrar
                  ? "truncate text-sm font-semibold text-[var(--foreground)]"
                  : "truncate text-sm text-[var(--muted)] line-through"
              }
            >
              {area.nome}
            </span>
            {!mostrar && (
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                fora do painel
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--muted)] transition hover:bg-[var(--background)] hover:text-[var(--navy)]"
            >
              Renomear
            </button>
            <form action={removerArea}>
              <input type="hidden" name="empresaId" value={empresaId} />
              <input type="hidden" name="areaId" value={area.id} />
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--muted)] transition hover:bg-[#fceaea] hover:text-[var(--red)]"
              >
                Remover
              </button>
            </form>
          </div>
        </>
      )}
    </li>
  );
}
