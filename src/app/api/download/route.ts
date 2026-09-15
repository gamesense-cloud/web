import { NextResponse } from "next/server";
import { getReleaseAssetStream } from "@/lib/github";

// GET /api/download — streams the latest launcher release asset
export async function GET() {
  const asset = await getReleaseAssetStream("launcher");

  if (!asset || !asset.stream) {
    return NextResponse.json(
      { error: "No release available yet" },
      { status: 404 }
    );
  }

  const tag = Math.random().toString(36).slice(2, 10);
  const name = `gscloud-${tag}.exe`;

  return new NextResponse(asset.stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Content-Length": String(asset.size),
    },
  });
}
