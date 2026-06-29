"use client";

import { useState, useTransition } from "react";
import type { GaugeArea, LinhaDetalhe, Modo } from "@/lib/dashboard";
import { fmtBRL, fmtNum } from "@/lib/meses";
import { carregarDetalhesArea } from "./actions";

// Geometria do arco (em unidades do viewBox). O SVG escala com o card.
const R = 80;
const CX = 95;
const CY = 92;
const ARC_LEN = Math.PI * R;
const ARC_PATH = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

function Gauge({ g }: { g: GaugeArea }) {
  const frac = g.orcado > 0 ? Math.min(g.realizado / g.orcado, 1) : 1;
  const stroke = g.cor === "r" ? "var(--red)" : "var(--yellow)";
  const corClasse = g.cor === "r" ? "text-[var(--red)]" : "text-[var(--yellow)]";

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold leading-tight text-[var(--navy)]">
          {g.nome}
        </span>
        {g.execPct !== null && (
          <span className={`shrink-0 text-sm font-extrabold tabular-nums ${corClasse}`}>
            {g.execPct.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            %
          </span>
        )}
      </div>

      <div
        className="relative mx-auto mt-3 w-full max-w-[240px]"
        style={{ containerType: "inline-size" }}
      >
        <svg viewBox="0 0 190 104" className="w-full" preserveAspectRatio="xMidYMid meet">
          <path
            d={ARC_PATH}
            fill="none"
            stroke="var(--border)"
            strokeWidth={16}
            strokeLinecap="round"
            opacity={0.5}
          />
          <path
            d={ARC_PATH}
            fill="none"
            stroke={stroke}
            strokeWidth={16}
            strokeLinecap="round"
            strokeDasharray={`${frac * ARC_LEN} ${ARC_LEN}`}
          />
          <circle cx={CX + R} cy={CY} r={4} fill="var(--navy)" />
        </svg>
        {/* Valor realizado centralizado dentro do arco */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-5">
          <span
            className={`px-2 text-center text-[clamp(0.9rem,9cqw,1.5rem)] font-extrabold leading-none tabular-nums ${corClasse}`}
          >
            {fmtBRL(g.realizado)}
          </span>
        </div>
      </div>

      <div className="mt-2 text-center">
        {g.naoPlanejado ? (
          <span className="text-[11px] font-bold text-[var(--red)]">
            não planejado
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-[var(--muted)] tabular-nums">
            orçado {fmtBRL(g.orcado)}
          </span>
        )}
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
