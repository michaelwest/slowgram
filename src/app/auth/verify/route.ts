import { NextResponse } from "next/server";

import { consumeMagicLink } from "@/lib/auth";
import { getEnv } from "@/lib/env";

export async function GET(request: Request) {
  const env = getEnv();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(new URL("/login", env.APP_BASE_URL));
  }

  const ok = await consumeMagicLink(email, token);
  return NextResponse.redirect(new URL(ok ? "/" : "/login", env.APP_BASE_URL));
}
