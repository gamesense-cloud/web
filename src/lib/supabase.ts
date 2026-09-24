import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

let lastPrune = 0;

// Radar sessions and online pings are live data only: rows untouched for ten
// minutes are deleted. Runs at most once a minute per server instance, from the
// routes that write them, after their response has gone out.
export async function pruneStale() {
  const now = Date.now();
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  const cutoff = new Date(now - 10 * 60_000).toISOString();
  const db = supabaseAdmin();
  const [radar, online] = await Promise.all([
    db.from("radar_data").delete().lt("updated_at", cutoff),
    db.from("sessions").delete().lt("last_ping", cutoff),
  ]);
  const error = radar.error ?? online.error;
  if (error) console.error("[prune]", error.message);
}
