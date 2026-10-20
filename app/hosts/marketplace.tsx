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
import { Comparison, VehiclePicker, useVehicle } from "../charger-tools";
import { energyQuote, type Choice } from "../lib/charger-choice";
type BusyWindow = { chargerId: string; start: string; end: string };
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
  const [vehicle, setVehicle] = useVehicle();
  const [compareIds, setCompareIds] = useState<string[]>([]),
    [energy, setEnergy] = useState(10),
    [sort, setSort] = useState("price");
  const [checkedAt, setCheckedAt] = useState(""),
    [scheduleComplete, setScheduleComplete] = useState(true),
    [busyWindows, setBusyWindows] = useState<BusyWindow[]>([]),
    [managed, setManaged] = useState<string[]>([]);
  const previous = useRef<Record<string, string>>({});

  const [chargers, setChargers] = useState<HostCharger[]>([]),
    [slots, setSlots] = useState<Slot[]>([]),
    [open, setOpen] = useState(false),
    [bookings, setBookings] = useState<Reservation[]>([]),
    [locations, setLocations] = useState<Record<string, Location>>({}),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const attempt = useRef({ payload: "", key: "" });
  const load = useCallback(
    async (background = false) => {
      if (!background) {
        setBusy(true);
        setError("");
      }
      try {
        const r = await fetch("/api/hosts", {
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
          }),
          data = await r.json();
        if (!r.ok) throw Error(data.error);
        setError("");
        setChargers(data.chargers);
        setSlots(data.slots);
        setOpen(data.reservationsOpen);
        setBusyWindows(data.busyWindows || []);
        setCheckedAt(data.checkedAt || "");
        setScheduleComplete(data.scheduleComplete === true);
        if (signedIn) {
          const response = await fetch("/api/reservations", {
              cache: "no-store",
              signal: AbortSignal.timeout(15000),
            }),
            saved = await response.json();
          if (!response.ok) throw Error(saved.error);
          const changes = (saved.bookings as Reservation[]).filter(
            (b) =>
              previous.current[b.id] && previous.current[b.id] !== b.status,
          );
          if (changes.length)
            setMessage(
              changes
                .map((b) => `Session ${b.id.slice(0, 8)} is now ${b.status}.`)
                .join(" ") +
                " Review the status before travelling. If cancelled, choose a backup stop.",
            );
          previous.current = Object.fromEntries(
            (saved.bookings as Reservation[]).map((b) => [b.id, b.status]),
          );
          setBookings(saved.bookings);
          setLocations(saved.locations);
          setManaged(saved.managedChargerIds || []);
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? `${e.message} Existing results may be out of date; refresh before travelling.`
            : "Could not refresh. Existing results may be out of date.",
        );
      } finally {
        if (!background) setBusy(false);
      }
    },
    [signedIn],
  );
  useEffect(() => {
    void load();
    const refresh = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const timer = setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);
  function toggleCompare(id: string) {
    if (compareIds.includes(id))
      setCompareIds(compareIds.filter((x) => x !== id));
    else if (compareIds.length < 3) setCompareIds([...compareIds, id]);
    else setMessage("Compare up to three hosts. Remove one to add another.");
  }
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
        vehicleConnections: vehicle,
        expectedRatePaise: chargers.find((c) => c.id === chargerId)
          ?.price_paise_kwh,
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
        "Request saved. It is not confirmed yet. The verified host or operator must accept within 30 minutes.",
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
          : action === "confirm"
            ? "Request confirmed for this host. The driver can see the updated session status."
            : action === "decline"
              ? "Request declined. Its time hold is released."
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
      <VehiclePicker vehicle={vehicle} onChange={setVehicle} />
      <p className="schedule-status" role="status">
        {checkedAt
          ? `Booking schedule refreshed ${localTime(checkedAt)}. `
          : "Booking schedule has not been loaded. "}
        Refreshes every 30 seconds while this page is visible. Offered hours and
        free booking windows are not live charger telemetry.
        {!scheduleComplete &&
          " Only part of the schedule was loaded. The server rechecks conflicts when you request a time."}
      </p>
      <label className="comparison-energy">
        Estimated session energy{" "}
        <input
          type="number"
          min="1"
          max="200"
          value={energy}
          onChange={(e) => setEnergy(Number(e.target.value))}
        />
        kWh
      </label>
      <label>
        Sort host chargers{" "}
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="price">Lowest published energy rate</option>
          <option value="power">Highest stated power</option>
          <option value="name">Name</option>
        </select>
      </label>
      <Comparison
        items={chargers
          .filter((c) => compareIds.includes(c.id))
          .map((c): Choice => ({
            id: c.id,
            name: c.name,
            connector: "Type 2 AC",
            power: `Up to ${c.power_kw} kW`,
            distance:
              "Exact residential route only after confirmed reservation",
            availability: slots.some((s) => s.charger_id === c.id)
              ? "Offered hours present · confirm requested window"
              : "No offered hours supplied",
            review: `Review recorded ${c.verified_at ? localTime(c.verified_at) : "date not supplied"}`,
            ratePaise: c.price_paise_kwh,
            scope: c.review_checks?.includes("pricing")
              ? "All-in quote scope reviewed; final bill uses measured kWh"
              : "Published energy rate; all-charge scope needs review",
          }))}
        onRemove={toggleCompare}
        onChoose={(id) =>
          document
            .getElementById(`host-${id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />
      <div className="host-listings">
        {[...chargers]
          .sort((a, b) =>
            sort === "price"
              ? a.price_paise_kwh - b.price_paise_kwh
              : sort === "power"
                ? b.power_kw - a.power_kw
                : a.name.localeCompare(b.name),
          )
          .map((c) => (
            <article key={c.id} id={`host-${c.id}`} className="notice-card">
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
              <label className="compare-check">
                <input
                  type="checkbox"
                  checked={compareIds.includes(c.id)}
                  onChange={() => toggleCompare(c.id)}
                />
                Compare this host
              </label>
              <p className="vehicle-match">
                {vehicle.includes("TYPE_2")
                  ? "Type 2 AC connector matches your selected vehicle connections. Vehicle power limits still apply."
                  : vehicle.length
                    ? "Your selected vehicle connections do not include this host’s Type 2 AC connection."
                    : "Choose your EV connections before requesting a time."}
              </p>
              <p>
                {c.area} · Type 2 AC · up to {c.power_kw} kW
              </p>
              <p>
                <strong>{rupees(c.price_paise_kwh)}/kWh</strong> ·{" "}
                {c.review_checks?.includes("pricing")
                  ? "reviewed all-in energy rate"
                  : "published energy rate; full scope unreviewed"}
              </p>
              <p>{c.access_notes}</p>
              <p>
                Estimated energy charge for {energy || "—"} kWh:{" "}
                <strong>
                  {energyQuote(c.price_paise_kwh, energy) === null
                    ? "Enter 1–200 kWh"
                    : rupees(energyQuote(c.price_paise_kwh, energy)!)}
                </strong>
                . Actual delivered energy determines the final bill.
              </p>
              <details>
                <summary>Review scope and price information</summary>
                <p>
                  Recorded checks:{" "}
                  {c.review_checks?.join(", ") || "Not supplied"}. Review date:{" "}
                  {c.verified_at ? localTime(c.verified_at) : "Not supplied"}.
                  These are manual review records, not an electrical safety
                  guarantee.
                </p>
                <p>
                  {c.review_checks?.includes("pricing")
                    ? "The operator recorded that the quoted rate includes the disclosed fees and applicable taxes. No extra platform checkout fee is added by this app. Your reservation stores its agreed energy rate."
                    : "All-charge scope has not been reviewed. This host cannot accept requests until the operator completes pricing review."}
                </p>
              </details>
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
                {!!busyWindows.filter((w) => w.chargerId === c.id).length && (
                  <>
                    <b>Held or booked windows</b>
                    <ul>
                      {busyWindows
                        .filter((w) => w.chargerId === c.id)
                        .map((w, i) => (
                          <li key={i}>
                            {localTime(w.start)} → {localTime(w.end)}
                          </li>
                        ))}
                    </ul>
                  </>
                )}
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
                      Quote: {rupees(c.price_paise_kwh)}/kWh. The server
                      rechecks this rate when you request a slot. If it changes,
                      review the updated quote. No automatic payment is taken.
                    </p>
                    <p>
                      Choose 30 minutes to 6 hours within offered hours, at
                      least an hour ahead. Your vehicle and supply determine
                      actual power and energy.
                    </p>
                    <label className="checkbox-label">
                      <input type="checkbox" name="terms" required />I accept
                      the <a href="/terms">published terms</a>, energy rate, and
                      host access conditions. This request needs operator
                      confirmation.
                    </label>
                    <button
                      className="button dark"
                      disabled={
                        busy ||
                        !vehicle.includes("TYPE_2") ||
                        !c.review_checks?.includes("pricing")
                      }
                    >
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
              {b.status === "requested" && (
                <p>
                  Confirmation hold ends {localTime(b.hold_until)}.{" "}
                  {Date.parse(b.hold_until) <= Date.now()
                    ? "This hold expired. Do not travel on this request."
                    : "Wait for confirmation before travelling."}
                </p>
              )}
              {managed.includes(b.charger_id) && b.status === "requested" && (
                <div className="detail-actions">
                  <button
                    className="button dark"
                    disabled={
                      busy || !open || Date.parse(b.hold_until) <= Date.now()
                    }
                    onClick={() => void change(b.id, "confirm")}
                  >
                    Confirm as host
                  </button>
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={() => void change(b.id, "decline")}
                  >
                    Decline as host
                  </button>
                </div>
              )}
              {managed.includes(b.charger_id) && b.status === "confirmed" && (
                <div>
                  <p>
                    If this charger becomes unavailable, cancel the session so
                    the driver can choose a backup. The driver’s open session
                    page refreshes every 30 seconds; no SMS or push alert is
                    sent.
                  </p>
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={() => void change(b.id, "decline")}
                  >
                    Report unavailable & cancel as host
                  </button>
                </div>
              )}
              {["cancelled", "expired"].includes(b.status) && (
                <p role="status">
                  This session is not available.{" "}
                  <a href="/#explore">Choose a backup public stop</a> or compare
                  another participating host.
                </p>
              )}
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
                  Awaiting host or operator approval. Request expires{" "}
                  {localTime(b.hold_until)} IST.
                </p>
              )}
              {!managed.includes(b.charger_id) &&
                ["requested", "confirmed"].includes(b.status) && (
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={() => void change(b.id, "cancel")}
                  >
                    Cancel request
                  </button>
                )}
              {!managed.includes(b.charger_id) &&
                b.status === "completed" &&
                ["unpaid", "pending"].includes(b.payment_status) && (
                  <button
                    className="button dark"
                    disabled={busy}
                    onClick={() => void pay(b.id)}
                  >
                    Pay measured session
                  </button>
                )}
              {!managed.includes(b.charger_id) &&
                b.payment_status === "paid" && (
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
