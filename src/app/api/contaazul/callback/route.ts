import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConexaoPorState, finalizarConexao } from "@/lib/conta-azul/store";
import { exchangeCode } from "@/lib/conta-azul/oauth";

// Retorno do OAuth: acha a base pelo state, troca o code por tokens
// (usando as credenciais DA base) e finaliza a conexão.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { data: isMaster } = await supabase.rpc("is_master");
  if (!isMaster) return NextResponse.redirect(new URL("/login", request.url));

  const sp = request.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");

  // CA pode voltar com erro (usuário negou) — sem state confiável, volta pro resumo.
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/integracoes?erro=callback", request.url),
    );
  }

  const conexao = await getConexaoPorState(state);
  if (!conexao) {
    return NextResponse.redirect(new URL("/integracoes?erro=state", request.url));
  }

  const destino = `/empresas/${conexao.empresa_id}/integracoes`;
  if (!conexao.client_id || !conexao.client_secret) {
    return NextResponse.redirect(
      new URL(`${destino}?erro=sem_credencial`, request.url),
    );
  }

  try {
    const tok = await exchangeCode(
      {
        client_id: conexao.client_id,
        client_secret: conexao.client_secret,
        scope: conexao.scope,
      },
      code,
    );
    const expiresAt = new Date(
      Date.now() + (tok.expires_in ?? 3600) * 1000,
    ).toISOString();
    const erro = await finalizarConexao(conexao.id, {
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expires_at: expiresAt,
      scope: tok.scope ?? conexao.scope ?? null,
    });
    if (erro) {
      return NextResponse.redirect(new URL(`${destino}?erro=salvar`, request.url));
    }
  } catch {
    return NextResponse.redirect(new URL(`${destino}?erro=token`, request.url));
  }

  return NextResponse.redirect(new URL(`${destino}?ok=conectado`, request.url));
}
