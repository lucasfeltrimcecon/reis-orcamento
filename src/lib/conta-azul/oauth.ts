import "server-only";

// Endpoints OAuth2 da API nova do Conta Azul (api-v2).
const AUTH_BASE = "https://auth.contaazul.com/oauth2";
export const CA_REDIRECT_URI =
  "https://reis-orcamento.vercel.app/api/contaazul/callback";

export type CaApp = {
  client_id: string;
  client_secret: string;
  scope: string | null;
};

export type TokenResp = {
  access_token: string;
  refresh_token: string;
  expires_in: number; // segundos
  scope?: string;
  token_type?: string;
};

/** URL de autorização (Authorization Code). `state` carrega empresa+apelido. */
export function authorizeUrl(app: CaApp, state: string): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: app.client_id,
    redirect_uri: CA_REDIRECT_URI,
    state,
  });
  if (app.scope) p.set("scope", app.scope);
  return `${AUTH_BASE}/authorize?${p.toString()}`;
}

async function postToken(
  app: CaApp,
  body: Record<string, string>,
): Promise<TokenResp> {
  const basic = Buffer.from(`${app.client_id}:${app.client_secret}`).toString(
    "base64",
  );
  const res = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Conta Azul token (${res.status}): ${txt.slice(0, 300)}`);
  }
  return (await res.json()) as TokenResp;
}

export function exchangeCode(app: CaApp, code: string): Promise<TokenResp> {
  return postToken(app, {
    grant_type: "authorization_code",
    code,
    redirect_uri: CA_REDIRECT_URI,
  });
}

export function refreshToken(app: CaApp, refresh: string): Promise<TokenResp> {
  return postToken(app, {
    grant_type: "refresh_token",
    refresh_token: refresh,
  });
}
