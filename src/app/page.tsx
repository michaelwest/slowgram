import Link from "next/link";

import { requireOperator } from "@/lib/auth";
import { getCollectorSession } from "@/lib/collector-session";
import { pool } from "@/lib/db";
import { listDigests } from "@/lib/posts";
import { listSources } from "@/lib/sources";

async function getStats() {
  const [sources, digests, audit] = await Promise.all([
    listSources(),
    listDigests(),
    pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM posts"),
  ]);

  return {
    sourceCount: sources.length,
    enabledSourceCount: sources.filter((item) => item.is_enabled && !item.is_excluded).length,
    digestCount: digests.length,
    postCount: Number(audit.rows[0]?.count ?? 0)
  };
}

export default async function HomePage() {
  await requireOperator();
  const [stats, session, digests] = await Promise.all([getStats(), getCollectorSession(), listDigests()]);

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <p className="muted">Private digest</p>
          <h1>Slowgram</h1>
        </div>
        <div className="row">
          <Link className="button subtle" href="/sources">
            Sources
          </Link>
          <Link className="button subtle" href="/health">
            Health
          </Link>
          <Link className="button primary" href="/digests">
            View digests
          </Link>
        </div>
      </div>

      <section className="grid cols-3">
        <div className="panel stack">
          <span className="muted">Enabled sources</span>
          <strong>{stats.enabledSourceCount}</strong>
          <span className="muted">{stats.sourceCount} total tracked profiles</span>
        </div>
        <div className="panel stack">
          <span className="muted">Captured posts</span>
          <strong>{stats.postCount}</strong>
          <span className="muted">{stats.digestCount} generated digests</span>
        </div>
        <div className="panel stack">
          <span className="muted">Instagram session</span>
          <strong>{session?.last_login_at ? "Ready" : "Missing"}</strong>
          <span className="muted">{session?.challenge_state ?? "No active challenge"}</span>
        </div>
      </section>

      <section className="grid cols-2" style={{ marginTop: 20 }}>
        <div className="panel stack">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>Latest digests</h2>
            <Link href="/digests" className="button subtle">
              Open all
            </Link>
          </div>
          <div className="list">
            {digests.slice(0, 4).map((digest) => (
              <Link key={digest.id} href={`/digests/${digest.digest_date}`} className="card-link">
                {digest.cover_path ? (
                  <img src={`/media/${encodeURIComponent(digest.cover_path)}`} alt="" />
                ) : null}
                <div className="card-body">
                  <strong>{digest.digest_date}</strong>
                  <p className="muted">{digest.post_count} posts</p>
                </div>
              </Link>
            ))}
            {digests.length === 0 ? <div className="empty">No digests yet.</div> : null}
          </div>
        </div>

        <div className="panel stack">
          <h2 style={{ margin: 0 }}>Operator actions</h2>
          <div className="row">
            <Link className="button primary" href="/session">
              Manage login session
            </Link>
            <Link className="button subtle" href="/sources">
              Manage sources
            </Link>
          </div>
          <p className="muted">
            Use the session page to import or refresh Playwright storage state, then run collection and digest jobs
            from the health view.
          </p>
        </div>
      </section>
    </main>
  );
}
