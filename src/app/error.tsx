"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="shell" style={{ maxWidth: 760 }}>
          <div className="panel stack">
            <div className="brand">
              <p className="muted">Application error</p>
              <h1>Something failed</h1>
            </div>
            <p className="notice error">{error.message || "Unexpected error"}</p>
            <div className="row">
              <button className="button primary" onClick={reset}>
                Try again
              </button>
              <a className="button subtle" href="/health">
                Open health page
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
