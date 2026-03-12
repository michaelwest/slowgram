import Link from "next/link";
import { revalidatePath } from "next/cache";

import { requireOperator } from "@/lib/auth";
import { discoverFollowedAccounts } from "@/lib/instagram";
import { listSources, updateSourceFlags, upsertSource } from "@/lib/sources";

export default async function SourcesPage() {
  await requireOperator();
  const sources = await listSources();

  async function addSource(formData: FormData) {
    "use server";
    await requireOperator();
    await upsertSource(String(formData.get("username") ?? ""));
    revalidatePath("/sources");
  }

  async function toggleSource(formData: FormData) {
    "use server";
    await requireOperator();
    const id = String(formData.get("id") ?? "");
    const nextEnabled = String(formData.get("nextEnabled")) === "true";
    const nextExcluded = String(formData.get("nextExcluded")) === "true";
    await updateSourceFlags(id, {
      is_enabled: nextEnabled,
      is_excluded: nextExcluded
    });
    revalidatePath("/sources");
  }

  async function discover() {
    "use server";
    await requireOperator();
    await discoverFollowedAccounts();
    revalidatePath("/sources");
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
          <h2 style={{ margin: 0 }}>Add a profile</h2>
          <form action={addSource} className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>Instagram username</span>
              <input name="username" placeholder="example_handle" required />
            </label>
            <button className="button primary" type="submit">
              Add source
            </button>
          </form>
        </section>

        <section className="panel stack">
          <h2 style={{ margin: 0 }}>Auto-discovery</h2>
          <p className="muted">Pull your current followed accounts into the source list, then enable or exclude them.</p>
          <form action={discover}>
            <button className="button subtle" type="submit">
              Discover followed accounts
            </button>
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
                      <button className="button subtle" type="submit">
                        {source.is_enabled ? "Disable" : "Enable"}
                      </button>
                    </form>
                    <form action={toggleSource}>
                      <input type="hidden" name="id" value={source.id} />
                      <input type="hidden" name="nextEnabled" value={String(source.is_enabled)} />
                      <input type="hidden" name="nextExcluded" value={String(!source.is_excluded)} />
                      <button className="button subtle" type="submit">
                        {source.is_excluded ? "Include" : "Exclude"}
                      </button>
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
