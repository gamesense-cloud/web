import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (host.startsWith("docs.")) {
    const url = request.nextUrl.clone();
    if (!url.pathname.startsWith("/docs")) {
      url.pathname = `/docs${url.pathname === "/" ? "" : url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
