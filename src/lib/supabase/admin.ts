import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client com SERVICE ROLE — ignora TODO o RLS. Uso EXCLUSIVO para operações
 * de auth que não têm equivalente via RLS (auth.admin.createUser/deleteUser).
 *
 * SEGURANÇA:
 * - `import "server-only"` quebra o build se algum componente client importar isto.
 * - A env NÃO tem prefixo NEXT_PUBLIC_, então nunca vai pro bundle do browser.
 * - Nunca usar este client para ler/gravar dados de negócio (use o client anon,
 *   que passa pelo RLS).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ausente. Configure a variável de ambiente (server-only).",
    );
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
