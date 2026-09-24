import { createHash } from "node:crypto";
import { NextResponse, after } from "next/server";
import { broadcastRadar, pruneStale, radarShareMs, refreshRadarCount, supabaseAdmin } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

const MAX_PAYLOAD_BYTES = 64 * 1024;

// The client signs every push with a secret 256-bit key. The public session id in
// the share link is the first 32 hex digits of sha256(key), so anyone can watch a
// link but only the client that made it can write to it. The key is never stored.
export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    const rawText = await req.text();
    if (rawText.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const { key, ...gameData } = body as Record<string, unknown>;
    delete gameData.session_id; // sent by old clients, never trusted
    if (typeof key !== "string" || !/^[a-f0-9]{64}$/.test(key)) {
      return NextResponse.json({ error: "invalid_key" }, { status: 400 });
    }
    const session_id = createHash("sha256").update(key).digest("hex").slice(0, 32);

    // The client paces itself up to 32/s; this only stops a runaway one.
    if (!rateLimit(`radar:${session_id}`, 450, 10_000).ok) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    // The client stopped the radar or unloaded: the session goes with it.
    if (gameData.ended === true) {
      after(() => broadcastRadar(session_id, "ended", {}));
      const { error } = await supabaseAdmin().from("radar_data").delete().eq("session_id", session_id);
      if (error) console.error("[radar/push] supabase error:", error.message);
      return NextResponse.json({ ok: true });
    }

    // Answer first, then pass it on: the client paces itself on this round trip. Open
    // radar pages get the update pushed over Realtime straight away; the database only
    // keeps a copy (every 16th live update, every heartbeat) for a page just opened and
    // for the counters.
    const sent = Date.now();
    const seq = typeof gameData.seq === "number" ? gameData.seq : null;
    const persist = gameData.connected !== true || seq == null || seq % 16 === 0;
    after(async () => {
      await broadcastRadar(session_id, "snap", { ...gameData, sent });
      if (persist) {
        const { error } = await supabaseAdmin()
          .from("radar_data")
          .upsert({ session_id, game_data: gameData, updated_at: new Date(sent).toISOString() }, { onConflict: "session_id" });
        if (error) console.error("[radar/push] supabase error:", error.message);
      }
      await refreshRadarCount();
      await pruneStale();
    });

    // every open radar gets the same share of the realtime budget
    return NextResponse.json({ ok: true, interval: radarShareMs() });
  } catch (e) {
    console.error("[radar/push] exception:", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
