import { NextResponse } from "next/server";
import { getLatestRelease } from "@/lib/github";

export async function GET() {
  const release = await getLatestRelease("dll");
  if (!release)
    return new NextResponse("unknown", {
      headers: { "Content-Type": "text/plain" },
    });
  const d = new Date(release.published_at);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return new NextResponse(`${dd}/${mm}/${d.getUTCFullYear()}`, {
    headers: { "Content-Type": "text/plain" },
  });
}
