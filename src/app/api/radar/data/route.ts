import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session = searchParams.get("session");

  if (!session) {
    return NextResponse.json({ error: "missing session" }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("radar_data")
      .select("game_data, updated_at")
      .eq("session_id", session)
      .single();

    if (error || !data) {
      return NextResponse.json({ connected: false, error: "session not found" });
    }

    const age = Date.now() - new Date(data.updated_at).getTime();
    if (age > 10000) {
      return NextResponse.json({ connected: false, stale: true });
    }

    return NextResponse.json(data.game_data);
  } catch {
    return NextResponse.json({ connected: false }, { status: 500 });
  }
}
