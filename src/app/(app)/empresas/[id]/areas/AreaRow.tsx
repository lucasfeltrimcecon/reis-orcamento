"use client";

import { useState } from "react";
import type { Area } from "@/lib/types";
import { renomearArea, removerArea } from "./actions";

export function AreaRow({
  area,
  empresaId,
}: {
  area: Area;
  empresaId: string;
}) {
  const [editing, setEditing] = useState(false);

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
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {area.nome}
          </span>
          <div className="flex items-center gap-1">
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
