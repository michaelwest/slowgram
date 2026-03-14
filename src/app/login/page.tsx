import { redirect } from "next/navigation";

import { loginWithPassword } from "@/lib/auth";
import { ActionNotice } from "@/components/action-notice";
import { SubmitButton } from "@/components/submit-button";

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
          <SubmitButton className="button primary" pendingLabel="Signing in...">
            Sign in
          </SubmitButton>
        </form>
        {resolvedParams?.error ? <ActionNotice kind="error" message="Incorrect password." /> : null}
      </div>
    </main>
  );
}
