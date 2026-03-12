import Link from "next/link";
import { revalidatePath } from "next/cache";

import { requireOperator } from "@/lib/auth";
import { getCollectorSession } from "@/lib/collector-session";
import { sendDigestForDate } from "@/lib/digests";
import { collectLatestPosts, discoverFollowedAccounts } from "@/lib/instagram";
import { pool } from "@/lib/db";

export default async function HealthPage() {
  await requireOperator();
  const [session, audits] = await Promise.all([
    getCollectorSession(),
    pool.query<{ event_type: string; level: string; message: string; created_at: Date }>(
      `
        SELECT event_type, level, message, created_at
        FROM audit_events
        ORDER BY created_at DESC
        LIMIT 25
      `
    )
  ]);

  async function runCollection() {
    "use server";
    await requireOperator();
    await collectLatestPosts();
    revalidatePath("/health");
    revalidatePath("/");
  }

  async function runDiscovery() {
    "use server";
    await requireOperator();
    await discoverFollowedAccounts();
    revalidatePath("/health");
    revalidatePath("/sources");
  }

  async function runDigest() {
    "use server";
    await requireOperator();
    await sendDigestForDate();
    revalidatePath("/health");
    revalidatePath("/digests");
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <p className="muted">Operations</p>
          <h1>Collection health</h1>
        </div>
        <Link className="button subtle" href="/">
          Dashboard
        </Link>
      </div>

      <div className="grid cols-3">
        <section className="panel stack">
          <span className="muted">Session state</span>
          <strong>{session?.last_login_at ? "Ready" : "Missing"}</strong>
          <span className="muted">{session?.challenge_state ?? "No challenge"}</span>
        </section>
        <section className="panel stack">
          <span className="muted">Manual actions</span>
          <div className="row">
            <form action={runDiscovery}>
              <button className="button subtle" type="submit">
                Discover
              </button>
            </form>
            <form action={runCollection}>
              <button className="button primary" type="submit">
                Collect now
              </button>
            </form>
            <form action={runDigest}>
              <button className="button subtle" type="submit">
                Send digest
              </button>
            </form>
          </div>
        </section>
        <section className="panel stack">
          <span className="muted">Last error</span>
          <strong>{session?.last_error ?? "None"}</strong>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>Recent events</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Level</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {audits.rows.map((event, index) => (
              <tr key={`${event.event_type}-${index}`}>
                <td>{new Date(event.created_at).toLocaleString()}</td>
                <td>{event.event_type}</td>
                <td>{event.level}</td>
                <td>{event.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
