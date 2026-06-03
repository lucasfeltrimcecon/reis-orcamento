export default function Home() {
  return (
    <main className="flex-1 grid place-items-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-7 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--navy)] text-3xl font-extrabold text-white shadow-lg">
          R
        </div>

        <span className="inline-block rounded-full bg-[#e8f1f9] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--action)]">
          Reis Aceleradora de Negócios
        </span>

        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[var(--navy)] sm:text-5xl">
          Controle Orçamentário
        </h1>

        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[var(--muted)]">
          A plataforma está no ar. Acompanhe orçado × realizado por área, com a
          visão gerencial das empresas dos seus clientes.
        </p>

        <div className="mt-9 flex items-center justify-center gap-3">
          <button
            className="rounded-xl bg-[var(--action)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0458a0] hover:shadow-lg active:scale-[0.98]"
            type="button"
          >
            Entrar
          </button>
          <span className="rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--muted)]">
            V1 · em construção
          </span>
        </div>

        <div className="mt-12 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[var(--green)] shadow-sm ring-1 ring-[var(--border)]">
          <span className="h-2 w-2 rounded-full bg-[var(--green)]" />
          Ambiente publicado e funcionando
        </div>

        <footer className="mt-16 text-xs text-[var(--muted)]">
          © 2026 Reis Aceleradora · Fase 0 — esqueleto no ar
        </footer>
      </div>
    </main>
  );
}
