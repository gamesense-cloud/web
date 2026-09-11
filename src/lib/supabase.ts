import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Clients are built on first use rather than at module load. createClient
 * throws when the URL is missing, so constructing at import time meant any
 * build without the environment set would fail while collecting pages —
 * even for routes that never touch the database.
 */
let browserClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set — add it to .env.local locally, and to the project's environment variables on Vercel`
    );
  }
  return value;
}

/** Anon client. The dashboard does not use this; it is here for the public site. */
export function supabaseBrowser(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(
      required("NEXT_PUBLIC_SUPABASE_URL"),
      required("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    );
  }
  return browserClient;
}

/**
 * Service-role client, for route handlers and server components only. Every
 * table has RLS on with no policies, so this is the only thing that can read
 * them — never import it into a client component.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      required("NEXT_PUBLIC_SUPABASE_URL"),
      required("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return adminClient;
}

/** Kept for the existing pages that import it by name. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(supabaseBrowser(), prop);
  },
});
