import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Gera um link assinado curto (120s) e redireciona pra ele. O RLS escopa:
 * cliente só baixa documentos das empresas dele; master baixa qualquer um.
 * Documento fora do escopo → o select retorna null → 404.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: doc } = await supabase
    .from("documentos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!doc) {
    return new NextResponse("Documento não encontrado.", { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from("documentos")
    .createSignedUrl(doc.storage_path, 120, { download: true });
  if (error || !signed) {
    return new NextResponse("Não foi possível gerar o link.", { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
