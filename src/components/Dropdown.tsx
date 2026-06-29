"use client";

import { useEffect, useRef, useState } from "react";

export type DropdownOption = { value: string; label: string };

const SIZES = {
  lg: "py-2.5 pl-4 pr-3 text-base font-extrabold text-[var(--navy)]",
  sm: "py-2.5 pl-3.5 pr-2.5 text-sm font-semibold text-[var(--ink)]",
} as const;

/**
 * Select estilizado (substitui o <select> nativo, cuja lista o browser desenha
 * "feia"). Botão + popover com itens no padrão visual do sistema.
 */
export function Dropdown({
  value,
  options,
  onChange,
  ariaLabel,
  size = "lg",
  className,
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const atual = options.find((o) => o.value === value);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white shadow-sm outline-none transition ${SIZES[size]} ${
          open ? "border-[var(--action)]" : "border-[var(--border)] hover:border-[var(--action)]"
        }`}
      >
        <span className="truncate">{atual?.label ?? "—"}</span>
        <svg
          className={`shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
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
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 z-40 mt-1.5 max-h-72 w-full min-w-[11rem] overflow-auto rounded-xl border border-[var(--border)] bg-white p-1 shadow-xl"
        >
          {options.map((o) => {
            const sel = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={sel}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold transition ${
                    sel
                      ? "bg-[var(--navy)] text-white"
                      : "text-[var(--ink)] hover:bg-[var(--background)]"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {sel && (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
