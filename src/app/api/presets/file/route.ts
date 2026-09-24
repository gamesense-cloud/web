import { NextResponse } from "next/server";
import { PRESET_FOLDERS, getPresetFileStream, getPresetFiles } from "@/lib/github";
import { rateLimit } from "@/lib/rate-limit";

// Streams stay open while a big file (a dance song is ~10 MB) comes through.
export const maxDuration = 60;

// GET /api/presets/file?path=emotes/<file>&sha=<git blob sha> — one preset file. Only paths the
// listing above contains are served. With the current sha the response is immutable and cached.
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // a first sync is one request per file (~150 for the emotes)
  if (!rateLimit(`preset-file:${ip}`, 400, 10 * 60_000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const params = new URL(req.url).searchParams;
  const path = params.get("path") ?? "";
  const folder = path.split("/")[0];
  if (!PRESET_FOLDERS.includes(folder)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const file = (await getPresetFiles(folder)).find((f) => f.path === path);
  if (!file) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const stream = await getPresetFileStream(file.path);
  if (!stream) {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }

  const pinned = params.get("sha") === file.sha;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(file.size),
      "X-Preset-Sha": file.sha,
      "Cache-Control": pinned
        ? "public, max-age=31536000, s-maxage=31536000, immutable"
        : "no-store",
    },
  });
}
