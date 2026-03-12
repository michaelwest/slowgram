import { redirect } from "next/navigation";

import { requestMagicLink } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ sent?: string }>;
}) {
  async function submit(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    await requestMagicLink(email);
    redirect("/login?sent=1");
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
      </div>
    </main>
  );
}
