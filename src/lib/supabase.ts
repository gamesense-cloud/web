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

// Sends one radar update to everyone watching it, over Realtime on the session's private
// channel. Only the service-role key can send there; viewers can only listen (see the
// policy in supabase/schema.sql).
export async function broadcastRadar(session: string, event: string, payload: unknown) {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  // new-style secret keys (sb_secret_...) go in apikey only; legacy JWT keys also as the bearer
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_")) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`${required("NEXT_PUBLIC_SUPABASE_URL")}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages: [{ topic: `radar:${session}`, event, payload, private: true }] }),
  });
  if (!res.ok) console.error("[radar] broadcast failed:", res.status, (await res.text().catch(() => "")).slice(0, 200));
}

// Realtime carries up to REALTIME_BUDGET updates a second between all open radars: up
// to three run at the client's full 32/s, and from the fourth on they all slow down to
// the same share. The count comes from the radars' database rows, at most every 5 s.
const REALTIME_BUDGET = 96;
const radars = { live: 1, checked: 0 };

export function radarShareMs() {
  return Math.ceil(1000 / Math.min(32, REALTIME_BUDGET / Math.max(1, radars.live)));
}

export async function refreshRadarCount() {
  const now = Date.now();
  if (now - radars.checked < 5000) return;
  radars.checked = now;
  const { count, error } = await supabaseAdmin()
    .from("radar_data")
    .select("*", { count: "exact", head: true })
    .gte("updated_at", new Date(now - 10_000).toISOString())
    .eq("game_data->>connected", "true");
  if (!error && count != null) radars.live = count;
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
  const [radar, online, emotes] = await Promise.all([
    db.from("radar_data").delete().lt("updated_at", cutoff),
    db.from("sessions").delete().lt("last_ping", cutoff),
    db.from("emote_states").delete().lt("updated_at", new Date(now - 60_000).toISOString()),
  ]);
  const error = radar.error ?? online.error ?? emotes.error;
  if (error) console.error("[prune]", error.message);
}
