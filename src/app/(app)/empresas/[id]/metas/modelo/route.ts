import * as XLSX from "xlsx";
import { getEmpresa } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { MESES_ABREV } from "@/lib/meses";
import { METRICAS_META, type CampoMeta } from "@/lib/metas";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ano =
    Number(new URL(req.url).searchParams.get("ano")) ||
    new Date().getFullYear();

  const empresa = await getEmpresa(id);
  if (!empresa) return new Response("Empresa não encontrada", { status: 404 });

  // Pré-preenche com as metas atuais do ano (baixar = editar a partir do que já existe).
  const supabase = await createClient();
  const { data } = await supabase
    .from("metas")
    .select("*")
    .eq("empresa_id", id)
    .eq("ano", ano);
  const byMes = new Map<number, Record<string, number>>(
    (data ?? []).map((r) => [r.mes as number, r as Record<string, number>]),
  );

  const header = ["Métrica", ...MESES_ABREV];
  const rows = METRICAS_META.map((m) => {
    const cells = Array.from({ length: 12 }, (_, i) => {
      const r = byMes.get(i + 1);
      const v = r ? Number(r[m.campo as CampoMeta]) : 0;
      return v === 0 ? "" : v;
    });
    return [m.label, ...cells];
  });
  const aoa = [header, ...rows];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [{ wch: 26 }, ...Array(12).fill({ wch: 11 })];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Metas");

  const buf: ArrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="modelo-metas-${empresa.slug}-${ano}.xlsx"`,
    },
  });
}
