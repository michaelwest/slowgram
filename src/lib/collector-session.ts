import { readFile, writeFile } from "node:fs/promises";

import { decryptText, encryptText } from "./crypto";
import { pool } from "./db";
import { getEnv } from "./env";
import { ensureAppDirectories, playwrightStatePath } from "./paths";
import type { CollectorSession } from "./types";

export async function getCollectorSession() {
  const result = await pool.query<CollectorSession>(
    `
      SELECT *
      FROM collector_sessions
      ORDER BY created_at DESC
      LIMIT 1
    `
  );
  return result.rows[0] ?? null;
}

export async function upsertCollectorSession(input: {
  sessionStatePath?: string;
  lastLoginAt?: Date | null;
  challengeState?: string | null;
  lastError?: string | null;
}) {
  const existing = await getCollectorSession();
  if (existing) {
    const result = await pool.query<CollectorSession>(
      `
        UPDATE collector_sessions
        SET
          session_state_path = COALESCE($2, session_state_path),
          last_login_at = COALESCE($3, last_login_at),
          challenge_state = $4,
          last_error = $5,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        existing.id,
        input.sessionStatePath ?? null,
        input.lastLoginAt ?? null,
        input.challengeState ?? existing.challenge_state,
        input.lastError ?? existing.last_error
      ]
    );
    return result.rows[0];
  }

  const sessionPath = input.sessionStatePath ?? playwrightStatePath();
  const result = await pool.query<CollectorSession>(
    `
      INSERT INTO collector_sessions (
        session_state_path,
        last_login_at,
        challenge_state,
        last_error
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [sessionPath, input.lastLoginAt ?? null, input.challengeState ?? null, input.lastError ?? null]
  );
  return result.rows[0];
}

export async function importStorageState(rawJson: string) {
  const env = getEnv();
  await ensureAppDirectories();
  const destination = playwrightStatePath();
  await writeFile(destination, encryptText(rawJson, env.LOGIN_SESSION_ENCRYPTION_KEY), "utf8");
  return upsertCollectorSession({
    sessionStatePath: destination,
    lastLoginAt: new Date(),
    challengeState: null,
    lastError: null
  });
}

export async function loadStorageState() {
  const env = getEnv();
  const session = await getCollectorSession();
  if (!session) {
    return undefined;
  }

  const encrypted = await readFile(session.session_state_path, "utf8");
  return JSON.parse(decryptText(encrypted, env.LOGIN_SESSION_ENCRYPTION_KEY));
}

export async function persistStorageState(rawJson: string) {
  const env = getEnv();
  await ensureAppDirectories();
  const destination = playwrightStatePath();
  await writeFile(destination, encryptText(rawJson, env.LOGIN_SESSION_ENCRYPTION_KEY), "utf8");
  return destination;
}
