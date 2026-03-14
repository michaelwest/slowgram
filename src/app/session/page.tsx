import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOperator } from "@/lib/auth";
import { getCollectorSession, importStorageState } from "@/lib/collector-session";
import { bootstrapInstagramSession } from "@/lib/instagram";
import { ActionNotice } from "@/components/action-notice";
import { SubmitButton } from "@/components/submit-button";
import { encodeActionMessage, extractErrorMessage } from "@/lib/action-state";

export default async function SessionPage({
  searchParams
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  await requireOperator();
  const [session, params] = await Promise.all([getCollectorSession(), searchParams]);

  async function importState(formData: FormData) {
    "use server";
    await requireOperator();
    try {
      const raw = String(formData.get("storageState") ?? "");
      await importStorageState(raw);
      revalidatePath("/session");
      revalidatePath("/");
      redirect("/session?success=Storage%20state%20imported");
    } catch (error) {
      redirect(`/session?error=${encodeActionMessage(extractErrorMessage(error))}`);
    }
  }

  async function refreshHeadless() {
    "use server";
    await requireOperator();
    try {
      await bootstrapInstagramSession({ headed: false });
      revalidatePath("/session");
      revalidatePath("/");
      redirect("/session?success=Instagram%20session%20refreshed");
    } catch (error) {
      redirect(`/session?error=${encodeActionMessage(extractErrorMessage(error))}`);
    }
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <p className="muted">Collector session</p>
          <h1>Instagram login state</h1>
        </div>
        <Link className="button subtle" href="/">
          Dashboard
        </Link>
      </div>

      <div className="grid cols-2">
        <section className="panel stack">
          {params?.success ? <ActionNotice kind="success" message={params.success} /> : null}
          {params?.error ? <ActionNotice kind="error" message={params.error} /> : null}
          <h2 style={{ margin: 0 }}>Current status</h2>
          <span className="badge">{session?.last_login_at ? "Session available" : "No session"}</span>
          <p className="muted">Last login: {session?.last_login_at ? new Date(session.last_login_at).toLocaleString() : "Never"}</p>
          <p className="muted">Challenge state: {session?.challenge_state ?? "None"}</p>
          <p className="muted">Last error: {session?.last_error ?? "None"}</p>
          <form action={refreshHeadless}>
            <SubmitButton className="button primary" pendingLabel="Refreshing session...">
              Refresh using env credentials
            </SubmitButton>
          </form>
        </section>

        <section className="panel stack">
          <h2 style={{ margin: 0 }}>Import storage state</h2>
          <p className="muted">
            Paste a Playwright `storageState` JSON file generated locally with `npm run worker -- login --headed`.
          </p>
          <form action={importState} className="stack">
            <label className="field">
              <span>Storage state JSON</span>
              <textarea name="storageState" rows={14} required />
            </label>
            <SubmitButton className="button subtle" pendingLabel="Importing state...">
              Import state
            </SubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}
