import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/stats — returns { active_users: number }
export async function GET() {
  try {
    const db = supabaseAdmin();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await db
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .gte("last_ping", fiveMinAgo);

    return NextResponse.json({ active_users: count ?? 0 });
  } catch {
    return NextResponse.json({ active_users: 0 });
  }
}
