"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { fmtBRL, MESES_NOME } from "@/lib/meses";
import {
  analisarContaAzul,
  confirmarContaAzul,
  type AnaliseResult,
  type PreviewItem,
} from "./actions";

const ANOS = [2025, 2026, 2027];

function ProcessarButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[var(--action)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0458a0] active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? "Lendo arquivos…" : "Processar arquivos"}
    </button>
  );
}

function Dropzone({ name, label }: { name: string; label: string }) {
  const [nomes, setNomes] = useState<string[]>([]);
  return (
    <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-white px-5 py-6 transition hover:border-[var(--action)] hover:bg-[#f4f9fd]">
      <span className="text-sm font-bold text-[var(--navy)]">{label}</span>
      <span className="text-xs text-[var(--muted)]">
        Clique ou arraste — pode selecionar vários
      </span>
      <input
        type="file"
        name={name}
        accept=".xls,.xlsx,.csv"
        multiple
        onChange={(e) =>
          setNomes(Array.from(e.target.files ?? []).map((f) => f.name))
        }
        className="mt-1 text-xs"
      />
      {nomes.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {nomes.map((n) => (
            <li key={n} className="text-xs font-semibold text-[var(--green)]">
              ✓ {n}
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}

export function ImportarContaAzul({
  empresaId,
  defaultAno,
  defaultMes,
}: {
  empresaId: string;
  defaultAno: number;
  defaultMes: number;
}) {
  const [analise, analisarAction] = useActionState<AnaliseResult, FormData>(
    analisarContaAzul,
    {},
  );
  const [itens, setItens] = useState<PreviewItem[]>([]);
  const [etapa, setEtapa] = useState<"upload" | "preview" | "done">("upload");
  const [erroConfirm, setErroConfirm] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (analise.itens) {
      setItens(analise.itens);
      setEtapa("preview");
    }
  }, [analise]);

  function toggle(i: number) {
    setItens((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, ignorar: !it.ignorar } : it)),
    );
  }

  function confirmar() {
    setErroConfirm(null);
    startTransition(async () => {
      const r = await confirmarContaAzul({
        empresaId,
        ano: analise.ano!,
        mes: analise.mes!,
        itens,
      });
      if (r.erro) setErroConfirm(r.erro);
      else setEtapa("done");
    });
  }

  // ---------- ETAPA: DONE ----------
  if (etapa === "done") {
    return (
      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-white px-6 py-12 text-center shadow-sm">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#e7f6ec] text-2xl text-[var(--green)]">
          ✓
        </div>
        <p className="text-base font-bold text-[var(--navy)]">
          Realizado de {MESES_NOME[(analise.mes ?? 1) - 1]}/{analise.ano} importado!
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link
            href="/painel"
            className="rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white"
          >
            Ver no painel →
          </Link>
          <Link
            href={`/empresas/${empresaId}/realizado`}
            className="rounded-xl border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--muted)]"
          >
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  // ---------- ETAPA: PREVIEW ----------
  if (etapa === "preview") {
    const receitas = itens
      .map((it, i) => ({ it, i }))
      .filter((x) => x.it.tipo === "receita")
      .sort((a, b) => b.it.valor - a.it.valor);
    const despesas = itens
      .map((it, i) => ({ it, i }))
      .filter((x) => x.it.tipo === "despesa")
      .sort((a, b) => b.it.valor - a.it.valor);

    const totalRec = receitas.filter((x) => !x.it.ignorar).reduce((s, x) => s + x.it.valor, 0);
    const totalDesp = despesas.filter((x) => !x.it.ignorar).reduce((s, x) => s + x.it.valor, 0);

    return (
      <div className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--muted)]">
            Revise o que entra no painel de{" "}
            <b className="text-[var(--navy)]">
              {MESES_NOME[(analise.mes ?? 1) - 1]}/{analise.ano}
            </b>
            . Categorias <span className="font-bold text-[var(--action)]">novas</span>{" "}
            já vêm com uma sugestão — confirme ou ajuste.
          </p>
          <button
            onClick={() => setEtapa("upload")}
            className="text-xs font-bold text-[var(--muted)] underline"
          >
            ← trocar arquivos
          </button>
        </div>

        <TabelaPreview
          titulo="Receitas (entram no Faturou)"
          linhas={receitas}
          total={totalRec}
          mostrarArea={false}
          onToggle={toggle}
        />
        <div className="h-5" />
        <TabelaPreview
          titulo="Despesas (relógios por área)"
          linhas={despesas}
          total={totalDesp}
          mostrarArea
          onToggle={toggle}
        />

        {erroConfirm && (
          <div className="mt-4 rounded-lg bg-[#fceaea] px-3.5 py-2.5 text-xs font-semibold text-[var(--red)]">
            {erroConfirm}
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={confirmar}
            disabled={pending}
            className="rounded-xl bg-[var(--action)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0458a0] active:scale-[0.98] disabled:opacity-60"
          >
            {pending
              ? "Salvando…"
              : `Confirmar — reescreve ${MESES_NOME[(analise.mes ?? 1) - 1]}/${analise.ano}`}
          </button>
          <span className="text-xs text-[var(--muted)]">
            Faturou {fmtBRL(totalRec)} · Gastou {fmtBRL(totalDesp)}
          </span>
        </div>
      </div>
    );
  }

  // ---------- ETAPA: UPLOAD ----------
  return (
    <form action={analisarAction} className="mt-6">
      <input type="hidden" name="empresaId" value={empresaId} />

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
            Mês
          </label>
          <select
            name="mes"
            defaultValue={defaultMes}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-semibold"
          >
            {MESES_NOME.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
            Ano
          </label>
          <select
            name="ano"
            defaultValue={defaultAno}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-semibold"
          >
            {ANOS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Dropzone name="receita" label="Receitas (Contas a Receber)" />
        <Dropzone name="despesa" label="Despesas (Contas a Pagar)" />
      </div>

      {analise.erro && (
        <div className="mt-4 rounded-lg bg-[#fceaea] px-3.5 py-2.5 text-xs font-semibold text-[var(--red)]">
          {analise.erro}
        </div>
      )}

      <div className="mt-5">
        <ProcessarButton />
      </div>
    </form>
  );
}

function TabelaPreview({
  titulo,
  linhas,
  total,
  mostrarArea,
  onToggle,
}: {
  titulo: string;
  linhas: { it: PreviewItem; i: number }[];
  total: number;
  mostrarArea: boolean;
  onToggle: (i: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[#fbfcfe] px-5 py-3">
        <h3 className="text-sm font-bold text-[var(--navy)]">{titulo}</h3>
        <span className="text-xs font-bold text-[var(--muted)] tabular-nums">
          incluído: {fmtBRL(total)}
        </span>
      </div>
      {linhas.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-[var(--muted)]">
          Nenhum arquivo deste tipo.
        </p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {linhas.map(({ it, i }) => (
              <tr
                key={it.categoriaNorm}
                className={`border-b border-[var(--border)] last:border-0 ${it.ignorar ? "opacity-50" : ""}`}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--ink)]">
                      {it.categoria}
                    </span>
                    {it.isNew && (
                      <span className="rounded bg-[#e8f1f9] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--action)]">
                        nova
                      </span>
                    )}
                  </div>
                  {mostrarArea && (
                    <div className="text-xs text-[var(--muted)]">
                      área: {it.area || "—"}
                      {it.area && !it.areaExiste && " (será criada)"}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-right font-bold tabular-nums text-[var(--ink)]">
                  {fmtBRL(it.valor)}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onToggle(i)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      it.ignorar
                        ? "border border-[var(--border)] bg-white text-[var(--muted)]"
                        : "bg-[#e7f6ec] text-[#15803d]"
                    }`}
                  >
                    {it.ignorar ? "Ignorado" : "Incluído"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
