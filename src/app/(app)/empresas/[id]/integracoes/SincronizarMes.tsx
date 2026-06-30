"use client";

import { useState } from "react";
import Link from "next/link";
import { MESES_ABREV, fmtNum } from "@/lib/meses";
import {
  sincronizarAnalisar,
  sincronizarConfirmar,
  type AnaliseState,
} from "./sync-actions";
import type { AnaliseSync, LinhaSync } from "@/lib/conta-azul/sync";

const ANOS = [2025, 2026, 2027];
const money = (v: number) => `R$ ${fmtNum(v)}`;

export function SincronizarMes({ empresaId }: { empresaId: string }) {
  const agora = new Date();
  const [ano, setAno] = useState(agora.getFullYear());
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<AnaliseSync | null>(null);
  const [gravadas, setGravadas] = useState<number | null>(null);

  async function buscar() {
    setCarregando(true);
    setErro(null);
    setDados(null);
    setGravadas(null);
    const r: AnaliseState = await sincronizarAnalisar(empresaId, ano, mes);
    setCarregando(false);
    if (r.erro || !r.dados) setErro(r.erro ?? "Falha ao buscar.");
    else setDados(r.dados);
  }

  async function confirmar() {
    if (!dados) return;
    setSalvando(true);
    setErro(null);
    const linhas: LinhaSync[] = dados.linhas.map((l) => ({
      tipo: l.tipo,
      categoria: l.categoria,
      categoriaNorm: l.categoriaNorm,
      area: l.area,
      valor: l.valor,
    }));
    const r = await sincronizarConfirmar(empresaId, ano, mes, linhas);
    setSalvando(false);
    if (r.erro) setErro(r.erro);
    else {
      setGravadas(r.qtd ?? 0);
      setDados(null);
    }
  }

  const periodo = `${MESES_ABREV[mes - 1]}/${ano}`;

  return (
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <h2 className="text-sm font-bold text-[var(--navy)]">
        Sincronizar com o painel
      </h2>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Puxa receita e despesa do mês de <b>todas as bases</b> desta empresa,
        aplica as <b>Categorias ativas</b> + rateio por centro de custo, e mostra
        uma prévia antes de gravar no realizado.
      </p>

      {/* Seletores */}
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
          onClick={buscar}
          disabled={carregando || salvando}
          className="rounded-lg bg-[var(--action)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--action-hover)] active:scale-[0.98] disabled:opacity-60"
        >
          {carregando ? "Buscando…" : `Buscar ${periodo}`}
        </button>
      </div>

      {erro && (
        <div className="mt-4 rounded-lg bg-[#fceaea] px-3.5 py-2.5 text-xs font-semibold text-[var(--red)]">
          {erro}
        </div>
      )}

      {gravadas !== null && (
        <div className="mt-4 rounded-lg bg-[#e7f6ec] px-3.5 py-3 text-sm font-semibold text-[#15803d]">
          ✓ Gravado no realizado de {periodo} ({gravadas} linhas).{" "}
          <Link href="/painel" className="font-bold underline">
            Ver no painel →
          </Link>
        </div>
      )}

      {dados && <Previa dados={dados} periodo={periodo} onConfirmar={confirmar} salvando={salvando} />}
    </section>
  );
}

function Previa({
  dados,
  periodo,
  onConfirmar,
  salvando,
}: {
  dados: AnaliseSync;
  periodo: string;
  onConfirmar: () => void;
  salvando: boolean;
}) {
  const receitas = dados.linhas.filter((l) => l.tipo === "receita");
  const despesas = dados.linhas.filter((l) => l.tipo === "despesa");

  return (
    <div className="mt-5 space-y-4">
      {/* Resumo por base */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
          Bases consultadas
        </p>
        <ul className="space-y-1">
          {dados.bases.map((b, i) => (
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

      {/* Totais (no painel) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--border)] p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
            Receita no painel
          </p>
          <p className="text-lg font-extrabold text-[#15803d]">
            {money(dados.totalReceita)}
          </p>
          <p className="text-[10px] text-[var(--muted)]">
            bruto {money(dados.totalReceitaBruto)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
            Despesa no painel
          </p>
          <p className="text-lg font-extrabold text-[var(--red)]">
            {money(dados.totalDespesa)}
          </p>
          <p className="text-[10px] text-[var(--muted)]">
            bruto {money(dados.totalDespesaBruto)}
          </p>
        </div>
      </div>

      <p className="rounded-lg bg-[#fdf4e3] px-3 py-2 text-[11px] font-semibold text-[#b8780c]">
        ⚠ Base de data: <b>vencimento</b> (a API não expõe a data de pagamento).
        Categorias marcadas “fora” não entram no painel — ajuste em{" "}
        <b>Categorias ativas</b>. Gravar <b>reescreve {periodo}</b>.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <TabelaLinhas titulo="Receitas" linhas={receitas} />
        <TabelaLinhas titulo="Despesas" linhas={despesas} />
      </div>

      <button
        type="button"
        onClick={onConfirmar}
        disabled={salvando}
        className="rounded-xl bg-[var(--action)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--action-hover)] active:scale-[0.98] disabled:opacity-60"
      >
        {salvando ? "Gravando…" : `Confirmar e gravar ${periodo}`}
      </button>
    </div>
  );
}

function TabelaLinhas({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: AnaliseSync["linhas"];
}) {
  return (
    <div className="rounded-xl border border-[var(--border)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[#fbfcfe] px-3 py-2">
        <span className="text-xs font-bold text-[var(--navy)]">{titulo}</span>
        <span className="text-[11px] font-semibold text-[var(--muted)]">
          {linhas.length} linha{linhas.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {linhas.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-[var(--muted)]">—</p>
        ) : (
          <ul>
            {linhas.map((l, i) => (
              <li
                key={i}
                className={`flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-1.5 text-xs last:border-0 ${
                  l.ignorar ? "opacity-50" : ""
                }`}
              >
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-[var(--navy)]">
                    {l.categoria}
                  </span>
                  {l.area ? (
                    <span className="text-[var(--muted)]"> · {l.area}</span>
                  ) : null}
                  {l.isNew && (
                    <span className="ml-1 rounded bg-[#e8f1f9] px-1 text-[9px] font-bold text-[var(--action)]">
                      nova
                    </span>
                  )}
                  {l.ignorar && (
                    <span className="ml-1 text-[9px] font-bold uppercase text-[var(--muted)]">
                      fora
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums font-bold text-[var(--foreground)]">
                  {money(l.valor)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
