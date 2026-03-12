import { pool } from "./db";
import { env } from "./env";
import type { DigestDetail, DigestSummary, MediaAsset, PostRecord } from "./types";

export type IngestedPost = {
  sourceId: string;
  instagramPostId?: string | null;
  caption?: string | null;
  postedAt?: Date | null;
  postType: string;
  carouselSize: number;
  permalink: string;
  checksum?: string | null;
  media: Array<{
    kind: string;
    localPath: string;
    mimeType?: string | null;
    width?: number | null;
    height?: number | null;
    fileSize?: number | null;
    sha256?: string | null;
  }>;
};

export async function postExists(permalink: string, checksum?: string | null) {
  const result = await pool.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM posts
        WHERE permalink = $1 OR ($2 IS NOT NULL AND checksum = $2)
      ) AS exists
    `,
    [permalink, checksum ?? null]
  );
  return result.rows[0]?.exists ?? false;
}

export async function ingestPost(input: IngestedPost) {
  const inserted = await pool.query<PostRecord>(
    `
      INSERT INTO posts (
        source_id,
        instagram_post_id,
        caption,
        posted_at,
        post_type,
        carousel_size,
        permalink,
        checksum
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (permalink)
      DO UPDATE SET
        caption = EXCLUDED.caption,
        posted_at = COALESCE(EXCLUDED.posted_at, posts.posted_at),
        checksum = COALESCE(EXCLUDED.checksum, posts.checksum)
      RETURNING *
    `,
    [
      input.sourceId,
      input.instagramPostId ?? null,
      input.caption ?? null,
      input.postedAt ?? null,
      input.postType,
      input.carouselSize,
      input.permalink,
      input.checksum ?? null
    ]
  );

  const post = inserted.rows[0];

  await pool.query("DELETE FROM media_assets WHERE post_id = $1", [post.id]);
  for (const asset of input.media) {
    await pool.query(
      `
        INSERT INTO media_assets (
          post_id,
          kind,
          local_path,
          mime_type,
          width,
          height,
          file_size,
          sha256
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        post.id,
        asset.kind,
        asset.localPath,
        asset.mimeType ?? null,
        asset.width ?? null,
        asset.height ?? null,
        asset.fileSize ?? null,
        asset.sha256 ?? null
      ]
    );
  }

  return post;
}

export async function listDigests(): Promise<DigestSummary[]> {
  const result = await pool.query<DigestSummary>(
    `
      SELECT
        d.*,
        (
          SELECT ma.local_path
          FROM digest_items di
          JOIN media_assets ma ON ma.post_id = di.post_id
          WHERE di.digest_id = d.id
          ORDER BY di.position ASC
          LIMIT 1
        ) AS cover_path
      FROM digests d
      ORDER BY d.digest_date DESC
    `
  );
  return result.rows;
}

export async function getDigestDetail(digestDate: string): Promise<DigestDetail | null> {
  const digestResult = await pool.query<DigestSummary>(
    `
      SELECT
        d.*,
        (
          SELECT ma.local_path
          FROM digest_items di
          JOIN media_assets ma ON ma.post_id = di.post_id
          WHERE di.digest_id = d.id
          ORDER BY di.position ASC
          LIMIT 1
        ) AS cover_path
      FROM digests d
      WHERE d.digest_date = $1
    `,
    [digestDate]
  );

  const digest = digestResult.rows[0];
  if (!digest) {
    return null;
  }

  const items = await pool.query<
    {
      position: number;
      source_username: string;
    } & PostRecord & {
      media_assets: MediaAsset[];
    }
  >(
    `
      SELECT
        di.position,
        p.*,
        s.instagram_username AS source_username,
        COALESCE(
          (
            SELECT json_agg(ma ORDER BY ma.created_at ASC)
            FROM media_assets ma
            WHERE ma.post_id = p.id
          ),
          '[]'::json
        ) AS media_assets
      FROM digest_items di
      JOIN digests d ON d.id = di.digest_id
      JOIN posts p ON p.id = di.post_id
      JOIN sources s ON s.id = p.source_id
      WHERE d.digest_date = $1
      ORDER BY di.position ASC
    `,
    [digestDate]
  );

  return {
    ...digest,
    items: items.rows.map((row) => ({
      position: row.position,
      post: {
        id: row.id,
        source_id: row.source_id,
        instagram_post_id: row.instagram_post_id,
        caption: row.caption,
        posted_at: row.posted_at,
        discovered_at: row.discovered_at,
        post_type: row.post_type,
        carousel_size: row.carousel_size,
        permalink: row.permalink,
        checksum: row.checksum,
        source_username: row.source_username,
        media_assets: row.media_assets
      }
    }))
  };
}

export async function listPostsForDate(digestDate: string) {
  const result = await pool.query<
    PostRecord & {
      source_username: string;
      media_assets: MediaAsset[];
    }
  >(
    `
      SELECT
        p.*,
        s.instagram_username AS source_username,
        COALESCE(
          (
            SELECT json_agg(ma ORDER BY ma.created_at ASC)
            FROM media_assets ma
            WHERE ma.post_id = p.id
          ),
          '[]'::json
        ) AS media_assets
      FROM posts p
      JOIN sources s ON s.id = p.source_id
      WHERE DATE(COALESCE(p.posted_at, p.discovered_at) AT TIME ZONE $2) = $1::date
      ORDER BY COALESCE(p.posted_at, p.discovered_at) DESC, s.instagram_username ASC
    `,
    [digestDate, env.DIGEST_TIMEZONE]
  );
  return result.rows;
}
