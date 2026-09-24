import { createHash } from "node:crypto";
import { NextResponse, after } from "next/server";
import { pruneStale, supabaseAdmin } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/emotes/sync — shared emotes between gamesense.cloud users in the same match.
// The client (every ~2 s while it is in a match with other players) sends:
//   { key: 64 hex, me: SteamID64, emote: { value, age } | null, players: [SteamID64, ...] }
// and gets back which of `players` are emoting: { emotes: [{ steam, value, age }] }.
// `value` is the client's emote (0-18 a CS2 clip, 1000-1081 a Fortnite dance), `age` how
// many ms it has been playing. SteamIDs are only ever stored hashed with a server secret,
// and only the client that set a state (same key) can change or clear it.

const STEAM_ID = /^7656119\d{10}$/;
const LIVE_MS = 8_000; // a state lasts this long past its owner's last sync (a crash, a lost connection)
const MAX_PLAYERS = 64;
const MAX_BODY = 8 * 1024;

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
let pepper = "";
const steamHash = (steam: string) => {
  // A server-side secret derived from the service key: no extra environment variable to set up.
  if (!pepper) pepper = sha256(`gscloud-emotes:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`);
  return sha256(`${pepper}:${steam}`);
};
const validValue = (v: unknown): v is number =>
  Number.isInteger(v) && (((v as number) >= 0 && (v as number) <= 18) || ((v as number) >= 1000 && (v as number) <= 1081));

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const { key, me, emote, players } = body ?? {};
  if (typeof key !== "string" || !/^[a-f0-9]{64}$/.test(key)) {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }
  if (typeof me !== "string" || !STEAM_ID.test(me)) {
    return NextResponse.json({ error: "invalid_me" }, { status: 400 });
  }
  if (!Array.isArray(players) || players.length > MAX_PLAYERS || !players.every((p) => typeof p === "string" && STEAM_ID.test(p))) {
    return NextResponse.json({ error: "invalid_players" }, { status: 400 });
  }
  let mine: { value: number; age: number } | null = null;
  if (emote != null) {
    const e = emote as Record<string, unknown>;
    if (typeof e !== "object" || !validValue(e.value) || typeof e.age !== "number" || !Number.isFinite(e.age)) {
      return NextResponse.json({ error: "invalid_emote" }, { status: 400 });
    }
    mine = { value: e.value, age: Math.min(Math.max(0, e.age), 10 * 60_000) };
  }

  const owner = sha256(key);
  if (!rateLimit(`emotes:${owner}`, 90, 60_000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const db = supabaseAdmin();
  const now = Date.now();
  const self = steamHash(me);

  // Publish (or clear) our own state. A SteamID another client is live on is left alone.
  if (mine) {
    const { data: current } = await db.from("emote_states").select("owner, updated_at").eq("steam_hash", self).maybeSingle();
    const taken = current && current.owner !== owner && Date.parse(current.updated_at) > now - LIVE_MS;
    if (!taken) {
      const { error } = await db.from("emote_states").upsert(
        {
          steam_hash: self,
          owner,
          value: mine.value,
          started_at: new Date(now - mine.age).toISOString(),
          updated_at: new Date(now).toISOString(),
        },
        { onConflict: "steam_hash" }
      );
      if (error) console.error("[emotes] upsert:", error.message);
    }
  } else {
    const { error } = await db.from("emote_states").delete().eq("steam_hash", self).eq("owner", owner);
    if (error) console.error("[emotes] delete:", error.message);
  }

  // Who of the other players is emoting.
  const byHash = new Map<string, string>();
  for (const p of players as string[]) if (p !== me) byHash.set(steamHash(p), p);
  let emotes: { steam: string; value: number; age: number }[] = [];
  if (byHash.size) {
    const { data, error } = await db
      .from("emote_states")
      .select("steam_hash, value, started_at")
      .in("steam_hash", [...byHash.keys()])
      .gte("updated_at", new Date(now - LIVE_MS).toISOString());
    if (error) console.error("[emotes] select:", error.message);
    emotes = (data ?? []).map((r) => ({
      steam: byHash.get(r.steam_hash) as string,
      value: r.value,
      age: Math.max(0, now - Date.parse(r.started_at)),
    }));
  }

  after(pruneStale);
  return NextResponse.json({ emotes }, { headers: { "Cache-Control": "no-store" } });
}
