"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="document-shell">
      <h1>Let’s try that again.</h1>
      <p>
        This page is temporarily unavailable. Your visit has not confirmed a
        reservation or charge.
      </p>
      <button className="button dark" onClick={reset}>
        Try again
      </button>{" "}
      <a href="/support">Contact support</a>
    </main>
  );
}
