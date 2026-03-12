import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { mediaAbsolutePath } from "@/lib/paths";
import { requireOperatorForRoute } from "@/lib/route-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const unauthorized = await requireOperatorForRoute();
  if (unauthorized) {
    return unauthorized;
  }
  const { path: segments } = await params;
  const decoded = segments.map((segment) => decodeURIComponent(segment)).join("/");
  const file = await readFile(mediaAbsolutePath(decoded));
  return new NextResponse(file, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600"
    }
  });
}
