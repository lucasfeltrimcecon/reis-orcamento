import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCaApp } from "@/lib/conta-azul/store";
import { exchangeCode } from "@/lib/conta-azul/oauth";

// Retorno do OAuth: troca o code por tokens e grava a conexão da base.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { data: isMaster } = await supabase.rpc("is_master");
  if (!isMaster) return NextResponse.redirect(new URL("/login", request.url));

  const sp = request.nextUrl.searchParams;
  const erro = sp.get("error");
  if (erro) {
    return NextResponse.redirect(
      new URL(`/integracoes?erro=${encodeURIComponent(erro)}`, request.url),
    );
  }

  const code = sp.get("code");
  const stateRaw = sp.get("state");
  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL("/integracoes?erro=callback", request.url));
  }

  let empresaId = "";
  let apelido = "Conta Azul";
  try {
    const s = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    empresaId = String(s.empresaId ?? "");
    apelido = String(s.apelido ?? "Conta Azul");
  } catch {
    return NextResponse.redirect(new URL("/integracoes?erro=state", request.url));
  }
  if (!empresaId) {
    return NextResponse.redirect(new URL("/integracoes?erro=state", request.url));
  }

  const app = await getCaApp();
  if (!app) {
    return NextResponse.redirect(new URL("/integracoes?erro=sem_app", request.url));
  }

  try {
    const tok = await exchangeCode(app, code);
    const expiresAt = new Date(
      Date.now() + (tok.expires_in ?? 3600) * 1000,
    ).toISOString();
    const { error } = await supabase.from("conta_azul_conexao").insert({
      empresa_id: empresaId,
      apelido,
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expires_at: expiresAt,
      scope: tok.scope ?? app.scope ?? null,
      conectado_por: user.id,
    });
    if (error) {
      return NextResponse.redirect(new URL("/integracoes?erro=salvar", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/integracoes?erro=token", request.url));
  }

  return NextResponse.redirect(new URL("/integracoes?ok=conectado", request.url));
}
