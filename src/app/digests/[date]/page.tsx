import Link from "next/link";

import { requireOperator } from "@/lib/auth";
import { filterDigestItemsBySource } from "@/lib/policies";
import { getDigestDetail } from "@/lib/posts";

export default async function DigestDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ date: string }>;
  searchParams?: Promise<{ source?: string }>;
}) {
  await requireOperator();
  const [{ date }, resolvedSearch] = await Promise.all([params, searchParams]);
  const digest = await getDigestDetail(date);

  if (!digest) {
    return (
      <main className="shell">
        <div className="panel empty">Digest not found.</div>
      </main>
    );
  }

  const items = filterDigestItemsBySource(digest.items, resolvedSearch?.source);
  const sources = Array.from(new Set(digest.items.map((item) => item.post.source_username))).sort();

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <p className="muted">Digest detail</p>
          <h1>{digest.digest_date}</h1>
        </div>
        <Link className="button subtle" href="/digests">
          Back to digests
        </Link>
      </div>

      <div className="panel stack">
        <span className="badge">{digest.post_count} posts</span>
        <div className="row">
          <Link className="button subtle" href={`/digests/${date}`}>
            All sources
          </Link>
          {sources.map((source) => (
            <Link key={source} className="button subtle" href={`/digests/${date}?source=${source}`}>
              @{source}
            </Link>
          ))}
        </div>
        <div className="post-grid">
          {items.map(({ position, post }) => (
            <article key={post.id} className="post-card stack">
              {post.media_assets[0]?.local_path ? (
                <img src={`/media/${encodeURIComponent(post.media_assets[0].local_path)}`} alt="" />
              ) : null}
              <div className="stack">
                <strong>
                  {position + 1}. @{post.source_username}
                </strong>
                <span className="muted">{post.posted_at ? new Date(post.posted_at).toLocaleString() : "Unknown date"}</span>
                <p>{post.caption ?? "No caption"}</p>
                <a href={post.permalink} target="_blank">
                  Open on Instagram
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
