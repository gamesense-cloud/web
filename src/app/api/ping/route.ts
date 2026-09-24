import { NextResponse, after } from "next/server";
import { pruneStale, supabaseAdmin } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

// The injected client's heartbeat for the online counter: a random id once a
// minute, and `offline: true` when it unloads so the count drops right away.
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`ping:${ip}`, 60, 60_000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const { session_id, offline } = (await req.json()) ?? {};
    if (
      !session_id ||
      typeof session_id !== "string" ||
      session_id.length < 16 ||
      session_id.length > 64 ||
      !/^[a-f0-9]+$/.test(session_id)
    ) {
      return NextResponse.json({ error: "invalid session_id" }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { error } = offline === true
      ? await db.from("sessions").delete().eq("session_id", session_id)
      : await db.from("sessions").upsert(
          { session_id, last_ping: new Date().toISOString() },
          { onConflict: "session_id" }
        );
    if (error) {
      console.error("[ping] supabase error:", error.message);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    after(pruneStale);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
