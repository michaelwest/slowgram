import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOperator } from "@/lib/auth";
import { discoverFollowedAccounts } from "@/lib/instagram";
import { listSources, updateSourceFlags, upsertSource } from "@/lib/sources";
import { ActionNotice } from "@/components/action-notice";
import { SubmitButton } from "@/components/submit-button";
import { encodeActionMessage, extractErrorMessage } from "@/lib/action-state";

export default async function SourcesPage({
  searchParams
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  await requireOperator();
  const [sources, params] = await Promise.all([listSources(), searchParams]);

  async function addSource(formData: FormData) {
    "use server";
    await requireOperator();
    let message = "Source added";
    try {
      const username = String(formData.get("username") ?? "");
      await upsertSource(username);
      revalidatePath("/sources");
      message = `Added @${username.replace(/^@/, "")}`;
    } catch (error) {
      redirect(`/sources?error=${encodeActionMessage(extractErrorMessage(error))}`);
    }
    redirect(`/sources?success=${encodeActionMessage(message)}`);
  }

  async function toggleSource(formData: FormData) {
    "use server";
    await requireOperator();
    const id = String(formData.get("id") ?? "");
    const nextEnabled = String(formData.get("nextEnabled")) === "true";
    const nextExcluded = String(formData.get("nextExcluded")) === "true";
    try {
      await updateSourceFlags(id, {
        is_enabled: nextEnabled,
        is_excluded: nextExcluded
      });
      revalidatePath("/sources");
    } catch (error) {
      redirect(`/sources?error=${encodeActionMessage(extractErrorMessage(error))}`);
    }
    redirect("/sources?success=Source%20updated");
  }

  async function discover() {
    "use server";
    await requireOperator();
    let message = "Discovery complete";
    try {
      const discovered = await discoverFollowedAccounts();
      revalidatePath("/sources");
      message = `Discovered ${discovered.length} accounts`;
    } catch (error) {
      redirect(`/sources?error=${encodeActionMessage(extractErrorMessage(error))}`);
    }
    redirect(`/sources?success=${encodeActionMessage(message)}`);
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <p className="muted">Source admin</p>
          <h1>Tracked profiles</h1>
        </div>
        <Link className="button subtle" href="/">
          Dashboard
        </Link>
      </div>

      <div className="grid cols-2">
        <section className="panel stack">
          {params?.success ? <ActionNotice kind="success" message={params.success} /> : null}
          {params?.error ? <ActionNotice kind="error" message={params.error} /> : null}
          <h2 style={{ margin: 0 }}>Add a profile</h2>
          <form action={addSource} className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>Instagram username</span>
              <input name="username" placeholder="example_handle" required />
            </label>
            <SubmitButton className="button primary" pendingLabel="Adding...">
              Add source
            </SubmitButton>
          </form>
        </section>

        <section className="panel stack">
          <h2 style={{ margin: 0 }}>Auto-discovery</h2>
          <p className="muted">Pull your current followed accounts into the source list, then enable or exclude them.</p>
          <form action={discover}>
            <SubmitButton className="button subtle" pendingLabel="Discovering...">
              Discover followed accounts
            </SubmitButton>
          </form>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 20 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Status</th>
              <th>Mode</th>
              <th>Last success</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id}>
                <td>
                  <strong>@{source.instagram_username}</strong>
                </td>
                <td>{source.status}</td>
                <td>{source.is_excluded ? "Excluded" : source.is_enabled ? "Enabled" : "Disabled"}</td>
                <td>{source.last_success_at ? new Date(source.last_success_at).toLocaleString() : "Never"}</td>
                <td>
                  <div className="row">
                    <form action={toggleSource}>
                      <input type="hidden" name="id" value={source.id} />
                      <input type="hidden" name="nextEnabled" value={String(!source.is_enabled)} />
                      <input type="hidden" name="nextExcluded" value={String(source.is_excluded)} />
                      <SubmitButton className="button subtle" pendingLabel="Updating...">
                        {source.is_enabled ? "Disable" : "Enable"}
                      </SubmitButton>
                    </form>
                    <form action={toggleSource}>
                      <input type="hidden" name="id" value={source.id} />
                      <input type="hidden" name="nextEnabled" value={String(source.is_enabled)} />
                      <input type="hidden" name="nextExcluded" value={String(!source.is_excluded)} />
                      <SubmitButton className="button subtle" pendingLabel="Updating...">
                        {source.is_excluded ? "Include" : "Exclude"}
                      </SubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sources.length === 0 ? <div className="empty">No sources yet.</div> : null}
      </section>
    </main>
  );
}
