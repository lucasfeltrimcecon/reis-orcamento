import Link from "next/link";
import { requireAcesso } from "@/lib/auth";
import { listEmpresas } from "@/lib/supabase/queries";
import {
  listPastas,
  listDocumentos,
  getFechamentos,
} from "@/lib/supabase/documentos";
import { DocsEmpresaSelect } from "./DocsEmpresaSelect";
import { DocumentosClient } from "./DocumentosClient";

export const metadata = { title: "Documentos · Reis" };

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { isMaster } = await requireAcesso();
  const sp = await searchParams;
  const empresas = await listEmpresas();

  if (empresas.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h1 className="text-3xl font-extrabold text-[var(--navy)]">Documentos</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {isMaster
            ? "Cadastre uma empresa para começar a subir documentos."
            : "Nenhuma empresa disponível."}
        </p>
        {isMaster && (
          <Link
            href="/empresas/nova"
            className="mt-6 inline-block rounded-xl bg-[var(--action)] px-5 py-2.5 text-sm font-bold text-white"
          >
            + Nova empresa
          </Link>
        )}
      </div>
    );
  }

  const empresaId =
    sp.empresa && empresas.some((e) => e.id === sp.empresa)
      ? sp.empresa
      : empresas[0].id;

  const [pastas, documentos, fechamentos] = await Promise.all([
    listPastas(empresaId),
    listDocumentos(empresaId),
    getFechamentos(empresaId),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DocsEmpresaSelect
            empresas={empresas.map((e) => ({ id: e.id, nome: e.nome }))}
            value={empresaId}
          />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
              Documentos
            </p>
            <p className="text-sm font-semibold text-[var(--navy)]">
              {isMaster ? "Gestão de arquivos e fechamentos" : "Arquivos da sua empresa"}
            </p>
          </div>
        </div>
      </div>

      <DocumentosClient
        empresaId={empresaId}
        isMaster={isMaster}
        pastas={pastas}
        documentos={documentos}
        fechamentos={fechamentos}
      />
    </div>
  );
}
