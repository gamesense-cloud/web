import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { session_id, ...gameData } = body;

    if (!session_id || typeof session_id !== "string" || session_id.length < 16) {
      console.warn("[radar/push] rejected: invalid session_id", session_id);
      return NextResponse.json({ error: "invalid session_id" }, { status: 400 });
    }

    console.log(
      `[radar/push] session=${session_id.slice(0, 8)}… connected=${gameData.connected} map=${gameData.map ?? "none"} players=${gameData.players?.length ?? 0}`
    );

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
