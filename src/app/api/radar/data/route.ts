import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session = searchParams.get("session");

  if (!session) {
    return NextResponse.json({ status: "error", error: "missing session" }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("radar_data")
      .select("game_data, updated_at")
      .eq("session_id", session)
      .single();

    if (error || !data) {
      console.log(`[radar/data] session=${session.slice(0, 8)}… NOT FOUND`);
      return NextResponse.json({
        status: "no_session",
        connected: false,
        reason: "session_not_found",
      });
    }

    const age = Date.now() - new Date(data.updated_at).getTime();

    if (age > 10000) {
      console.log(`[radar/data] session=${session.slice(0, 8)}… STALE (${Math.round(age / 1000)}s old)`);
      return NextResponse.json({
        status: "stale",
        connected: false,
        reason: "stale",
        age_ms: age,
      });
    }

    const gd = data.game_data as Record<string, unknown>;
    const result = {
      ...gd,
      status: gd.connected ? "live" : "waiting",
      age_ms: age,
    };

    console.log(
      `[radar/data] session=${session.slice(0, 8)}… status=${result.status} age=${Math.round(age)}ms map=${gd.map ?? "none"}`
    );

    return NextResponse.json(result);
  } catch (e) {
    console.error("[radar/data] exception:", e);
    return NextResponse.json({ status: "error", connected: false }, { status: 500 });
  }
}
