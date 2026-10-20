"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  istToIso,
  localTime,
  rupees,
  type HostCharger,
  type Reservation,
} from "../lib/reservations";
type Slot = {
  id: string;
  charger_id: string;
  starts_at: string;
  ends_at: string;
};
type Location = { address: string; latitude: number; longitude: number };
type CheckoutOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  handler: () => void;
  modal: { ondismiss: () => void };
};
declare global {
  interface Window {
    Razorpay?: new (options: CheckoutOptions) => { open: () => void };
  }
}
export default function HostMarketplace({ signedIn }: { signedIn: boolean }) {
  const [chargers, setChargers] = useState<HostCharger[]>([]),
    [slots, setSlots] = useState<Slot[]>([]),
    [open, setOpen] = useState(false),
    [bookings, setBookings] = useState<Reservation[]>([]),
    [locations, setLocations] = useState<Record<string, Location>>({}),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const attempt = useRef({ payload: "", key: "" });
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/hosts", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setChargers(data.chargers);
      setSlots(data.slots);
      setOpen(data.reservationsOpen);
      if (signedIn) {
        const response = await fetch("/api/reservations", {
          cache: "no-store",
        });
        const saved = await response.json();
        if (!response.ok) throw Error(saved.error);
        setBookings(saved.bookings);
        setLocations(saved.locations);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load host chargers.",
      );
    } finally {
      setBusy(false);
    }
  }, [signedIn]);
  useEffect(() => {
    void load();
  }, [load]);
  async function reserve(e: FormEvent<HTMLFormElement>, chargerId: string) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      const body = {
        chargerId,
        start: istToIso(f.get("start")),
        end: istToIso(f.get("end")),
        acceptTerms: f.get("terms") === "on",
      };
      const payload = JSON.stringify(body);
      if (attempt.current.payload !== payload)
        attempt.current = { payload, key: crypto.randomUUID() };
      const r = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": attempt.current.key,
        },
        body: payload,
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setMessage(
        "Request saved. It is not confirmed yet. The operator must accept within 30 minutes.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  async function change(id: string, action: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setMessage(
        action === "refund_request"
          ? "Refund review requested. A request is not a processed refund."
          : "Reservation cancelled.",
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusy(false);
    }
  }
  async function pay(id: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      if (!window.Razorpay)
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () =>
            reject(Error("Could not load secure payment checkout."));
          document.head.appendChild(script);
        });
      if (!window.Razorpay) throw Error("Checkout is unavailable.");
      const checkout = new window.Razorpay({
        key: data.keyId,
        order_id: data.orderId,
        amount: data.amount,
        currency: "INR",
        name: "ChargeNeighbour",
        description: "Metered charging session",
        handler: () => {
          setMessage(
            "Payment submitted. Refresh your sessions to check server-verified payment status.",
          );
          void load();
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="notice-card">
        <strong>
          {open
            ? "Reservations are open for approved hosts."
            : "Host sharing is in preparation."}
        </strong>
        <p>
          {open
            ? "The all-in energy rate is fixed with your request. Billing uses the supervised meter readings after the session."
            : "Applications are open. Commercial bookings and payments remain closed until the pilot is operationally approved."}
        </p>
        <a href="/?action=host">Apply to become a founding host →</a>
      </div>
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
        {busy ? "Loading…" : "Refresh chargers & sessions"}
      </button>
      <div className="host-listings">
        {chargers.map((c) => (
          <article key={c.id} className="notice-card">
            <div className="host-photos">
              {c.photos.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={`${c.name}, host site photo ${i + 1}`}
                  loading="lazy"
                />
              ))}
            </div>
            <span className="pill">
              Participating host · reviewed{" "}
              {c.verified_at
                ? new Date(c.verified_at).toLocaleDateString("en-IN")
                : ""}
            </span>
            <h2>{c.name}</h2>
            <p>
              {c.area} · Type 2 AC · up to {c.power_kw} kW
            </p>
            <p>
              <strong>{rupees(c.price_paise_kwh)}/kWh</strong> · all-in energy
              rate
            </p>
            <p>{c.access_notes}</p>
            <p className="tiny">
              Approximate neighbourhood only. Exact residential details are
              shared with confirmed participants. Review does not guarantee
              availability or eliminate equipment risk.
            </p>
            <details>
              <summary>Offered hours (IST)</summary>
              <ul>
                {slots
                  .filter((s) => s.charger_id === c.id)
                  .slice(0, 12)
                  .map((s) => (
                    <li key={s.id}>
                      {localTime(s.starts_at)} → {localTime(s.ends_at)}
                    </li>
                  ))}
              </ul>
              <p>
                Other requests may use part of these hours. The server checks
                conflicts when you submit.
              </p>
            </details>
            {open &&
              (signedIn ? (
                <form
                  onSubmit={(e) => void reserve(e, c.id)}
                  className="support-form"
                >
                  <label>
                    Start (India time)
                    <input type="datetime-local" name="start" required />
                  </label>
                  <label>
                    End (India time)
                    <input type="datetime-local" name="end" required />
                  </label>
                  <p>
                    Choose 30 minutes to 6 hours within offered hours, at least
                    an hour ahead. Your vehicle and supply determine actual
                    power and energy.
                  </p>
                  <label className="checkbox-label">
                    <input type="checkbox" name="terms" required />I accept the{" "}
                    <a href="/terms">published terms</a>, energy rate, and host
                    access conditions. This request needs operator confirmation.
                  </label>
                  <button className="button dark" disabled={busy}>
                    Request this time
                  </button>
                </form>
              ) : (
                <a className="button dark" href="/auth/login?next=%2Fhosts">
                  Sign in to request a time
                </a>
              ))}
          </article>
        ))}
      </div>
      {!busy && !chargers.length && (
        <div className="empty-state">
          <h2>The first verified hosts start here.</h2>
          <p>
            There are no approved host chargers to display yet. We do not use
            sample homes or count Google stations as partners.
          </p>
          <a className="button dark" href="/?action=host">
            Apply to host
          </a>
        </div>
      )}
      {signedIn && (
        <section>
          <h2>Your charging sessions</h2>
          {!bookings.length && (
            <p>
              No host reservations yet. Applications and interest are in{" "}
              <a href="/?action=activity">My activity</a>.
            </p>
          )}
          {bookings.map((b) => (
            <article className="notice-card" key={b.id}>
              <span className="pill">
                {b.status} · payment {b.payment_status.replaceAll("_", " ")}
              </span>
              <h3>Session {b.id.slice(0, 8)}</h3>
              <p>
                {localTime(b.starts_at)} → {localTime(b.ends_at)} IST
              </p>
              <p>
                Agreed energy rate: {rupees(b.rate_paise_kwh)}/kWh
                {b.energy_kwh != null ? ` · ${b.energy_kwh} kWh measured` : ""}
                {b.amount_paise != null
                  ? ` · ${rupees(b.amount_paise)} due`
                  : ""}
              </p>
              {locations[b.charger_id] && (
                <p>
                  Confirmed location: {locations[b.charger_id].address} ·{" "}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${locations[b.charger_id].latitude},${locations[b.charger_id].longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Driving directions
                  </a>
                </p>
              )}
              {b.status === "requested" && (
                <p>
                  Awaiting operator approval. Request expires{" "}
                  {localTime(b.hold_until)} IST.
                </p>
              )}
              {["requested", "confirmed"].includes(b.status) && (
                <button
                  className="button outline"
                  disabled={busy}
                  onClick={() => void change(b.id, "cancel")}
                >
                  Cancel request
                </button>
              )}
              {b.status === "completed" &&
                ["unpaid", "pending"].includes(b.payment_status) && (
                  <button
                    className="button dark"
                    disabled={busy}
                    onClick={() => void pay(b.id)}
                  >
                    Pay measured session
                  </button>
                )}
              {b.payment_status === "paid" && (
                <button
                  className="button outline"
                  disabled={busy}
                  onClick={() => void change(b.id, "refund_request")}
                >
                  Request refund review
                </button>
              )}
              <p className="tiny">
                For disputes, use <a href="/support">private support</a> and
                quote the full session ID: {b.id}.
              </p>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
