import { NextResponse } from "next/server";
import { PRESET_FOLDERS, getPresetFiles } from "@/lib/github";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/presets?folder=emotes — the preset files the client keeps in
// Documents\gscloud\<folder>: { folder, files: [{ path, size, sha }] }, sha = git blob sha.
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`presets:${ip}`, 30, 60_000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const folder = new URL(req.url).searchParams.get("folder") ?? "";
  if (!PRESET_FOLDERS.includes(folder)) {
    return NextResponse.json({ error: "unknown folder" }, { status: 404 });
  }

  const files = await getPresetFiles(folder);
  return NextResponse.json({ folder, files }, { headers: { "Cache-Control": "no-store" } });
}
