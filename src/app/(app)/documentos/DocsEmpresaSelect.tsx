"use client";

import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/Dropdown";

export function DocsEmpresaSelect({
  empresas,
  value,
}: {
  empresas: { id: string; nome: string }[];
  value: string;
}) {
  const router = useRouter();
  return (
    <Dropdown
      value={value}
      ariaLabel="Empresa"
      options={empresas.map((e) => ({ value: e.id, label: e.nome }))}
      onChange={(v) => router.push(`/documentos?empresa=${v}`)}
    />
  );
}
