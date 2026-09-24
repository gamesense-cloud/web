import { createHash } from "node:crypto";
import { NextResponse, after } from "next/server";
import { pruneStale, supabaseAdmin } from "@/lib/supabase";
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

    // The client paces itself up to 20/s; this only stops a runaway one.
    if (!rateLimit(`radar:${session_id}`, 300, 10_000).ok) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    // The client stopped the radar or unloaded: the session goes with it.
    if (gameData.ended === true) {
      const { error } = await supabaseAdmin().from("radar_data").delete().eq("session_id", session_id);
      if (error) console.error("[radar/push] supabase error:", error.message);
      return NextResponse.json({ ok: true });
    }

    // Answer first and write after: the client paces itself on this round trip,
    // which should measure its own connection rather than the database.
    const updated_at = new Date().toISOString();
    after(async () => {
      const { error } = await supabaseAdmin()
        .from("radar_data")
        .upsert({ session_id, game_data: gameData, updated_at }, { onConflict: "session_id" });
      if (error) console.error("[radar/push] supabase error:", error.message);
      await pruneStale();
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[radar/push] exception:", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
