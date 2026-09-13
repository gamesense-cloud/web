import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session = searchParams.get("session");

  if (!session) {
    return NextResponse.json({ status: "error", error: "missing session" }, { status: 400, headers: NO_CACHE });
  }

  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("radar_data")
      .select("game_data, updated_at")
      .eq("session_id", session)
      .single();

    if (error || !data) {
      return NextResponse.json({
        status: "no_session",
        connected: false,
        reason: "session_not_found",
      }, { headers: NO_CACHE });
    }

    const age = Date.now() - new Date(data.updated_at).getTime();

    if (age > 10000) {
      return NextResponse.json({
        status: "stale",
        connected: false,
        reason: "stale",
        age_ms: age,
      }, { headers: NO_CACHE });
    }

    const gd = data.game_data as Record<string, unknown>;
    const result = {
      ...gd,
      status: gd.connected ? "live" : "waiting",
      age_ms: age,
    };

    return NextResponse.json(result, { headers: NO_CACHE });
  } catch (e) {
    console.error("[radar/data] exception:", e);
    return NextResponse.json({ status: "error", connected: false }, { status: 500, headers: NO_CACHE });
  }
}
