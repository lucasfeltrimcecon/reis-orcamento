import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCaApp } from "@/lib/conta-azul/store";
import { authorizeUrl } from "@/lib/conta-azul/oauth";

// Inicia o OAuth: master clica "Conectar base" -> redireciona pro Conta Azul.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { data: isMaster } = await supabase.rpc("is_master");
  if (!isMaster) return NextResponse.redirect(new URL("/login", request.url));

  const empresaId = request.nextUrl.searchParams.get("empresa") ?? "";
  const apelido = (request.nextUrl.searchParams.get("apelido") ?? "Conta Azul").slice(0, 60);
  if (!empresaId) {
    return NextResponse.redirect(new URL("/integracoes?erro=empresa", request.url));
  }

  const app = await getCaApp();
  if (!app) {
    return NextResponse.redirect(new URL("/integracoes?erro=sem_app", request.url));
  }

  const state = Buffer.from(JSON.stringify({ empresaId, apelido })).toString(
    "base64url",
  );
  return NextResponse.redirect(authorizeUrl(app, state));
}
