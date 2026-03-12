import { redirect } from "next/navigation";

import { env } from "./env";
import { pool } from "./db";
import { randomToken, sha256 } from "./crypto";
import { createAppSession, getAuthenticatedEmail } from "./session-store";
import { sendMagicLinkEmail } from "./email";
import { isAllowedOperatorEmail } from "./policies";

export async function requireOperator() {
  const email = await getAuthenticatedEmail();
  if (!isAllowedOperator(email)) {
    redirect("/login");
  }
  return email;
}

export function isAllowedOperator(email: string | null | undefined) {
  return isAllowedOperatorEmail(email, env.ALLOWED_EMAIL);
}

export async function requestMagicLink(email: string) {
  if (email !== env.ALLOWED_EMAIL) {
    return;
  }

  const token = randomToken(32);
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

  await pool.query(
    `
      INSERT INTO login_tokens (email, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [email, tokenHash, expiresAt]
  );

  const url = new URL("/auth/verify", env.APP_BASE_URL);
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);

  await sendMagicLinkEmail(email, url.toString());
}

export async function consumeMagicLink(email: string, token: string) {
  const result = await pool.query<{ id: string }>(
    `
      UPDATE login_tokens
      SET consumed_at = NOW()
      WHERE email = $1
        AND token_hash = $2
        AND consumed_at IS NULL
        AND expires_at > NOW()
      RETURNING id
    `,
    [email, sha256(token)]
  );

  if (!result.rows[0] || email !== env.ALLOWED_EMAIL) {
    return false;
  }

  await createAppSession(email);
  return true;
}
