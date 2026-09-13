import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { session_id, ...gameData } = body;

    if (!session_id || typeof session_id !== "string" || session_id.length < 16) {
      return NextResponse.json({ error: "invalid session_id" }, { status: 400 });
    }

    const db = supabaseAdmin();
    await db.from("radar_data").upsert(
      {
        session_id,
        game_data: gameData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
