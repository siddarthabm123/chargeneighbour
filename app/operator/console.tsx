"use client";
import { useEffect, useState, type FormEvent } from "react";
import EvidenceReview from "./evidence";
import {
  istToIso,
  localTime,
  rupees,
  type HostCharger,
  type Reservation,
} from "../lib/reservations";
type Application = {
  id: string;
  kind: string;
  email: string;
  status: string;
  payload: Record<string, string>;
  operator_reply?: string;
};
type Ticket = {
  id: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  reply?: string;
  status: string;
};
type Ledger = {
  booking_id: string;
  gross_paise: number;
  commission_paise: number;
  host_paise: number;
  settlement_status: string;
  settlement_reference?: string;
};
type Data = {
  applications: Application[];
  chargers: HostCharger[];
  bookings: Reservation[];
  tickets: Ticket[];
  metrics: { day: string; event: string; source: string; count: number }[];
  ledger: Ledger[];
  events: {
    id: string;
    action: string;
    reference_id?: string;
    created_at: string;
  }[];
  configuration: Record<string, boolean>;
};
type Queue =
  "applications" | "chargers" | "bookings" | "tickets" | "ledger" | "events";
export default function OperatorConsole() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [pages, setPages] = useState<Record<string, number>>({}),
    [hasMore, setHasMore] = useState<Record<string, boolean>>({});
  async function load() {
    setBusy(true);
    try {
      const r = await fetch("/api/operator", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      setPages({});
      setHasMore({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load operations.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function older(resource: Queue) {
    setBusy(true);
    setError("");
    try {
      const page = (pages[resource] || 0) + 1;
      const r = await fetch(`/api/operator?resource=${resource}&page=${page}`, {
        cache: "no-store",
      });
      const body = await r.json();
      if (!r.ok) throw Error(body.error);
      setData((previous) =>
        previous
          ? {
              ...previous,
              [resource]: Array.from(
                new Map(
                  [...previous[resource], ...body.rows].map((row) => [
                    row.id || row.booking_id,
                    row,
                  ]),
                ).values(),
              ),
            }
          : previous,
      );
      setPages((previous) => ({ ...previous, [resource]: page }));
      setHasMore((previous) => ({ ...previous, [resource]: body.hasMore }));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load older records.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function backup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    if (f.get("passphrase") !== f.get("confirm")) {
      setError("The backup passphrases do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/operator/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase: f.get("passphrase") }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw Error(d.error);
      }
      const url = URL.createObjectURL(await r.blob()),
        a = document.createElement("a");
      a.href = url;
      a.download = `chargeneighbour-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      form.reset();
      setMessage(
        "Encrypted application-data backup downloaded. Keep your passphrase separately.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export backup.");
    } finally {
      setBusy(false);
    }
  }
  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage("Saved to the operations record.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  function reply(e: FormEvent<HTMLFormElement>, id: string, type: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void act({ action: "reply", id, type, reply: f.get("reply") });
  }
  function onboard(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const checks = Object.fromEntries(
      [
        "identity",
        "permission",
        "electrical",
        "metering",
        "access",
        "support",
      ].map((k) => [k, f.get(k) === "on"]),
    );
    void act({
      action: "onboard",
      applicationId: f.get("applicationId"),
      name: f.get("name"),
      area: f.get("area"),
      address: f.get("address"),
      latitude: Number(f.get("latitude")),
      longitude: Number(f.get("longitude")),
      power: Number(f.get("power")),
      pricePaise: Math.round(Number(f.get("price")) * 100),
      access: f.get("access"),
      photos: String(f.get("photos"))
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean),
      checks,
      evidence: f.get("evidence"),
    });
  }
  function slot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      void act({
        action: "slot",
        chargerId: f.get("chargerId"),
        start: istToIso(f.get("start")),
        end: istToIso(f.get("end")),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid interval.");
    }
  }
  return (
    <>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice-card">
          {message}
        </p>
      )}
      <button
        className="button outline"
        disabled={busy}
        onClick={() => void load()}
      >
        {busy ? "Working…" : "Refresh operations"}
      </button>
      {data && (
        <>
          <h2>Activation checks</h2>
          <dl className="status-list">
            {Object.entries(data.configuration).map(([key, ready]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{ready ? "Configured" : "Pending"}</dd>
              </div>
            ))}
          </dl>
          <p>
            Configuration does not establish merchant approval, host safety,
            deliverability or legal readiness. Complete the acceptance checks in
            the repository runbook before enabling commercial launch.
          </p>
          <h2>Applications & account requests</h2>
          <p>
            Latest 50 records; withdrawn records must not be contacted for pilot
            recruitment.
          </p>
          {data.applications.map((a) => (
            <details className="notice-card" key={a.id}>
              <summary>
                {a.kind} ·{" "}
                {a.payload.name || a.payload.area || a.payload.subject} ·{" "}
                {a.status}
              </summary>
              <p>
                {a.email} · ID {a.id}
              </p>
              <dl>
                {Object.entries(a.payload).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
              {a.operator_reply && <p>Previous response: {a.operator_reply}</p>}
              {a.kind === "host" && a.payload.evidenceId && (
                <EvidenceReview id={a.payload.evidenceId} />
              )}
              <form
                className="support-form"
                onSubmit={(e) => reply(e, a.id, "application")}
              >
                <label>
                  Private account response
                  <textarea
                    name="reply"
                    required
                    minLength={2}
                    maxLength={4000}
                  />
                </label>
                <button className="button dark" disabled={busy}>
                  Save response
                </button>
              </form>
            </details>
          ))}
          <details className="notice-card">
            <summary>Publish a verified host charger</summary>
            <form onSubmit={onboard} className="support-form">
              <label>
                Active host application
                <select name="applicationId" required>
                  <option value="">Choose reviewed application</option>
                  {data.applications
                    .filter(
                      (a) => a.kind === "host" && a.status === "pending_review",
                    )
                    .map((a) => (
                      <option value={a.id} key={a.id}>
                        {a.payload.name} · {a.payload.area}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Public listing name
                <input name="name" required minLength={2} maxLength={100} />
              </label>
              <label>
                Public neighbourhood / city
                <input name="area" required minLength={2} maxLength={120} />
              </label>
              <label>
                Private exact address
                <textarea
                  name="address"
                  required
                  minLength={10}
                  maxLength={1000}
                />
              </label>
              <div className="form-grid">
                <label>
                  Exact latitude
                  <input
                    name="latitude"
                    type="number"
                    min={-90}
                    max={90}
                    step="any"
                    required
                  />
                </label>
                <label>
                  Exact longitude
                  <input
                    name="longitude"
                    type="number"
                    min={-180}
                    max={180}
                    step="any"
                    required
                  />
                </label>
                <label>
                  Type 2 power (kW)
                  <select name="power">
                    {[3.3, 7.2, 11, 22].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label>
                  All-in energy rate (₹/kWh)
                  <input
                    name="price"
                    type="number"
                    min={1}
                    max={100}
                    step="0.01"
                    required
                  />
                </label>
              </div>
              <label>
                Public access restrictions and instructions
                <textarea
                  name="access"
                  required
                  minLength={10}
                  maxLength={2000}
                />
              </label>
              <label>
                Approved host photo URLs (one HTTPS URL per line, 1–6)
                <textarea name="photos" required rows={3} />
              </label>
              {[
                "identity",
                "permission",
                "electrical",
                "metering",
                "access",
                "support",
              ].map((k) => (
                <label className="checkbox-label" key={k}>
                  <input type="checkbox" name={k} required />
                  Actual {k} review completed and evidence available
                </label>
              ))}
              <label>
                Review evidence references (no passwords or document images)
                <textarea
                  name="evidence"
                  required
                  minLength={20}
                  maxLength={2000}
                />
              </label>
              <button className="button dark" disabled={busy}>
                Publish reviewed host
              </button>
            </form>
          </details>
          <h2>Host inventory & schedules</h2>
          {data.chargers.map((c) => (
            <article className="notice-card" key={c.id}>
              <h3>
                {c.name} · {c.status}
              </h3>
              <p>
                {c.area} · {c.power_kw} kW · {rupees(c.price_paise_kwh)}/kWh
              </p>
              {c.status === "approved" && (
                <button
                  className="button outline"
                  disabled={busy}
                  onClick={() => void act({ action: "pause", id: c.id })}
                >
                  Pause new reservations
                </button>
              )}
            </article>
          ))}
          <form onSubmit={slot} className="support-form notice-card">
            <h3>Add offered host hours</h3>
            <label>
              Approved charger
              <select name="chargerId" required>
                <option value="">Choose host</option>
                {data.chargers
                  .filter((c) => c.status === "approved")
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Start (IST)
              <input type="datetime-local" name="start" required />
            </label>
            <label>
              End (IST, up to 12 hours)
              <input type="datetime-local" name="end" required />
            </label>
            <button className="button dark" disabled={busy}>
              Save offered hours
            </button>
          </form>
          <h2>Reservations & measured sessions</h2>
          {data.bookings.map((b) => (
            <article className="notice-card" key={b.id}>
              <h3>{b.id}</h3>
              <p>
                {localTime(b.starts_at)} IST · {b.status} · payment{" "}
                {b.payment_status}
              </p>
              <p>
                {b.energy_kwh ?? "Unmeasured"} kWh ·{" "}
                {b.amount_paise != null
                  ? rupees(b.amount_paise)
                  : "No final bill"}
              </p>
              <form
                className="support-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void act({
                    action: "session",
                    id: b.id,
                    transition: f.get("transition"),
                    meter:
                      f.get("meter") === "" ? null : Number(f.get("meter")),
                    note: f.get("note"),
                  });
                }}
              >
                <label>
                  Transition
                  <select name="transition">
                    <option value="confirm">Confirm requested time</option>
                    <option value="start">Start with meter reading</option>
                    <option value="finish">Finish with meter reading</option>
                    <option value="cancel">Cancel unstarted session</option>
                  </select>
                </label>
                <label>
                  Actual cumulative meter reading (kWh)
                  <input name="meter" type="number" min={0} step="0.001" />
                </label>
                <label>
                  Evidence / incident reference
                  <input name="note" required minLength={3} maxLength={1000} />
                </label>
                <button className="button dark" disabled={busy}>
                  Record session action
                </button>
              </form>
              {b.payment_status === "refund_requested" && (
                <p>
                  Review the dispute and process any approved full refund in the
                  merchant dashboard. Only a verified refund webhook changes the
                  financial record.
                </p>
              )}
            </article>
          ))}
          <h2>Private support queue</h2>
          {data.tickets.map((t) => (
            <details className="notice-card" key={t.id}>
              <summary>
                {t.category} · {t.subject} · {t.status}
              </summary>
              <p>{t.email}</p>
              <p className="preserve-lines">{t.message}</p>
              {t.reply && <p>{t.reply}</p>}
              <form
                className="support-form"
                onSubmit={(e) => reply(e, t.id, "ticket")}
              >
                <label>
                  Response (visible through the private receipt link)
                  <textarea
                    name="reply"
                    required
                    minLength={2}
                    maxLength={4000}
                  />
                </label>
                <button className="button dark" disabled={busy}>
                  Save private reply
                </button>
              </form>
            </details>
          ))}
          <h2>Settlement ledger</h2>
          <p>
            These are amounts owed after captured payments, not completed bank
            payouts. Reconcile provider fees and applicable tax separately
            before settlement.
          </p>
          {data.ledger.map((l) => (
            <article className="notice-card" key={l.booking_id}>
              <p>
                Session {l.booking_id} · {l.settlement_status}
              </p>
              <p>
                Gross {rupees(l.gross_paise)} · platform{" "}
                {rupees(l.commission_paise)} · host {rupees(l.host_paise)}
              </p>
              {l.settlement_status === "pending" && (
                <form
                  className="support-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void act({
                      action: "settlement",
                      id: l.booking_id,
                      reference: f.get("reference"),
                    });
                  }}
                >
                  <label>
                    Actual completed payout reference
                    <input
                      name="reference"
                      required
                      minLength={5}
                      maxLength={200}
                    />
                  </label>
                  <button className="button outline" disabled={busy}>
                    Record completed external payout
                  </button>
                </form>
              )}
            </article>
          ))}
          <h2>Campaign counts</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Event</th>
                  <th>Source</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {data.metrics.map((m) => (
                  <tr key={`${m.day}-${m.event}-${m.source}`}>
                    <td>{m.day}</td>
                    <td>{m.event}</td>
                    <td>{m.source}</td>
                    <td>{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2>Recent operations</h2>
          <ul>
            {data.events.map((e) => (
              <li key={e.id}>
                {localTime(e.created_at)} · {e.action} · {e.reference_id}
              </li>
            ))}
          </ul>
          <div className="detail-actions">
            {(
              [
                "applications",
                "chargers",
                "bookings",
                "tickets",
                "ledger",
                "events",
              ] as Queue[]
            )
              .filter((q) => data[q].length >= 50 && hasMore[q] !== false)
              .map((q) => (
                <button
                  className="button outline"
                  key={q}
                  disabled={busy}
                  onClick={() => void older(q)}
                >
                  Load older {q}
                </button>
              ))}
          </div>
          <details className="notice-card">
            <summary>Encrypted application-data backup</summary>
            <p>
              Export a consistent pilot snapshot protected with your own
              passphrase. The passphrase is not stored. Keep it separately: a
              lost passphrase cannot recover this file. This export excludes
              Supabase Auth users/sessions, Storage objects and provider logs.
              Use managed provider backups for full disaster recovery.
            </p>
            <form className="support-form" onSubmit={(e) => void backup(e)}>
              <label>
                Backup passphrase (20–200 characters)
                <input
                  name="passphrase"
                  type="password"
                  autoComplete="new-password"
                  minLength={20}
                  maxLength={200}
                  required
                />
              </label>
              <label>
                Confirm passphrase
                <input
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={20}
                  maxLength={200}
                  required
                />
              </label>
              <button className="button dark" disabled={busy}>
                Download encrypted snapshot
              </button>
            </form>
          </details>
          <details className="notice-card">
            <summary>Retention maintenance</summary>
            <p>
              Removes expired quota records and records whose published
              retention period has elapsed. Open tickets and financial records
              are retained. Review the documented retention policy before
              running.
            </p>
            <button
              className="button outline"
              disabled={busy}
              onClick={() => void act({ action: "cleanup" })}
            >
              Run scheduled retention cleanup
            </button>
          </details>
        </>
      )}
    </>
  );
}
