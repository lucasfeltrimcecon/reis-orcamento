"use client";

import { useState, useTransition } from "react";
import type { GaugeArea, LinhaDetalhe, Modo } from "@/lib/dashboard";
import { fmtBRL, fmtNum } from "@/lib/meses";
import { carregarDetalhesArea } from "./actions";

const R = 68;
const ARC_LEN = Math.PI * R;

function Gauge({ g }: { g: GaugeArea }) {
  const frac = g.orcado > 0 ? Math.min(g.realizado / g.orcado, 1) : 1;
  const stroke = g.cor === "r" ? "var(--red)" : "var(--yellow)";
  const path = `M ${85 - R} 86 A ${R} ${R} 0 0 1 ${85 + R} 86`;
  const corClasse = g.cor === "r" ? "text-[var(--red)]" : "text-[var(--yellow)]";

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[var(--navy)]">{g.nome}</span>
        {g.execPct !== null && (
          <span className={`text-sm font-extrabold tabular-nums ${corClasse}`}>
            {g.execPct.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            %
          </span>
        )}
      </div>
      <div className="relative mx-auto mt-1" style={{ width: 170, height: 96 }}>
        <svg viewBox="0 0 170 96" width="170" height="96">
          <path
            d={path}
            fill="none"
            stroke="var(--border)"
            strokeWidth={15}
            strokeLinecap="round"
            opacity={0.5}
          />
          <path
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth={15}
            strokeLinecap="round"
            strokeDasharray={`${frac * ARC_LEN} ${ARC_LEN}`}
          />
          <circle cx={85 + R} cy={86} r={3.5} fill="var(--navy)" />
        </svg>
        <div className="absolute inset-x-0 bottom-1.5 text-center">
          <div className={`text-lg font-extrabold tabular-nums ${corClasse}`}>
            {fmtBRL(g.realizado)}
          </div>
          {g.naoPlanejado ? (
            <div className="text-[11px] font-bold text-[var(--red)]">
              não planejado
            </div>
          ) : (
            <div className="text-[11px] font-semibold text-[var(--muted)] tabular-nums">
              orçado {fmtBRL(g.orcado)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function PainelGauges({
  areas,
  empresaId,
  ano,
  mesRef,
  modo,
}: {
  areas: GaugeArea[];
  empresaId: string;
  ano: number;
  mesRef: number;
  modo: Modo;
}) {
  const [aberta, setAberta] = useState<GaugeArea | null>(null);
  const [linhas, setLinhas] = useState<LinhaDetalhe[]>([]);
  const [pending, startTransition] = useTransition();

  function abrir(g: GaugeArea) {
    setAberta(g);
    setLinhas([]);
    startTransition(async () => {
      const dados = await carregarDetalhesArea(
        empresaId,
        g.areaId,
        ano,
        mesRef,
        modo,
      );
      setLinhas(dados);
    });
  }

  const frac =
    aberta && aberta.orcado > 0
      ? Math.min(aberta.realizado / aberta.orcado, 1)
      : 1;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {areas.map((g) => (
          <button
            key={g.areaId}
            onClick={() => abrir(g)}
            className="rounded-2xl border border-[var(--border)] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Gauge g={g} />
          </button>
        ))}
      </div>

      {aberta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#040c1c73] p-5 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAberta(null);
          }}
        >
          <div className="max-h-[88vh] w-full max-w-lg overflow-auto rounded-2xl bg-white shadow-2xl">
            <div className="relative border-b border-[var(--border)] px-6 py-5">
              <button
                onClick={() => setAberta(null)}
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg bg-[var(--background)] text-[var(--muted)]"
              >
                ×
              </button>
              <h3 className="text-lg font-extrabold text-[var(--navy)]">
                {aberta.nome}
              </h3>
              <div className="mt-3 flex gap-6 text-sm">
                <div>
                  <div className="text-[11px] font-bold uppercase text-[var(--muted)]">
                    Orçado
                  </div>
                  <div className="font-extrabold tabular-nums">
                    {aberta.orcado === 0 ? "—" : fmtBRL(aberta.orcado)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase text-[var(--muted)]">
                    Realizado
                  </div>
                  <div
                    className="font-extrabold tabular-nums"
                    style={{
                      color: aberta.cor === "r" ? "var(--red)" : "var(--yellow)",
                    }}
                  >
                    {fmtBRL(aberta.realizado)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase text-[var(--muted)]">
                    Execução
                  </div>
                  <div className="font-extrabold tabular-nums">
                    {aberta.execPct === null
                      ? "N/D"
                      : `${aberta.execPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 pt-4">
              <div className="h-6 overflow-hidden rounded-lg bg-[var(--border)]">
                <div
                  className="h-full rounded-lg transition-all"
                  style={{
                    width: `${frac * 100}%`,
                    background:
                      aberta.cor === "r" ? "var(--red)" : "var(--yellow)",
                  }}
                />
              </div>
              {aberta.naoPlanejado ? (
                <p className="mt-2 text-xs font-bold text-[var(--red)]">
                  ⚠ Gasto não planejado — sem orçamento definido
                </p>
              ) : aberta.execPct !== null && aberta.execPct >= 100 ? (
                <p className="mt-2 text-xs font-bold text-[var(--red)]">
                  ⚠ Estourou o orçamento em{" "}
                  {fmtBRL(aberta.realizado - aberta.orcado)}
                </p>
              ) : (
                <p className="mt-2 text-xs font-bold text-[var(--yellow)]">
                  Dentro do orçamento — resta{" "}
                  {fmtBRL(aberta.orcado - aberta.realizado)}
                </p>
              )}
            </div>

            <div className="px-6 pb-6 pt-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
                O que foi considerado (realizado)
              </div>
              {pending ? (
                <p className="py-6 text-center text-sm text-[var(--muted)]">
                  Carregando…
                </p>
              ) : linhas.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--muted)]">
                  Sem lançamentos detalhados neste período.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {linhas.map((l, i) => (
                      <tr key={i} className="border-t border-[var(--border)]">
                        <td className="py-2.5 pr-3">{l.descricao}</td>
                        <td className="py-2.5 text-right font-bold tabular-nums">
                          {fmtNum(l.valor)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[var(--border)]">
                      <td className="py-2.5 font-extrabold text-[var(--navy)]">
                        Total
                      </td>
                      <td className="py-2.5 text-right font-extrabold tabular-nums text-[var(--navy)]">
                        {fmtNum(linhas.reduce((s, l) => s + l.valor, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
