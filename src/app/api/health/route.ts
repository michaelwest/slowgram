import { NextResponse } from "next/server";

import { getCollectorSession } from "@/lib/collector-session";
import { pool } from "@/lib/db";

export async function GET() {
  const session = await getCollectorSession();
  const db = await pool.query("SELECT NOW()");
  return NextResponse.json({
    ok: true,
    database: Boolean(db.rows[0]),
    session: {
      available: Boolean(session?.last_login_at),
      challengeState: session?.challenge_state ?? null,
      lastError: session?.last_error ?? null
    }
  });
}
