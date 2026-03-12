import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LAST_VISIT_COOKIE = "slowgram_last_digest_visit";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/digests")) {
    response.cookies.set(LAST_VISIT_COOKIE, new Date().toISOString(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/"
    });
  }

  return response;
}

export const config = {
  matcher: ["/digests/:path*"]
};
