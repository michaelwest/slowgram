import { redirect } from "next/navigation";

import { requestMagicLink } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ sent?: string; error?: string }>;
}) {
  async function submit(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    try {
      await requestMagicLink(email);
      redirect("/login?sent=1");
    } catch {
      redirect("/login?error=magic-link-failed");
    }
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
            <span>Email address</span>
            <input name="email" type="email" required />
          </label>
          <button className="button primary" type="submit">
            Send magic link
          </button>
        </form>
        {resolvedParams?.sent ? <p className="muted">Check your inbox for the sign-in link.</p> : null}
        {resolvedParams?.error ? (
          <p className="muted">
            Magic link delivery failed. Check that migrations have run and that Resend is configured correctly.
          </p>
        ) : null}
      </div>
    </main>
  );
}
