import Link from "next/link";
import { requireAcesso } from "@/lib/auth";
import { getEmpresaAtiva, getEmpresasAcessiveis } from "@/lib/empresa-ativa";
import {
  listPastas,
  listDocumentos,
  getFechamentos,
} from "@/lib/supabase/documentos";
import { DocumentosClient } from "./DocumentosClient";

export const metadata = { title: "Documentos · Reis" };

export default async function DocumentosPage() {
  const { isMaster } = await requireAcesso();
  const empresas = await getEmpresasAcessiveis();

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

  const empresa = (await getEmpresaAtiva(empresas))!;
  const empresaId = empresa.id;

  const [pastas, documentos, fechamentos] = await Promise.all([
    listPastas(empresaId),
    listDocumentos(empresaId),
    getFechamentos(empresaId),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-[var(--navy)]">
        {empresa.nome}
      </h1>
      <p className="text-sm text-[var(--muted)]">
        {isMaster
          ? "Documentos · gestão de arquivos e fechamentos"
          : "Documentos da sua empresa"}
      </p>

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
