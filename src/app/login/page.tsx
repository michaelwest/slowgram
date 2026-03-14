import { redirect } from "next/navigation";

import { loginWithPassword } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  async function submit(formData: FormData) {
    "use server";
    const password = String(formData.get("password") ?? "");
    const ok = await loginWithPassword(password);
    redirect(ok ? "/" : "/login?error=invalid-password");
  }

  const resolvedParams = await searchParams;
  return (
    <main className="shell" style={{ maxWidth: 560 }}>
      <div className="panel stack">
        <div className="brand">
          <p className="muted">Private operator login</p>
          <h1>Sign in to Slowgram</h1>
        </div>
        <form action={submit} className="stack">
          <label className="field">
            <span>Password</span>
            <input name="password" type="password" required />
          </label>
          <button className="button primary" type="submit">
            Sign in
          </button>
        </form>
        {resolvedParams?.error ? <p className="muted">Incorrect password.</p> : null}
      </div>
    </main>
  );
}
