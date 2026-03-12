import Link from "next/link";
import { revalidatePath } from "next/cache";

import { requireOperator } from "@/lib/auth";
import { getCollectorSession, importStorageState } from "@/lib/collector-session";
import { bootstrapInstagramSession } from "@/lib/instagram";

export default async function SessionPage() {
  await requireOperator();
  const session = await getCollectorSession();

  async function importState(formData: FormData) {
    "use server";
    await requireOperator();
    const raw = String(formData.get("storageState") ?? "");
    await importStorageState(raw);
    revalidatePath("/session");
    revalidatePath("/");
  }

  async function refreshHeadless() {
    "use server";
    await requireOperator();
    await bootstrapInstagramSession({ headed: false });
    revalidatePath("/session");
    revalidatePath("/");
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
          <h2 style={{ margin: 0 }}>Current status</h2>
          <span className="badge">{session?.last_login_at ? "Session available" : "No session"}</span>
          <p className="muted">Last login: {session?.last_login_at ? new Date(session.last_login_at).toLocaleString() : "Never"}</p>
          <p className="muted">Challenge state: {session?.challenge_state ?? "None"}</p>
          <p className="muted">Last error: {session?.last_error ?? "None"}</p>
          <form action={refreshHeadless}>
            <button className="button primary" type="submit">
              Refresh using env credentials
            </button>
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
            <button className="button subtle" type="submit">
              Import state
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
