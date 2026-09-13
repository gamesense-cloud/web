import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
