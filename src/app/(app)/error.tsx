"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white px-8 py-10 text-center shadow-sm">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#fceaea] text-2xl font-extrabold text-[var(--red)]">
          !
        </div>
        <h1 className="text-lg font-extrabold text-[var(--navy)]">
          Algo deu errado
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {error.message ||
            "Não foi possível concluir a operação. Tente de novo."}
        </p>
        <button
          onClick={reset}
          className="mt-5 rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--action-hover)]"
        >
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
