"use client";

import { useRouter } from "next/navigation";

export function DocsEmpresaSelect({
  empresas,
  value,
}: {
  empresas: { id: string; nome: string }[];
  value: string;
}) {
  const router = useRouter();
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) =>
          router.push(`/documentos?empresa=${e.target.value}`)
        }
        className="cursor-pointer appearance-none rounded-xl border border-[var(--border)] bg-white py-2.5 pl-4 pr-10 text-base font-extrabold text-[var(--navy)] shadow-sm outline-none transition hover:border-[var(--action)] focus:border-[var(--action)]"
      >
        {empresas.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nome}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
