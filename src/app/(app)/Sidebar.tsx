"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { signOut } from "@/app/login/actions";
import { selecionarEmpresa } from "@/lib/empresa-actions";

type Item = { href: string; label: string; icon: React.ReactNode };
type Secao = { titulo: string; itens: Item[] };
type EmpresaMini = { id: string; nome: string };

// Menu por papel. Cliente é read-only (Painel + Documentos); master administra.
// Itens são adicionados conforme as fases entram no ar.
function secoesPara(isMaster: boolean): Secao[] {
  const visaoGeral: Secao = {
    titulo: "Visão geral",
    itens: [
      { href: "/painel", label: "Painel", icon: <IconePainel /> },
      { href: "/documentos", label: "Documentos", icon: <IconeDocumento /> },
    ],
  };
  if (!isMaster) return [visaoGeral];
  return [
    visaoGeral,
    {
      titulo: "Cadastros",
      itens: [
        { href: "/empresas", label: "Empresas", icon: <IconeEmpresa /> },
        { href: "/usuarios", label: "Usuários", icon: <IconeUsuario /> },
        { href: "/integracoes", label: "Integrações", icon: <IconeIntegracao /> },
      ],
    },
  ];
}

export function Sidebar({
  email,
  iniciais,
  isMaster,
  empresas,
  empresaAtivaId,
}: {
  email: string;
  iniciais: string;
  isMaster: boolean;
  empresas: EmpresaMini[];
  empresaAtivaId: string | null;
}) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const secoes = secoesPara(isMaster);

  const ativo = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Barra superior — só no mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] text-[var(--navy)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <Marca />
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e8f1f9] text-xs font-extrabold text-[var(--action)]">
          {iniciais}
        </span>
      </div>

      {/* Fundo escuro no mobile quando o menu está aberto */}
      {aberto && (
        <div
          className="fixed inset-0 z-40 bg-[#040c1c66] lg:hidden"
          onClick={() => setAberto(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--border)] bg-white transition-transform duration-200 lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <Marca />
          <button
            onClick={() => setAberto(false)}
            aria-label="Fechar menu"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] lg:hidden"
          >
            ✕
          </button>
        </div>

        {empresas.length > 0 && (
          <div className="border-b border-[var(--border)] px-3 py-3">
            <EmpresaSwitcher
              empresas={empresas}
              ativaId={empresaAtivaId}
              pathname={pathname}
              onNavigate={() => setAberto(false)}
            />
          </div>
        )}

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {secoes.map((s) => (
            <div key={s.titulo}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                {s.titulo}
              </p>
              <div className="space-y-0.5">
                {s.itens.map((it) => {
                  const on = ativo(it.href);
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setAberto(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                        on
                          ? "bg-[var(--navy)] text-white shadow-sm"
                          : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--navy)]"
                      }`}
                    >
                      <span className={on ? "text-white" : "text-[var(--action)]"}>
                        {it.icon}
                      </span>
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Usuário + sair */}
        <div className="border-t border-[var(--border)] px-3 py-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e8f1f9] text-xs font-extrabold text-[var(--action)]">
              {iniciais}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[var(--foreground)]">
                {email}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                {isMaster ? "Master" : "Cliente"}
              </p>
            </div>
          </div>
          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-bold text-[var(--muted)] transition hover:border-[var(--red)] hover:text-[var(--red)]"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

function Marca() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--navy)] text-base font-extrabold text-white">
        R
      </span>
      <span>
        <span className="block text-sm font-bold leading-tight text-[var(--navy)]">
          Controle Orçamentário
        </span>
        <span className="block text-[11px] font-semibold text-[var(--muted)]">
          Reis Aceleradora
        </span>
      </span>
    </Link>
  );
}

function IconePainel() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21a9 9 0 1 1 9-9" />
      <path d="M12 12l4-3" />
    </svg>
  );
}

function IconeEmpresa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
      <path d="M15 9h3a1 1 0 0 1 1 1v11" />
      <path d="M8 8h2M8 12h2M8 16h2" />
    </svg>
  );
}

function IconeUsuario() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconeDocumento() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h8" />
    </svg>
  );
}

function IconeIntegracao() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}

function EmpresaSwitcher({
  empresas,
  ativaId,
  pathname,
  onNavigate,
}: {
  empresas: EmpresaMini[];
  ativaId: string | null;
  pathname: string;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ativa = empresas.find((e) => e.id === ativaId) ?? empresas[0];
  const unica = empresas.length === 1;

  function escolher(id: string) {
    setOpen(false);
    onNavigate();
    start(() => selecionarEmpresa(id, pathname));
  }

  return (
    <div className="relative">
      <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
        Empresa
      </p>
      <button
        type="button"
        onClick={() => !unica && setOpen((o) => !o)}
        disabled={unica || pending}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-left transition hover:border-[var(--action)] disabled:cursor-default disabled:hover:border-[var(--border)]"
      >
        <span className="truncate text-sm font-extrabold text-[var(--navy)]">
          {pending ? "Trocando…" : (ativa?.nome ?? "—")}
        </span>
        {!unica && (
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
        )}
      </button>

      {open && !unica && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-auto rounded-xl border border-[var(--border)] bg-white p-1 shadow-xl">
          {empresas.map((e) => {
            const sel = e.id === ativa?.id;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => escolher(e.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold transition ${
                  sel
                    ? "bg-[var(--navy)] text-white"
                    : "text-[var(--ink)] hover:bg-[var(--background)]"
                }`}
              >
                <span className="truncate">{e.nome}</span>
                {sel && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
