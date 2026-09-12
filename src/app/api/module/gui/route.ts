import { NextResponse } from "next/server";
import { getReleaseAssetStream } from "@/lib/github";

export async function GET() {
  const asset = await getReleaseAssetStream("gui");
  if (!asset || !asset.stream) {
    return NextResponse.json({ error: "Module not available" }, { status: 404 });
  }
  return new NextResponse(asset.stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${asset.name}"`,
      "Content-Length": String(asset.size),
    },
  });
}
