import Link from "next/link";
import type { ReactNode } from "react";
export default function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="document-header wrap">
        <Link className="brand" href="/">
          chargeneighbour.
        </Link>
        <nav aria-label="Information pages">
          <Link href="/hosts">Host chargers</Link>
          <Link href="/support">Support</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </header>
      <main className="document-shell">
        <p className="eyebrow">CHARGENEIGHBOUR · PILOT</p>
        <h1>{title}</h1>
        {children}
      </main>
      <footer className="document-footer">
        <Link href="/">Back to ChargeNeighbour</Link> ·{" "}
        <Link href="/support">Contact & data requests</Link> ·{" "}
        <Link href="/features">Features & safeguards</Link> ·{" "}
        <Link href="/status">Service status</Link>
      </footer>
    </>
  );
}
