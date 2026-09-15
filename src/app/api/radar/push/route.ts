import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

const MAX_PAYLOAD_BYTES = 64 * 1024;

export async function POST(req: Request) {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }

    const rawText = await req.text();
    if (rawText.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const { session_id, ...gameData } = body;

    if (!session_id || typeof session_id !== "string" || session_id.length < 16 || session_id.length > 64) {
      console.warn("[radar/push] rejected: invalid session_id", session_id);
      return NextResponse.json({ error: "invalid session_id" }, { status: 400 });
    }

    if (!/^[a-f0-9]+$/.test(session_id as string)) {
      return NextResponse.json({ error: "invalid session_id format" }, { status: 400 });
    }

    const rl = rateLimit(`radar:${session_id}`, 60, 10_000);
    if (!rl.ok) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const db = supabaseAdmin();
    const { error } = await db.from("radar_data").upsert(
      {
        session_id,
        game_data: gameData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    if (error) {
      console.error("[radar/push] supabase error:", error.message);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[radar/push] exception:", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
