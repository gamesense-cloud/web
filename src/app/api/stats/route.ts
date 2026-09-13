import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

// GET /api/stats — returns active user count and active radar session count
export async function GET() {
  try {
    const db = supabaseAdmin();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const tenSecAgo = new Date(Date.now() - 10 * 1000).toISOString();

    const [users, radars] = await Promise.all([
      db
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .gte("last_ping", fiveMinAgo),
      db
        .from("radar_data")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", tenSecAgo),
    ]);

    return NextResponse.json(
      {
        active_users: users.count ?? 0,
        active_radars: radars.count ?? 0,
      },
      { headers: NO_CACHE }
    );
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500, headers: NO_CACHE });
  }
}
