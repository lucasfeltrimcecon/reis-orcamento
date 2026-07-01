"use client";

import { useState } from "react";
import Link from "next/link";
import { MESES_ABREV, fmtNum } from "@/lib/meses";
import { sincronizar, type SyncState } from "./sync-actions";
import type { SyncResumo } from "@/lib/conta-azul/sync";

const ANOS = [2025, 2026, 2027];
const money = (v: number) => `R$ ${fmtNum(v)}`;

export function SincronizarMes({ empresaId }: { empresaId: string }) {
  const agora = new Date();
  const [ano, setAno] = useState(agora.getFullYear());
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<SyncResumo | null>(null);

  async function rodar() {
    setRodando(true);
    setErro(null);
    setResumo(null);
    const r: SyncState = await sincronizar(empresaId, ano, mes);
    setRodando(false);
    if (r.erro || !r.resumo) setErro(r.erro ?? "Falha ao sincronizar.");
    else setResumo(r.resumo);
  }

  const periodo = `${MESES_ABREV[mes - 1]}/${ano}`;

  return (
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <h2 className="text-sm font-bold text-[var(--navy)]">
        Sincronizar com o painel
      </h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Puxa o mês de <b>todas as bases</b> desta empresa e grava direto no
        realizado, já aplicando as{" "}
        <Link
          href={`/empresas/${empresaId}/categorias`}
          className="font-bold text-[var(--action)] underline"
        >
          Categorias ativas
        </Link>{" "}
        (é lá que você decide o que entra). Reescreve o mês a cada sincronização.
      </p>

      {/* Seletores + ação */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
            Ano
          </span>
          {ANOS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAno(a)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                a === ano
                  ? "bg-[var(--navy)] text-white"
                  : "border border-[var(--border)] bg-white text-[var(--muted)] hover:text-[var(--navy)]"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
            Mês
          </span>
          {MESES_ABREV.map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => setMes(i + 1)}
              className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
                i + 1 === mes
                  ? "bg-[var(--navy)] text-white"
                  : "border border-[var(--border)] bg-white text-[var(--muted)] hover:text-[var(--navy)]"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={rodar}
          disabled={rodando}
          className="rounded-lg bg-[var(--action)] px-5 py-2 text-sm font-bold text-white transition hover:bg-[var(--action-hover)] active:scale-[0.98] disabled:opacity-60"
        >
          {rodando ? "Sincronizando…" : `Sincronizar ${periodo}`}
        </button>
      </div>

      {erro && (
        <div className="mt-4 rounded-lg bg-[#fceaea] px-3.5 py-2.5 text-xs font-semibold text-[var(--red)]">
          {erro}
        </div>
      )}

      {resumo && <Resultado resumo={resumo} periodo={periodo} empresaId={empresaId} />}
    </section>
  );
}

function Resultado({
  resumo,
  periodo,
  empresaId,
}: {
  resumo: SyncResumo;
  periodo: string;
  empresaId: string;
}) {
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-lg bg-[#e7f6ec] px-3.5 py-3 text-sm font-semibold text-[#15803d]">
        ✓ {periodo} gravado no realizado ({resumo.qtd} linhas).{" "}
        <Link href="/painel" className="font-bold underline">
          Ver no painel →
        </Link>
      </div>

      {/* Totais no painel */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--border)] p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
            Receita no painel
          </p>
          <p className="text-lg font-extrabold text-[#15803d]">
            {money(resumo.totalReceita)}
          </p>
          <p className="text-[10px] text-[var(--muted)]">
            bruto {money(resumo.totalReceitaBruto)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
            Despesa no painel
          </p>
          <p className="text-lg font-extrabold text-[var(--red)]">
            {money(resumo.totalDespesa)}
          </p>
          <p className="text-[10px] text-[var(--muted)]">
            bruto {money(resumo.totalDespesaBruto)}
          </p>
        </div>
      </div>

      {/* Bases */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
          Bases consultadas
        </p>
        <ul className="space-y-1">
          {resumo.bases.map((b, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[var(--navy)]">{b.apelido}</span>
              {b.erro ? (
                <span className="font-semibold text-[var(--red)]">{b.erro}</span>
              ) : (
                <span className="text-[var(--muted)]">
                  receita {money(b.receita)} · despesa {money(b.despesa)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Categorias novas (só aviso) */}
      {resumo.novas.length > 0 && (
        <div className="rounded-lg bg-[#fdf4e3] px-3.5 py-2.5 text-xs font-semibold text-[#b8780c]">
          Apareceram <b>{resumo.novas.length} categoria(s) nova(s)</b> (entraram
          com a sugestão automática). Se quiser revisar o que fica dentro/fora do
          painel:{" "}
          <Link
            href={`/empresas/${empresaId}/categorias`}
            className="font-bold underline"
          >
            Categorias ativas →
          </Link>
        </div>
      )}
    </div>
  );
}
