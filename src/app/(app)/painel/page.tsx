export const metadata = {
  title: "Painel · Controle Orçamentário Reis",
};

export default function PainelPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <span className="inline-block rounded-full bg-[#e8f1f9] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--action)]">
        Fase 1 — Login no ar
      </span>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--navy)]">
        Painel
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
        Você está logado. As próximas fases trazem o cadastro da empresa-piloto,
        importação do orçamento e do realizado, e os relógios de área.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Fase 2 — Empresa & áreas" status="próxima" />
        <Card title="Fase 3 — Importar orçamento" status="planejada" />
        <Card title="Fase 4 — Importar realizado" status="planejada" />
        <Card title="Fase 5 — Relógios do dashboard" status="planejada" />
        <Card title="Fase 6 — Polimento" status="planejada" />
      </div>
    </div>
  );
}

function Card({ title, status }: { title: string; status: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <span className="inline-block rounded-md bg-[var(--background)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
        {status}
      </span>
      <h2 className="mt-2 text-sm font-bold text-[var(--navy)]">{title}</h2>
    </div>
  );
}
