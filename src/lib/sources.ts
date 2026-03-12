import { pool } from "./db";
import type { Source } from "./types";

function normalizeUsername(username: string) {
  return username.trim().replace(/^@/, "").toLowerCase();
}

export async function listSources() {
  const result = await pool.query<Source>(
    `
      SELECT *
      FROM sources
      ORDER BY is_enabled DESC, instagram_username ASC
    `
  );
  return result.rows;
}

export async function listEnabledSources() {
  const result = await pool.query<Source>(
    `
      SELECT *
      FROM sources
      WHERE is_enabled = TRUE AND is_excluded = FALSE
      ORDER BY instagram_username ASC
    `
  );
  return result.rows;
}

export async function upsertSource(username: string, options?: { autoDiscovered?: boolean; enabled?: boolean; excluded?: boolean }) {
  const normalized = normalizeUsername(username);
  const profileUrl = `https://www.instagram.com/${normalized}/`;
  const result = await pool.query<Source>(
    `
      INSERT INTO sources (
        instagram_username,
        instagram_profile_url,
        is_auto_discovered,
        is_enabled,
        is_excluded
      )
      VALUES ($1, $2, $3, COALESCE($4, TRUE), COALESCE($5, FALSE))
      ON CONFLICT (instagram_username)
      DO UPDATE SET
        is_auto_discovered = sources.is_auto_discovered OR EXCLUDED.is_auto_discovered,
        is_enabled = COALESCE($4, sources.is_enabled),
        is_excluded = COALESCE($5, sources.is_excluded),
        updated_at = NOW()
      RETURNING *
    `,
    [normalized, profileUrl, options?.autoDiscovered ?? false, options?.enabled, options?.excluded]
  );
  return result.rows[0];
}

export async function updateSourceFlags(sourceId: string, flags: Partial<Pick<Source, "is_enabled" | "is_excluded">>) {
  const result = await pool.query<Source>(
    `
      UPDATE sources
      SET
        is_enabled = COALESCE($2, is_enabled),
        is_excluded = COALESCE($3, is_excluded),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [sourceId, flags.is_enabled, flags.is_excluded]
  );
  return result.rows[0] ?? null;
}

export async function markSourceChecked(sourceId: string, status: string, success = false) {
  await pool.query(
    `
      UPDATE sources
      SET
        status = $2,
        last_checked_at = NOW(),
        last_success_at = CASE WHEN $3 THEN NOW() ELSE last_success_at END,
        updated_at = NOW()
      WHERE id = $1
    `,
    [sourceId, status, success]
  );
}
