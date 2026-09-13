import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

let lastCleanup = 0;
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
const STALE_THRESHOLD = 60 * 60 * 1000;  // 1 hour

// DLL sends POST /api/ping with { session_id: "..." }
// Upserts into sessions table so we can count active users
export async function POST(req: Request) {
  try {
    const { session_id } = await req.json();
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
    await db.from("sessions").upsert(
      { session_id, last_ping: new Date().toISOString() },
      { onConflict: "session_id" }
    );

    const now = Date.now();
    if (now - lastCleanup > CLEANUP_INTERVAL) {
      lastCleanup = now;
      const cutoff = new Date(now - STALE_THRESHOLD).toISOString();
      db.from("sessions").delete().lt("last_ping", cutoff).then(() => {});
      db.from("radar_data").delete().lt("updated_at", cutoff).then(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
