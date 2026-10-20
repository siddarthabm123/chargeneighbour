"use client";
import { useEffect, useState, type FormEvent } from "react";
type Ticket = {
  id: string;
  subject: string;
  message: string;
  reply?: string;
  status: string;
};
export default function SupportForm() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState(""),
    [ticket, setTicket] = useState<Ticket | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("ticket"),
      token = location.hash.slice(1);
    if (!id || !token) return;
    setBusy(true);
    fetch(`/api/support?id=${encodeURIComponent(id)}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        setTicket(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          subject: form.get("subject"),
          message: form.get("message"),
          category: form.get("category"),
          website: form.get("website"),
          consent: form.get("consent") === "on",
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setReceipt(`${location.origin}/support?ticket=${data.id}#${data.token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your request.");
    } finally {
      setBusy(false);
    }
  }
  if (ticket)
    return (
      <section className="notice-card">
        <span className="pill">{ticket.status}</span>
        <h2>{ticket.subject}</h2>
        <p className="preserve-lines">{ticket.message}</p>
        <h3>Operator response</h3>
        <p className="preserve-lines">
          {ticket.reply ||
            "No response yet. Keep this private link and check again later. Response times are not guaranteed during the pilot."}
        </p>
        <a href="/support">Create another request</a>
      </section>
    );
  if (receipt)
    return (
      <section className="notice-card" role="status">
        <h2>Your request is saved.</h2>
        <p>
          Save this private link to check the operator’s response. Anyone with
          it can read this ticket. An email is not automatically sent.
        </p>
        <a className="private-receipt" href={receipt}>
          {receipt}
        </a>
        <p>Do not share the link publicly.</p>
      </section>
    );
  return (
    <form onSubmit={submit} className="support-form">
      <label>
        Email for follow-up
        <input name="email" type="email" required maxLength={254} />
      </label>
      <label>
        What do you need?
        <select name="category">
          <option value="help">Product or pilot question</option>
          <option value="privacy">Privacy / data deletion request</option>
          <option value="incident">
            Report an access or equipment concern
          </option>
        </select>
      </label>
      <label>
        Subject
        <input name="subject" required minLength={3} maxLength={120} />
      </label>
      <label>
        Message
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={3000}
          rows={6}
        />
      </label>
      <label className="honeypot" aria-hidden="true">
        Leave empty
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="checkbox-label">
        <input name="consent" type="checkbox" required />I agree that
        ChargeNeighbour can store these details to handle this request. I will
        not include passwords, card data or identity documents.
      </label>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <button className="button dark" disabled={busy}>
        {busy ? "Saving…" : "Send request"}
      </button>
    </form>
  );
}
