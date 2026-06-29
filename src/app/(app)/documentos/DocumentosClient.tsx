"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { MESES_NOME } from "@/lib/meses";
import type { Documento, Fechamento, Pasta } from "@/lib/types";
import {
  uploadDocumento,
  salvarFechamento,
  criarPasta,
  removerPasta,
  removerDocumento,
  definirStatusFechamento,
  type DocState,
} from "./actions";

const ANOS = [2025, 2026, 2027];

function fmtTamanho(b: number | null): string {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

const cardCls =
  "rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm";
const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm transition focus:border-[var(--action)] focus:outline-none";

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0458a0] active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function DocumentosClient({
  empresaId,
  isMaster,
  pastas,
  documentos,
  fechamentos,
}: {
  empresaId: string;
  isMaster: boolean;
  pastas: Pasta[];
  documentos: Documento[];
  fechamentos: Fechamento[];
}) {
  const [upState, upAction] = useActionState<DocState, FormData>(
    uploadDocumento,
    {},
  );
  const [fecState, fecAction] = useActionState<DocState, FormData>(
    salvarFechamento,
    {},
  );

  const semPasta = documentos.filter((d) => !d.pasta_id);
  const docsDe = (pastaId: string) =>
    documentos.filter((d) => d.pasta_id === pastaId);

  const hoje = new Date();

  return (
    <div className="mt-6 space-y-6">
      {/* ---------- Master: enviar documento ---------- */}
      {isMaster && (
        <section className={cardCls}>
          <h2 className="text-sm font-bold text-[var(--navy)]">
            Enviar documento
          </h2>
          <form action={upAction} className="mt-3 space-y-3">
            <input type="hidden" name="empresaId" value={empresaId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
                  Título
                </label>
                <input name="titulo" type="text" placeholder="ex: Mapeamento 2026" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
                  Categoria
                </label>
                <select name="categoria" defaultValue="documento" className={inputCls}>
                  <option value="documento">Documento</option>
                  <option value="mapeamento">Mapeamento (relatório)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
                  Pasta (opcional)
                </label>
                <select name="pastaId" defaultValue="" className={inputCls}>
                  <option value="">— Sem pasta —</option>
                  {pastas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
                  Arquivo (até 25MB)
                </label>
                <input name="arquivo" type="file" required className="mt-1.5 text-xs" />
              </div>
            </div>
            {upState.erro && (
              <div className="rounded-lg bg-[#fceaea] px-3.5 py-2.5 text-xs font-semibold text-[var(--red)]">
                {upState.erro}
              </div>
            )}
            {upState.ok && (
              <div className="rounded-lg bg-[#e7f6ec] px-3.5 py-2.5 text-xs font-semibold text-[#15803d]">
                {upState.ok}
              </div>
            )}
            <Submit label="Enviar documento" pendingLabel="Enviando…" />
          </form>

          {/* criar pasta */}
          <form action={criarPasta} className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
            <input type="hidden" name="empresaId" value={empresaId} />
            <input
              name="nome"
              type="text"
              placeholder="Nova pasta (ex: Fiscal)"
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl border border-[var(--border)] bg-white px-3.5 py-2 text-xs font-bold text-[var(--action)] transition hover:border-[var(--action)]"
            >
              + Criar pasta
            </button>
          </form>
        </section>
      )}

      {/* ---------- Documentos ---------- */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-[var(--ink)]">Documentos</h2>
        {documentos.length === 0 && pastas.length === 0 ? (
          <div className={`${cardCls} text-center`}>
            <p className="text-sm text-[var(--muted)]">
              {isMaster
                ? "Nenhum documento ainda. Envie o primeiro acima."
                : "Nenhum documento disponível ainda."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pastas.map((p) => (
              <GrupoPasta
                key={p.id}
                titulo={p.nome}
                pastaId={p.id}
                empresaId={empresaId}
                docs={docsDe(p.id)}
                isMaster={isMaster}
                podeExcluirPasta
              />
            ))}
            {semPasta.length > 0 && (
              <GrupoPasta
                titulo="Sem pasta"
                empresaId={empresaId}
                docs={semPasta}
                isMaster={isMaster}
              />
            )}
          </div>
        )}
      </section>

      {/* ---------- Fechamentos mensais ---------- */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-[var(--ink)]">
          Fechamentos mensais
        </h2>

        {isMaster && (
          <div className={`${cardCls} mb-4`}>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              Novo / editar fechamento
            </p>
            <form action={fecAction} className="mt-3 space-y-3">
              <input type="hidden" name="empresaId" value={empresaId} />
              <div className="flex flex-wrap gap-3">
                <select name="mes" defaultValue={hoje.getMonth() + 1} className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-semibold">
                  {MESES_NOME.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select name="ano" defaultValue={hoje.getFullYear()} className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-semibold">
                  {ANOS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                name="resumo"
                rows={3}
                placeholder="Resumo do mês para o cliente…"
                className={inputCls}
              />
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
                  Anexo (opcional — relatório do fechamento)
                </label>
                <input name="arquivo" type="file" className="text-xs" />
              </div>
              {fecState.erro && (
                <div className="rounded-lg bg-[#fceaea] px-3.5 py-2.5 text-xs font-semibold text-[var(--red)]">
                  {fecState.erro}
                </div>
              )}
              {fecState.ok && (
                <div className="rounded-lg bg-[#e7f6ec] px-3.5 py-2.5 text-xs font-semibold text-[#15803d]">
                  {fecState.ok} Publique para o cliente ver.
                </div>
              )}
              <Submit label="Salvar fechamento" pendingLabel="Salvando…" />
            </form>
          </div>
        )}

        {fechamentos.length === 0 ? (
          <div className={`${cardCls} text-center`}>
            <p className="text-sm text-[var(--muted)]">
              {isMaster
                ? "Nenhum fechamento cadastrado."
                : "Nenhum fechamento publicado ainda."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {fechamentos.map((f) => (
              <FechamentoLinha key={f.id} f={f} isMaster={isMaster} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GrupoPasta({
  titulo,
  pastaId,
  empresaId,
  docs,
  isMaster,
  podeExcluirPasta,
}: {
  titulo: string;
  pastaId?: string;
  empresaId: string;
  docs: Documento[];
  isMaster: boolean;
  podeExcluirPasta?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[#fbfcfe] px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--navy)]">
          <span className="text-[var(--muted)]">📁</span>
          {titulo}
          <span className="text-xs font-semibold text-[var(--muted)]">
            ({docs.length})
          </span>
        </h3>
        {isMaster && podeExcluirPasta && pastaId && (
          <form
            action={removerPasta}
            onSubmit={(e) => {
              if (!confirm(`Excluir a pasta "${titulo}"? Os documentos ficam sem pasta.`))
                e.preventDefault();
            }}
          >
            <input type="hidden" name="pastaId" value={pastaId} />
            <input type="hidden" name="empresaId" value={empresaId} />
            <button className="text-xs font-bold text-[var(--muted)] transition hover:text-[var(--red)]">
              excluir pasta
            </button>
          </form>
        )}
      </div>
      {docs.length === 0 ? (
        <p className="px-5 py-4 text-xs text-[var(--muted)]">Pasta vazia.</p>
      ) : (
        <ul>
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3 last:border-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-[var(--ink)]">
                    {d.titulo}
                  </span>
                  {d.categoria === "mapeamento" && (
                    <span className="rounded bg-[#e8f1f9] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--action)]">
                      mapeamento
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {fmtTamanho(d.tamanho_bytes)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={`/documentos/${d.id}/baixar`}
                  className="rounded-lg bg-[var(--action)] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#0458a0]"
                >
                  Baixar
                </a>
                {isMaster && (
                  <form
                    action={removerDocumento}
                    onSubmit={(e) => {
                      if (!confirm(`Excluir "${d.titulo}"?`)) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="documentoId" value={d.id} />
                    <button className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-xs font-bold text-[var(--muted)] transition hover:border-[var(--red)] hover:text-[var(--red)]">
                      ✕
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FechamentoLinha({
  f,
  isMaster,
}: {
  f: Fechamento;
  isMaster: boolean;
}) {
  const publicado = f.status === "publicado";
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--navy)]">
              {MESES_NOME[f.mes - 1]}/{f.ano}
            </span>
            {isMaster && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  publicado
                    ? "bg-[#e7f6ec] text-[#15803d]"
                    : "bg-[#fdf4e3] text-[#b8780c]"
                }`}
              >
                {publicado ? "publicado" : "rascunho"}
              </span>
            )}
          </div>
          {f.resumo && (
            <p className="mt-1 whitespace-pre-line text-sm text-[var(--foreground)]">
              {f.resumo}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {f.documento_id && (
            <a
              href={`/documentos/${f.documento_id}/baixar`}
              className="rounded-lg bg-[var(--action)] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#0458a0]"
            >
              Baixar anexo
            </a>
          )}
          {isMaster && (
            <form action={definirStatusFechamento}>
              <input type="hidden" name="fechamentoId" value={f.id} />
              <input
                type="hidden"
                name="status"
                value={publicado ? "rascunho" : "publicado"}
              />
              <button
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  publicado
                    ? "border-[var(--border)] bg-white text-[var(--muted)] hover:text-[var(--navy)]"
                    : "border-[var(--action)] bg-[var(--action)] text-white"
                }`}
              >
                {publicado ? "Despublicar" : "Publicar"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
