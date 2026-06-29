"use client";

import { useRouter } from "next/navigation";
import { Dropdown } from "@/components/Dropdown";

export function EmpresaSelect({
  empresas,
  value,
  ano,
  mes,
  modo,
}: {
  empresas: { id: string; nome: string }[];
  value: string;
  ano: number;
  mes: number;
  modo: string;
}) {
  const router = useRouter();
  return (
    <Dropdown
      value={value}
      ariaLabel="Empresa"
      options={empresas.map((e) => ({ value: e.id, label: e.nome }))}
      onChange={(v) => {
        const q = new URLSearchParams({
          empresa: v,
          ano: String(ano),
          mes: String(mes),
          modo,
        });
        router.push(`/painel?${q.toString()}`);
      }}
    />
  );
}
