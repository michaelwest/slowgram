import { formatInTimeZone } from "date-fns-tz";

import { pool } from "./db";
import { env } from "./env";
import { sendDigestEmail } from "./digest-email";
import { listPostsForDate } from "./posts";
import { writeAuditEvent } from "./audit";

export async function generateDigestForDate(date = new Date()) {
  const digestDate = formatInTimeZone(date, env.DIGEST_TIMEZONE, "yyyy-MM-dd");
  const posts = await listPostsForDate(digestDate);

  const existing = await pool.query<{ id: string; status: string }>(
    "SELECT id, status FROM digests WHERE digest_date = $1",
    [digestDate]
  );

  if (posts.length === 0) {
    if (!existing.rows[0]) {
      await pool.query(
        `
          INSERT INTO digests (digest_date, status, generated_at, post_count)
          VALUES ($1, 'skipped', NOW(), 0)
        `,
        [digestDate]
      );
    }
    await writeAuditEvent("digest.skipped", "No posts available for digest", { digestDate });
    return { digestDate, postCount: 0, skipped: true };
  }

  let digestId = existing.rows[0]?.id;
  if (!digestId) {
    const insert = await pool.query<{ id: string }>(
      `
        INSERT INTO digests (digest_date, status, generated_at, post_count)
        VALUES ($1, 'generated', NOW(), $2)
        RETURNING id
      `,
      [digestDate, posts.length]
    );
    digestId = insert.rows[0].id;
  } else {
    await pool.query(
      `
        UPDATE digests
        SET status = 'generated', generated_at = NOW(), post_count = $2
        WHERE id = $1
      `,
      [digestId, posts.length]
    );
    await pool.query("DELETE FROM digest_items WHERE digest_id = $1", [digestId]);
  }

  for (const [index, post] of posts.entries()) {
    await pool.query(
      `
        INSERT INTO digest_items (digest_id, post_id, position)
        VALUES ($1, $2, $3)
      `,
      [digestId, post.id, index]
    );
  }

  await writeAuditEvent("digest.generated", "Digest generated", { digestDate, postCount: posts.length });
  return { digestDate, digestId, postCount: posts.length, skipped: false };
}

export async function sendDigestForDate(date = new Date()) {
  const result = await generateDigestForDate(date);
  if (result.skipped) {
    return result;
  }

  const html = await sendDigestEmail(result.digestDate);
  await pool.query(
    `
      UPDATE digests
      SET status = 'sent', sent_at = NOW()
      WHERE digest_date = $1
    `,
    [result.digestDate]
  );
  await writeAuditEvent("digest.sent", "Digest email sent", {
    digestDate: result.digestDate,
    postCount: result.postCount
  });
  return { ...result, html };
}
