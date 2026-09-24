import { NextResponse, after } from "next/server";
import { pruneStale, supabaseAdmin } from "@/lib/supabase";

const NO_CACHE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

// GET /api/stats — returns active user count and active radar session count
export async function GET() {
  try {
    const db = supabaseAdmin();
    // clients ping once a minute, so three minutes allows for a missed one
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const tenSecAgo = new Date(Date.now() - 10 * 1000).toISOString();

    const [users, radars] = await Promise.all([
      db
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .gte("last_ping", threeMinAgo),
      db
        .from("radar_data")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", tenSecAgo)
        .eq("game_data->>connected", "true"), // in a match, not paused
    ]);

    after(pruneStale); // every visitor polls this, so old rows go even with no client online
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
