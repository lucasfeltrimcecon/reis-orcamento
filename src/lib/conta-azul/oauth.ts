import "server-only";

// Endpoints OAuth2 da API nova do Conta Azul (api-v2).
const AUTH_BASE = "https://auth.contaazul.com/oauth2";
export const CA_REDIRECT_URI =
  "https://reis-orcamento.vercel.app/api/contaazul/callback";

// Credenciais de UMA base (cada integração tem as suas; não há app global).
export type CaCreds = {
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

/** URL de autorização (Authorization Code). `state` = token opaco da base. */
export function authorizeUrl(creds: CaCreds, state: string): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: creds.client_id,
    redirect_uri: CA_REDIRECT_URI,
    state,
  });
  if (creds.scope) p.set("scope", creds.scope);
  return `${AUTH_BASE}/authorize?${p.toString()}`;
}

async function postToken(
  creds: CaCreds,
  body: Record<string, string>,
): Promise<TokenResp> {
  const basic = Buffer.from(
    `${creds.client_id}:${creds.client_secret}`,
  ).toString("base64");
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

export function exchangeCode(
  creds: CaCreds,
  code: string,
): Promise<TokenResp> {
  return postToken(creds, {
    grant_type: "authorization_code",
    code,
    redirect_uri: CA_REDIRECT_URI,
  });
}

export function refreshToken(
  creds: CaCreds,
  refresh: string,
): Promise<TokenResp> {
  return postToken(creds, {
    grant_type: "refresh_token",
    refresh_token: refresh,
  });
}
