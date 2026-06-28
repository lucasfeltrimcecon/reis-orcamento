import * as XLSX from "xlsx";
import { getEmpresa, listAreas } from "@/lib/supabase/queries";
import { MESES_ABREV } from "@/lib/meses";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const empresa = await getEmpresa(id);
  if (!empresa) return new Response("Empresa não encontrada", { status: 404 });

  const areas = await listAreas(id);

  const header = ["Tipo", "Área", "Descrição", ...MESES_ABREV];
  // Linha de exemplo de receita + uma linha de despesa por área (descrição em branco)
  const rows: (string | number)[][] = [
    ["Receita", "Faturamento", "Vendas/serviços", ...Array(12).fill("")],
    ...areas.map((a) => ["Despesa", a.nome, "", ...Array(12).fill("")]),
  ];
  const aoa = [header, ...rows];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [
    { wch: 10 },
    { wch: 24 },
    { wch: 28 },
    ...Array(12).fill({ wch: 11 }),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Realizado");

  const buf: ArrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="modelo-realizado-${empresa.slug}.xlsx"`,
    },
  });
}
