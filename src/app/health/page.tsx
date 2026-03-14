import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOperator } from "@/lib/auth";
import { getCollectorSession } from "@/lib/collector-session";
import { sendDigestForDate } from "@/lib/digests";
import { collectLatestPosts, discoverFollowedAccounts } from "@/lib/instagram";
import { pool } from "@/lib/db";
import { ActionNotice } from "@/components/action-notice";
import { SubmitButton } from "@/components/submit-button";
import { encodeActionMessage, extractErrorMessage } from "@/lib/action-state";

export default async function HealthPage({
  searchParams
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  await requireOperator();
  const [session, audits, params] = await Promise.all([
    getCollectorSession(),
    pool.query<{ event_type: string; level: string; message: string; created_at: Date }>(
      `
        SELECT event_type, level, message, created_at
        FROM audit_events
        ORDER BY created_at DESC
        LIMIT 25
      `
    ),
    searchParams
  ]);

  async function runCollection() {
    "use server";
    await requireOperator();
    try {
      const results = await collectLatestPosts();
      revalidatePath("/health");
      revalidatePath("/");
      redirect(`/health?success=${encodeActionMessage(`Collection finished for ${results.length} sources`)}`);
    } catch (error) {
      redirect(`/health?error=${encodeActionMessage(extractErrorMessage(error))}`);
    }
  }

  async function runDiscovery() {
    "use server";
    await requireOperator();
    try {
      const discovered = await discoverFollowedAccounts();
      revalidatePath("/health");
      revalidatePath("/sources");
      redirect(`/health?success=${encodeActionMessage(`Discovered ${discovered.length} accounts`)}`);
    } catch (error) {
      redirect(`/health?error=${encodeActionMessage(extractErrorMessage(error))}`);
    }
  }

  async function runDigest() {
    "use server";
    await requireOperator();
    try {
      const result = await sendDigestForDate();
      revalidatePath("/health");
      revalidatePath("/digests");
      redirect(`/health?success=${encodeActionMessage(`Digest run complete for ${result.digestDate}`)}`);
    } catch (error) {
      redirect(`/health?error=${encodeActionMessage(extractErrorMessage(error))}`);
    }
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
          {params?.success ? <ActionNotice kind="success" message={params.success} /> : null}
          {params?.error ? <ActionNotice kind="error" message={params.error} /> : null}
          <span className="muted">Session state</span>
          <strong>{session?.last_login_at ? "Ready" : "Missing"}</strong>
          <span className="muted">{session?.challenge_state ?? "No challenge"}</span>
        </section>
        <section className="panel stack">
          <span className="muted">Manual actions</span>
          <div className="row">
            <form action={runDiscovery}>
              <SubmitButton className="button subtle" pendingLabel="Discovering...">
                Discover
              </SubmitButton>
            </form>
            <form action={runCollection}>
              <SubmitButton className="button primary" pendingLabel="Collecting...">
                Collect now
              </SubmitButton>
            </form>
            <form action={runDigest}>
              <SubmitButton className="button subtle" pendingLabel="Sending digest...">
                Send digest
              </SubmitButton>
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
