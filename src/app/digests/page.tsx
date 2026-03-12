import Link from "next/link";
import { cookies } from "next/headers";

import { requireOperator } from "@/lib/auth";
import { listDigests } from "@/lib/posts";
import { shouldIncludeDigest } from "@/lib/policies";

export default async function DigestsPage({
  searchParams
}: {
  searchParams?: Promise<{ date?: string; unseen?: string }>;
}) {
  await requireOperator();
  const [digests, cookieStore, params] = await Promise.all([listDigests(), cookies(), searchParams]);
  const lastVisitValue = cookieStore.get("slowgram_last_digest_visit")?.value;
  const lastVisitAt = lastVisitValue ? new Date(lastVisitValue) : null;
  const filtered = digests.filter((digest) =>
    shouldIncludeDigest({
      digestDate: digest.digest_date,
      queryDate: params?.date,
      unseenOnly: params?.unseen === "1",
      generatedAt: digest.generated_at,
      lastVisitAt
    })
  );

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <p className="muted">Digest archive</p>
          <h1>Daily digests</h1>
        </div>
        <Link className="button subtle" href="/">
          Dashboard
        </Link>
      </div>

      <div className="panel row" style={{ marginBottom: 20 }}>
        <Link className="button subtle" href="/digests">
          All
        </Link>
        <Link className="button subtle" href="/digests?unseen=1">
          New since last visit
        </Link>
      </div>

      <div className="post-grid">
        {filtered.map((digest) => (
          <Link key={digest.id} className="card-link" href={`/digests/${digest.digest_date}`}>
            {digest.cover_path ? <img src={`/media/${encodeURIComponent(digest.cover_path)}`} alt="" /> : null}
            <div className="card-body">
              <strong>{digest.digest_date}</strong>
              <p className="muted">{digest.post_count} posts</p>
              <span className="badge">{digest.status}</span>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 ? <div className="empty">No digests match the current filters.</div> : null}
    </main>
  );
}
