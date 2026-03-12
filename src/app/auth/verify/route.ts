import { NextResponse } from "next/server";

import { consumeMagicLink } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const ok = await consumeMagicLink(email, token);
  return NextResponse.redirect(new URL(ok ? "/" : "/login", request.url));
}
