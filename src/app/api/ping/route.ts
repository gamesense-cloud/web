import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// DLL sends POST /api/ping with { session_id: "..." }
// Upserts into sessions table so we can count active users
export async function POST(req: Request) {
  try {
    const { session_id } = await req.json();
    if (!session_id || typeof session_id !== "string") {
      return NextResponse.json({ error: "missing session_id" }, { status: 400 });
    }

    const db = supabaseAdmin();
    await db.from("sessions").upsert(
      { session_id, last_ping: new Date().toISOString() },
      { onConflict: "session_id" }
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
