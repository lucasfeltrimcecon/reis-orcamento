"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Dropdown } from "@/components/Dropdown";
import { fmtBRL, MESES_NOME } from "@/lib/meses";
import {
  analisarContaAzul,
  confirmarContaAzul,
  type AnaliseResult,
  type PreviewItem,
} from "./actions";

const ANOS = [2025, 2026, 2027];

// Junta arquivos novos aos já escolhidos, sem duplicar (nome+tamanho).
function mergeFiles(atual: File[], novos: File[]): File[] {
  const chave = (f: File) => `${f.name}:${f.size}`;
  const existentes = new Set(atual.map(chave));
  return [...atual, ...novos.filter((f) => !existentes.has(chave(f)))];
}

function Dropzone({
  label,
  files,
  onAdd,
  onRemove,
}: {
  label: string;
  files: File[];
  onAdd: (fs: File[]) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-white px-5 py-6 transition focus-within:border-[var(--action)]">
      <label className="flex cursor-pointer flex-col gap-2">
        <span className="text-sm font-bold text-[var(--navy)]">{label}</span>
        <span className="text-xs text-[var(--muted)]">
          Clique pra escolher — pode adicionar vários, um de cada vez
        </span>
        <input
          type="file"
          accept=".xls,.xlsx,.csv"
          multiple
          onChange={(e) => {
            onAdd(Array.from(e.target.files ?? []));
            // limpa o input p/ permitir re-selecionar e ACUMULAR mais arquivos
            e.target.value = "";
          }}
          className="mt-1 text-xs"
        />
      </label>
      {files.length > 0 && (
        <ul className="mt-1 space-y-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-[#f4f9fd] px-2.5 py-1.5"
            >
              <span className="truncate text-xs font-semibold text-[var(--green)]">
                ✓ {f.name}
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remover ${f.name}`}
                className="shrink-0 rounded px-1.5 text-xs font-bold text-[var(--muted)] transition hover:text-[var(--red)]"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
  const [analise, analisarAction, analisando] = useActionState<
    AnaliseResult,
    FormData
  >(analisarContaAzul, {});
  const [itens, setItens] = useState<PreviewItem[]>([]);
  const [etapa, setEtapa] = useState<"upload" | "preview" | "done">("upload");
  const [erroConfirm, setErroConfirm] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // ----- estado da etapa de upload (acumula arquivos) -----
  const [ano, setAno] = useState(defaultAno);
  const [mes, setMes] = useState(defaultMes);
  const [receitaFiles, setReceitaFiles] = useState<File[]>([]);
  const [despesaFiles, setDespesaFiles] = useState<File[]>([]);

  useEffect(() => {
    if (analise.itens) {
      setItens(analise.itens);
      setEtapa("preview");
    }
  }, [analise]);

  function processar() {
    const fd = new FormData();
    fd.set("empresaId", empresaId);
    fd.set("ano", String(ano));
    fd.set("mes", String(mes));
    receitaFiles.forEach((f) => fd.append("receita", f));
    despesaFiles.forEach((f) => fd.append("despesa", f));
    analisarAction(fd);
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
        <p className="mt-2 text-xs text-[var(--muted)]">
          Tudo foi importado. Ajuste o que conta no painel em{" "}
          <b className="text-[var(--navy)]">Categorias</b>.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/painel"
            className="rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white"
          >
            Ver no painel →
          </Link>
          <Link
            href={`/empresas/${empresaId}/categorias`}
            className="rounded-xl border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--action)]"
          >
            Categorias
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

    const totalRec = receitas.reduce((s, x) => s + x.it.valor, 0);
    const totalDesp = despesas.reduce((s, x) => s + x.it.valor, 0);

    return (
      <div className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--muted)]">
            Prévia de{" "}
            <b className="text-[var(--navy)]">
              {MESES_NOME[(analise.mes ?? 1) - 1]}/{analise.ano}
            </b>
            . <b>Tudo será importado</b> — depois você liga/desliga o que conta
            no painel em <b className="text-[var(--action)]">Categorias</b>.
          </p>
          <button
            onClick={() => setEtapa("upload")}
            className="text-xs font-bold text-[var(--muted)] underline"
          >
            ← trocar arquivos
          </button>
        </div>

        <TabelaPreview
          titulo="Receitas"
          linhas={receitas}
          total={totalRec}
          mostrarArea={false}
        />
        <div className="h-5" />
        <TabelaPreview
          titulo="Despesas"
          linhas={despesas}
          total={totalDesp}
          mostrarArea
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
              ? "Importando…"
              : `Importar tudo — reescreve ${MESES_NOME[(analise.mes ?? 1) - 1]}/${analise.ano}`}
          </button>
          <span className="text-xs text-[var(--muted)]">
            Receitas {fmtBRL(totalRec)} · Despesas {fmtBRL(totalDesp)}
          </span>
        </div>
      </div>
    );
  }

  // ---------- ETAPA: UPLOAD ----------
  const totalArquivos = receitaFiles.length + despesaFiles.length;
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
            Mês
          </label>
          <Dropdown
            size="sm"
            ariaLabel="Mês"
            className="w-44"
            value={String(mes)}
            options={MESES_NOME.map((m, i) => ({ value: String(i + 1), label: m }))}
            onChange={(v) => setMes(Number(v))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
            Ano
          </label>
          <Dropdown
            size="sm"
            ariaLabel="Ano"
            className="w-28"
            value={String(ano)}
            options={ANOS.map((a) => ({ value: String(a), label: String(a) }))}
            onChange={(v) => setAno(Number(v))}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Dropzone
          label="Receitas (Contas a Receber)"
          files={receitaFiles}
          onAdd={(fs) => setReceitaFiles((cur) => mergeFiles(cur, fs))}
          onRemove={(i) =>
            setReceitaFiles((cur) => cur.filter((_, idx) => idx !== i))
          }
        />
        <Dropzone
          label="Despesas (Contas a Pagar)"
          files={despesaFiles}
          onAdd={(fs) => setDespesaFiles((cur) => mergeFiles(cur, fs))}
          onRemove={(i) =>
            setDespesaFiles((cur) => cur.filter((_, idx) => idx !== i))
          }
        />
      </div>

      {analise.erro && (
        <div className="mt-4 rounded-lg bg-[#fceaea] px-3.5 py-2.5 text-xs font-semibold text-[var(--red)]">
          {analise.erro}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={processar}
          disabled={analisando || totalArquivos === 0}
          className="rounded-xl bg-[var(--action)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0458a0] active:scale-[0.98] disabled:opacity-60"
        >
          {analisando
            ? "Lendo arquivos…"
            : `Processar ${totalArquivos || ""} arquivo${totalArquivos === 1 ? "" : "s"}`.trim()}
        </button>
        {totalArquivos > 0 && (
          <span className="text-xs text-[var(--muted)]">
            {receitaFiles.length} receita{receitaFiles.length === 1 ? "" : "s"} ·{" "}
            {despesaFiles.length} despesa{despesaFiles.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </div>
  );
}

function TabelaPreview({
  titulo,
  linhas,
  total,
  mostrarArea,
}: {
  titulo: string;
  linhas: { it: PreviewItem; i: number }[];
  total: number;
  mostrarArea: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[#fbfcfe] px-5 py-3">
        <h3 className="text-sm font-bold text-[var(--navy)]">{titulo}</h3>
        <span className="text-xs font-bold text-[var(--muted)] tabular-nums">
          total: {fmtBRL(total)}
        </span>
      </div>
      {linhas.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-[var(--muted)]">
          Nenhum arquivo deste tipo.
        </p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {linhas.map(({ it }) => (
              <tr
                key={it.categoriaNorm}
                className="border-b border-[var(--border)] last:border-0"
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
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                      it.ignorar
                        ? "bg-[#fdf4e3] text-[#b8780c]"
                        : "bg-[#e7f6ec] text-[#15803d]"
                    }`}
                  >
                    {it.ignorar ? "fora do painel" : "no painel"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
