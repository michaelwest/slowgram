import { cookies } from "next/headers";

import { getEnv } from "./env";
import { pool } from "./db";
import { randomToken, sha256 } from "./crypto";

const SESSION_COOKIE = "slowgram_session";

export async function createAppSession(email: string) {
  const env = getEnv();
  const token = randomToken(32);
  const sessionHash = sha256(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await pool.query(
    `
      INSERT INTO app_sessions (email, session_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [email, sessionHash, expiresAt]
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.APP_BASE_URL.startsWith("https://"),
    sameSite: "lax",
    expires: expiresAt,
    path: "/"
  });
}

export async function destroyAppSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await pool.query("DELETE FROM app_sessions WHERE session_hash = $1", [sha256(token)]);
  }
  store.delete(SESSION_COOKIE);
}

export async function getAuthenticatedEmail() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const result = await pool.query<{ email: string }>(
    `
      SELECT email
      FROM app_sessions
      WHERE session_hash = $1
        AND expires_at > NOW()
      LIMIT 1
    `,
    [sha256(token)]
  );
  return result.rows[0]?.email ?? null;
}
