import { createHash } from "node:crypto";
import { NextResponse, after } from "next/server";
import { pruneStale, supabaseAdmin } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/emotes/sync — shared emotes between gamesense.cloud users in the same match.
// The client sends, while it is in a match with other players:
//   { key: 64 hex, me: SteamID64, emote: { value, age } | null, present: bool, players: [SteamID64, ...] }
// and gets back which of `players` are emoting, and how many of them run gamesense.cloud:
//   { emotes: [{ steam, value, age }], present: n }
// `value` is the client's emote (0-18 a CS2 clip, 1000-1081 a Fortnite dance), `age` how many ms
// it has been playing. `present` (sharing on) keeps a row with value -1 while not emoting, so the
// others know to ask often (every ~0.4 s) and see an emote almost as it starts. SteamIDs are only
// ever stored hashed with a server secret, and only the client that set a row can change it.

const STEAM_ID = /^7656119\d{10}$/;
const LIVE_MS = 8_000; // a row lasts this long past its owner's last sync (a crash, a lost connection)
const MAX_PLAYERS = 64;
const MAX_BODY = 8 * 1024;
const PRESENT = -1; // row value: sharing, not emoting

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
  const { key, me, emote, present, players } = body ?? {};
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
  // ~2.5 syncs a second at most (0.4 s polling plus a sync the moment an emote starts or stops)
  if (!rateLimit(`emotes:${owner}`, 200, 60_000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const db = supabaseAdmin();
  const now = Date.now();
  const self = steamHash(me);
  const byHash = new Map<string, string>();
  for (const p of players as string[]) if (p !== me) byHash.set(steamHash(p), p);

  // One database round trip before answering: our row's owner and the other players' rows, together.
  const [current, others] = await Promise.all([
    mine || present === true
      ? db.from("emote_states").select("owner, updated_at").eq("steam_hash", self).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    byHash.size
      ? db
          .from("emote_states")
          .select("steam_hash, value, started_at")
          .in("steam_hash", [...byHash.keys()])
          .gte("updated_at", new Date(now - LIVE_MS).toISOString())
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (others.error) console.error("[emotes] select:", others.error.message);

  // Our own row is written after the answer has gone out; a SteamID another client is live on is left alone.
  after(async () => {
    const cur = current.data as { owner: string; updated_at: string } | null;
    const taken = cur && cur.owner !== owner && Date.parse(cur.updated_at) > now - LIVE_MS;
    if (mine || present === true) {
      if (!taken) {
        const { error } = await db.from("emote_states").upsert(
          {
            steam_hash: self,
            owner,
            value: mine ? mine.value : PRESENT,
            started_at: new Date(now - (mine ? mine.age : 0)).toISOString(),
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
    await pruneStale();
  });

  const rows = (others.data ?? []) as { steam_hash: string; value: number; started_at: string }[];
  const emotes = rows
    .filter((r) => r.value !== PRESENT)
    .map((r) => ({
      steam: byHash.get(r.steam_hash) as string,
      value: r.value,
      age: Math.max(0, now - Date.parse(r.started_at)),
    }));
  return NextResponse.json({ emotes, present: rows.length }, { headers: { "Cache-Control": "no-store" } });
}
