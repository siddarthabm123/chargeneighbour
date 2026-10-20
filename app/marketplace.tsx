"use client";
import { signOut } from "./auth/actions";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Zap,
  PlugZap,
  MapPin,
  ShieldCheck,
  Check,
  X,
  Search,
  Leaf,
  ChevronDown,
  Menu,
  CalendarDays,
  Coffee,
  Home,
  CircleCheck,
  BatteryCharging,
  Wallet,
  Download,
  ExternalLink,
  LoaderCircle,
  UserRound,
} from "lucide-react";
import { hostEstimate } from "./lib/model";
import LiveDiscovery from "./live-discovery";
import { campaignSource } from "./analytics-choice";
import HostEvidenceInput from "./host-evidence-input";

type User = { name: string; email: string } | null;
type Activity = {
  id: string;
  kind: string;
  status: string;
  createdAt: string;
  reply?: string;
  payload: Record<string, string | number>;
};
type Modal = "host" | "join" | "activity" | "pitch" | null;
const money = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
const signIn = (returnTo = "/") =>
  `/auth/login?next=${encodeURIComponent(returnTo)}`;

export default function Marketplace({ user }: { user: User }) {
  const [modal, setModal] = useState<Modal>(null);
  const [menu, setMenu] = useState(false),
    [hours, setHours] = useState(2),
    [days, setDays] = useState(20);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const [activity, setActivity] = useState<Activity[]>([]),
    [activityTab, setActivityTab] = useState("host");
  const dialog = useRef<HTMLDialogElement>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const submission = useRef({ body: "", key: "" });
  const [hostEvidence, setHostEvidence] = useState("");
  const estimate = hostEstimate(hours, days);

  useEffect(() => {
    const action = new URLSearchParams(location.search).get("action");
    if (action === "host") setModal("host");
    if (action === "join") setModal("join");
    if (action === "activity") setModal("activity");
  }, []);
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.current?.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modal]);
  useEffect(() => {
    if (modal === "activity" && user) void loadActivity();
  }, [modal]);
  function open(type: Modal) {
    if (type === "host") setHostEvidence("");
    setError("");
    setSuccess("");
    setModal(type);
    setMenu(false);
  }
  async function loadActivity(cursor?: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        cursor
          ? `/api/requests?cursor=${encodeURIComponent(cursor)}`
          : "/api/requests",
      );
      const data = (await res.json()) as {
        error?: string;
        requests: Activity[];
      };
      if (!res.ok) throw new Error(data.error);
      setActivity((prev) =>
        cursor ? [...prev, ...data.requests] : data.requests,
      );
      setNextCursor((data as { nextCursor?: string }).nextCursor || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load activity.");
    } finally {
      setBusy(false);
    }
  }
  async function submit(payload: Record<string, unknown>, message: string) {
    setBusy(true);
    setError("");
    try {
      const body = JSON.stringify({ ...payload, source: campaignSource() });
      if (submission.current.body !== body)
        submission.current = { body, key: crypto.randomUUID() };
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": submission.current.key,
        },
        body,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      setSuccess(message);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function cancel(id: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      await loadActivity();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to cancel.");
    } finally {
      setBusy(false);
    }
  }
  function submitHost(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hostEvidence) {
      setError(
        "Upload at least one charger photo with fresh on-site GPS before applying.",
      );
      return;
    }
    const f = new FormData(e.currentTarget);
    void submit(
      {
        kind: "host",
        name: f.get("name"),
        area: f.get("area"),
        power: f.get("power"),
        access: f.get("access"),
        permission: f.get("permission") === "on",
        evidenceId: hostEvidence,
      },
      "Your host application is saved. It is pending review; your charger is not listed publicly. You can view or withdraw it in My activity.",
    );
  }
  function submitJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void submit(
      {
        kind: "interest",
        area: f.get("area"),
        role: f.get("role"),
        consent: f.get("consent") === "on",
      },
      "You’re on the pilot interest list. Your interest is saved to your account. Launch dates and availability are still to be confirmed.",
    );
  }
  const filteredActivity = activity.filter((a) =>
    activityTab === "support"
      ? ["support", "deletion"].includes(a.kind)
      : a.kind === activityTab,
  );

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        <span className="live-dot" /> A little closer to a better charging day.{" "}
        <button onClick={() => open("join")}>
          Join the charger-sharing network <ArrowUpRight size={13} />
        </button>
      </div>
      <header className="header wrap">
        <a className="brand" href="#" aria-label="ChargeNeighbour home">
          <span className="brand-mark">
            <PlugZap size={25} />
          </span>
          <span>
            charge<span className="brand-light">neighbour</span>
            <span className="brand-period">.</span>
          </span>
        </a>
        <nav
          aria-label="Main navigation"
          className={menu ? "nav mobile-open" : "nav"}
        >
          <a href="#explore" onClick={() => setMenu(false)}>
            Find a charger
          </a>
          <a href="#how" onClick={() => setMenu(false)}>
            How it works
          </a>
          <a href="#hosts" onClick={() => setMenu(false)}>
            For hosts
          </a>
          <button onClick={() => open("pitch")}>
            The bigger picture <ArrowUpRight size={13} />
          </button>
        </nav>
        <div className="nav-actions">
          <button className="signin" onClick={() => open("activity")}>
            <UserRound size={16} />
            <span>{user ? "My activity" : "Sign in"}</span>
          </button>
          <button
            className="button small outline nav-host"
            onClick={() => open("host")}
          >
            Become a host <ArrowUpRight size={15} />
          </button>
          <button
            className="menu-button icon-button"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main">
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> EV CHARGING & HOME CHARGER SHARING
            </div>
            <h1>
              Find a charge.
              <br />
              Share your
              <br />
              <span>charger.</span>
              <svg
                className="headline-spark"
                viewBox="0 0 46 60"
                aria-hidden="true"
              >
                <path d="M26 1 5 33h17l-3 24 23-34H25Z" />
              </svg>
            </h1>
            <p>
              Find real EV charging stations across India.
              <br className="desktop-break" /> Own a home charger? Apply to
              share your spare
              <br className="desktop-break" /> charging hours with drivers
              nearby.
            </p>
            <div className="hero-actions">
              <a href="#explore" className="button dark">
                Find EV chargers <ArrowUpRight size={18} />
              </a>
              <a href="#hosts" className="text-link">
                Share my charger <ArrowRight size={16} />
              </a>
            </div>
            <div className="hero-footnote">
              <span className="location-round">
                <MapPin size={15} />
              </span>
              <span>
                Real Google map{" "}
                <span className="muted">· Host applications open</span>
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <img
              src="/images/neighbourhood-hero.webp"
              alt="Concept image of an electric car connected to a home charger in a leafy Bengaluru driveway"
              fetchPriority="high"
            />
            <div className="image-top">
              <span>
                <span className="live-dot" /> BUILT AROUND EVERYDAY LIFE
              </span>
              <span className="round-arrow">
                <ArrowUpRight size={20} />
              </span>
            </div>
            <div className="hero-photo-card">
              <div className="photo-card-icon">
                <BatteryCharging size={29} />
              </div>
              <div>
                <b>
                  A spare charger.
                  <br />A shared possibility.
                </b>
                <span>Good for your car. Great for your community.</span>
              </div>
            </div>
            <span className="concept-label">AI-generated concept image</span>
          </div>
        </section>
        <LiveDiscovery />
        <section id="how" className="how-section">
          <div className="wrap">
            <div className="section-heading">
              <div>
                <div className="eyebrow">FEWER DETOURS. MORE EVERYDAY.</div>
                <h2>Plug into your neighbourhood.</h2>
              </div>
              <p className="heading-aside">
                A simpler charging routine,
                <br />
                powered by people nearby.
              </p>
            </div>
            <div className="steps">
              <article>
                <span className="step-number">01</span>
                <span className="step-icon">
                  <Search />
                </span>
                <h3>Find your fit.</h3>
                <p>
                  Search your destination and compare mapped stations inside
                  ChargeNeighbour.
                </p>
              </article>
              <article>
                <span className="step-number">02</span>
                <span className="step-icon">
                  <CalendarDays />
                </span>
                <h3>Check before you travel.</h3>
                <p>
                  Explore station photos and supplied reviews. Confirm the
                  connector, opening hours and entry with its operator.
                </p>
              </article>
              <article>
                <span className="step-number">03</span>
                <span className="step-icon">
                  <Coffee />
                </span>
                <h3>Get directions. Carry on.</h3>
                <p>
                  Preview the road route and estimated driving distance here.
                  Contact the operator for charging, pricing and payment.
                </p>
              </article>
            </div>
            <p className="workflow-note">
              Explore real mapped stations and road routes here. Host
              applications are open; ChargeNeighbour reservations require
              approved participating hosts.
            </p>
          </div>
        </section>
        <section id="hosts" className="host-section wrap section">
          <div className="host-story">
            <div className="eyebrow">YOUR CHARGER HAS MORE TO GIVE.</div>
            <h2>
              Share a little power.
              <br />
              Make a little <em>extra.</em>
            </h2>
            <p>
              When your car isn’t plugged in, your charger could help someone
              nearby. You choose your hours. You approve who visits.
            </p>
            <ul className="check-list">
              <li>
                <Check />
                Your schedule. Your parking space.
              </li>
              <li>
                <Check />A clear price for every kWh.
              </li>
              <li>
                <Check />
                Review and approval before listing.
              </li>
            </ul>
            <button className="button dark" onClick={() => open("host")}>
              Become a founding host <ArrowUpRight size={18} />
            </button>
            <p className="tiny">
              Applications are open. Listings go live only after onboarding and
              review.
            </p>
          </div>
          <div className="earnings-card">
            <div className="calculator-heading">
              <span className="calculator-icon">
                <Wallet size={22} />
              </span>
              <span>THE POSSIBILITIES, IN NUMBERS</span>
              <span className="pill">Illustrative</span>
            </div>
            <p className="earning-label">Potential monthly surplus</p>
            <div className="earning-total">
              {money(estimate.net)}
              <span>/ month</span>
            </div>
            <p className="earning-sub">
              After assumed electricity cost & platform fee. Before tax.
            </p>
            <label className="range-label" htmlFor="hours">
              Booked charging hours a day{" "}
              <b>
                {hours} {hours === 1 ? "hour" : "hours"}
              </b>
            </label>
            <input
              id="hours"
              type="range"
              min="1"
              max="6"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            />
            <label className="range-label" htmlFor="days">
              Days booked per month <b>{days} days</b>
            </label>
            <input
              id="days"
              type="range"
              min="5"
              max="30"
              step="5"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
            <div className="earning-breakdown">
              <span>
                Illustrative customer payments<b>{money(estimate.gross)}</b>
              </span>
              <span>
                Electricity assumption<b>− {money(estimate.cost)}</b>
              </span>
              <span>
                Proposed platform fee · 15%<b>− {money(estimate.fee)}</b>
              </span>
            </div>
            <details className="assumptions">
              <summary>
                See every assumption <ChevronDown size={15} />
              </summary>
              <p>
                7.2 kW charger × booked hours × days × 90% energy factor.
                Example price ₹16/kWh, electricity ₹8/kWh, and 15% platform
                commission. These are business assumptions, not a tariff quote.
                Utilisation, vehicle limits, losses, demand charges, taxes and
                maintenance change outcomes. No earnings are guaranteed.
              </p>
            </details>
          </div>
        </section>
        <section className="pilot-section wrap" id="pilot">
          <div className="pilot-symbol">
            <PlugZap size={64} />
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
          </div>
          <div className="pilot-copy">
            <div className="eyebrow">START SMALL. GET THE DETAILS RIGHT.</div>
            <h2>
              One network. Across India.
              <br />A more thoughtful way to charge.
            </h2>
            <p>
              Charger owners can apply from any Indian city. We review access,
              equipment and permissions before a host can offer reservations.
              Public station discovery remains separate from our participating
              host network.
            </p>
            <div className="pilot-tags">
              <span>
                <MapPin size={13} />
                India-wide discovery
              </span>
              <span>
                <PlugZap size={13} />
                Type 2 AC
              </span>
              <span>
                <ShieldCheck size={13} />
                Review before listing
              </span>
            </div>
            <button className="button lime" onClick={() => open("pitch")}>
              Explore the business idea <ArrowUpRight size={17} />
            </button>
          </div>
        </section>
        <section className="faq-section wrap section">
          <div>
            <div className="eyebrow">GOOD QUESTIONS. CLEAR ANSWERS.</div>
            <h2>
              Let’s clear
              <br />a few things up.
            </h2>
            <p>
              Because a better charging experience
              <br />
              starts with knowing what to expect.
            </p>
            <button className="text-link" onClick={() => open("join")}>
              Be part of the pilot <ArrowRight size={17} />
            </button>
          </div>
          <div className="faq-list">
            {[
              [
                "Can I book a real charger today?",
                "Search for real stations in Google Maps and contact their operators for charging. Booking through ChargeNeighbour is not enabled until hosts are verified and reservation, payment and support processes are active. Applications and interest registrations are saved as real records.",
              ],
              [
                "Will it work with my EV?",
                "Station discovery can include different charger and vehicle types. Google listings do not guarantee compatibility. Check the connector, power and vehicle specification with the operator. Our initial host intake is for Type 2 AC car chargers.",
              ],
              [
                "Is this a fast-charging network?",
                "Station search may include AC and DC sites. Check charging power and connector details with the operator. Our host-sharing model focuses initially on AC charging and is not an emergency service. Actual delivered energy depends on your vehicle and supply.",
              ],
              [
                "How will pricing and payments work?",
                "Hosts would publish a per-kWh price before a booking request. The proposed platform commission is 15% of the session charge, deducted from host proceeds. Actual billing would use measured energy with taxes and any fees shown before payment. Payment processing and host settlement require an approved provider; they are not active on this site.",
              ],
              [
                "What about apartment gates and electrical safety?",
                "A host must have the right to offer parking and charger access, including written society approval where needed. The planned review checks electrical installation, protective devices, metering, parking and entry instructions. A host application is not safety certification or listing approval.",
              ],
              [
                "Can I cancel or withdraw my request?",
                "You can withdraw a host application or interest registration in My activity. Any earlier sample booking is a historical example and can also be cancelled. There are no charges on this site. Before live sessions, the cancellation, refund, support and dispute policies must be published.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span className="faq-plus">+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="join-section wrap">
          <div>
            <span className="eyebrow">THE NEXT CHAPTER STARTS NEARBY.</span>
            <h2>
              Bring good energy
              <br />
              to your neighbourhood.
            </h2>
          </div>
          <div>
            <p>
              Drive electric? Have a charger?
              <br />
              Let’s build a better everyday, together.
            </p>
            <button className="button dark" onClick={() => open("join")}>
              Join the charging network <ArrowUpRight size={18} />
            </button>
          </div>
          <svg aria-hidden="true" className="join-spark" viewBox="0 0 80 100">
            <path d="M43 0 8 56h28l-5 43 44-62H45Z" />
          </svg>
        </section>
      </main>
      <footer className="footer wrap">
        <div className="footer-main">
          <a className="brand" href="#">
            <span className="brand-mark">
              <PlugZap size={23} />
            </span>
            <span>
              charge<span className="brand-light">neighbour</span>.
            </span>
          </a>
          <p>A little power. A lot of possibility.</p>
          <div>
            <a href="#explore">Find a charger</a>
            <button onClick={() => open("host")}>Become a host</button>
            <button onClick={() => open("pitch")}>Our pilot plan</button>
            <a href="/hosts">Host chargers & sessions</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Pilot terms</a>
            <a href="/support">Support</a>
            <a href="/status">Service status</a>
            <button
              onClick={() =>
                window.dispatchEvent(new Event("cn-analytics-preferences"))
              }
            >
              Analytics preferences
            </button>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} ChargeNeighbour. India-wide discovery
            and host applications.
          </span>
          <span>
            Made for the places we call home. <Leaf size={13} />
          </span>
        </div>
      </footer>

      <dialog
        ref={dialog}
        className={`dialog ${modal === "pitch" ? "dialog-wide" : ""}`}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setModal(null);
        }}
        aria-labelledby="dialog-title"
      >
        <button
          className="close-dialog icon-button"
          onClick={() => setModal(null)}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
        {modal === "host" && (
          <>
            <div className="modal-eyebrow">
              <Home size={16} />
              BECOME A FOUNDING HOST
            </div>
            <h2 id="dialog-title">Your charger. More possibility.</h2>
            <p className="modal-subtitle">
              Apply for our charger-sharing network. No listing fee during
              application.
            </p>
            {success ? (
              <Success text={success} onActivity={() => open("activity")} />
            ) : (
              <form onSubmit={submitHost}>
                {!user && (
                  <div className="notice-card">
                    <p>
                      Sign in first to apply as a host. We’ll return you here to
                      complete the form.
                    </p>
                    <a
                      className="button dark full"
                      href={signIn("/?action=host")}
                    >
                      Continue with email
                    </a>
                    <p className="tiny">
                      Email not arriving?{" "}
                      <a href="/support">Contact the pilot team</a>.
                    </p>
                  </div>
                )}
                <fieldset hidden={!user}>
                  <div className="form-grid">
                    <label>
                      Your name
                      <input
                        name="name"
                        required
                        minLength={2}
                        maxLength={80}
                        defaultValue={
                          user?.name.includes("@") ? "" : user?.name
                        }
                        placeholder="Your full name"
                      />
                    </label>
                    <label>
                      Neighbourhood
                      <input
                        name="area"
                        required
                        minLength={2}
                        maxLength={80}
                        placeholder="Neighbourhood, city, state"
                      />
                    </label>
                    <label>
                      Type 2 AC charger power
                      <select name="power" required>
                        <option value="7.2">7.2 kW</option>
                        <option value="3.3">3.3 kW</option>
                        <option value="11">11 kW</option>
                        <option value="22">22 kW</option>
                      </select>
                    </label>
                    <label>
                      Parking & entry
                      <select name="access" required>
                        <option value="">Choose access type</option>
                        <option>Independent driveway</option>
                        <option>Commercial parking</option>
                        <option>Apartment with written permission</option>
                      </select>
                    </label>
                  </div>
                  <div className="onboarding-steps">
                    <b>Before a charger goes live</b>
                    <span>
                      <span>1</span>Confirm identity, permission & access
                    </span>
                    <span>
                      <span>2</span>Review electrical safety & metering
                    </span>
                    <span>
                      <span>3</span>Agree pricing, payouts & support
                    </span>
                  </div>
                  <HostEvidenceInput onReady={setHostEvidence} />
                  <label className="checkbox-label">
                    <input name="permission" type="checkbox" required />I own or
                    am authorised to offer this charger and parking space, and
                    can provide any required property or society permission.
                  </label>
                  <p className="tiny">
                    We save this application and your account email for pilot
                    onboarding. Your charger photo and precise GPS capture are
                    saved privately for review. No identity documents or bank
                    details are collected here.{" "}
                    <a className="inline-link" href="/privacy">
                      Privacy details
                    </a>
                  </p>
                  {user ? (
                    <button
                      className="button dark full"
                      disabled={busy || !hostEvidence}
                    >
                      {busy ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                      Submit host application
                    </button>
                  ) : (
                    <a
                      href={signIn("/?action=host")}
                      target="_top"
                      className="button dark full"
                    >
                      Sign in to apply <ArrowRight size={17} />
                    </a>
                  )}
                </fieldset>
              </form>
            )}
          </>
        )}

        {modal === "join" && (
          <>
            <div className="modal-eyebrow">
              <Leaf size={16} />
              GOOD ENERGY STARTS WITH YOU
            </div>
            <h2 id="dialog-title">Let’s connect your neighbourhood.</h2>
            <p className="modal-subtitle">
              Register as an interested driver, charger host or community
              partner.
            </p>
            {success ? (
              <Success text={success} onActivity={() => open("activity")} />
            ) : (
              <form onSubmit={submitJoin}>
                {!user && (
                  <div className="notice-card">
                    <p>
                      Sign in first to register pilot interest. We’ll return you
                      here to complete the form.
                    </p>
                    <a
                      className="button dark full"
                      href={signIn("/?action=join")}
                    >
                      Continue with email
                    </a>
                    <p className="tiny">
                      Email not arriving?{" "}
                      <a href="/support">Contact the pilot team</a>.
                    </p>
                  </div>
                )}
                <fieldset hidden={!user}>
                  <label>
                    I’d like to join as
                    <select name="role">
                      <option value="driver">An EV driver</option>
                      <option value="host">A charger host</option>
                      <option value="partner">
                        A pilot / community partner
                      </option>
                    </select>
                  </label>
                  <label>
                    Your neighbourhood
                    <input
                      name="area"
                      required
                      maxLength={80}
                      placeholder="Neighbourhood, city, state"
                    />
                  </label>
                  <div className="notice">
                    <MapPin size={18} />
                    <span>
                      Applications are welcome across India. Bookable host
                      coverage depends on approved chargers and confirmed
                      access.
                    </span>
                  </div>
                  <label className="checkbox-label">
                    <input name="consent" type="checkbox" required />I agree to
                    have my interest and account email saved so ChargeNeighbour
                    can contact me about this pilot. I can withdraw in My
                    activity.
                  </label>
                  {user ? (
                    <button className="button dark full" disabled={busy}>
                      {busy ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                      Register my interest
                    </button>
                  ) : (
                    <a
                      className="button dark full"
                      href={signIn("/?action=join")}
                      target="_top"
                    >
                      Sign in to join the interest list <ArrowRight size={17} />
                    </a>
                  )}
                </fieldset>
              </form>
            )}
          </>
        )}

        {modal === "activity" && (
          <>
            <div className="modal-eyebrow">
              <UserRound size={16} />
              YOUR CHARGENEIGHBOUR
            </div>
            <h2 id="dialog-title">A little overview.</h2>
            {!user ? (
              <>
                <p>
                  Sign in to apply as a host and manage your saved applications
                  and interest.
                </p>
                <a
                  className="button dark full"
                  href={signIn("/?action=activity")}
                  target="_top"
                >
                  Continue with email <ArrowRight size={17} />
                </a>
                <p className="tiny">
                  Your activity belongs to your signed-in account. No payments
                  are enabled.
                </p>
              </>
            ) : (
              <>
                <div className="account-line">
                  <span>{user.email}</span>
                  <form action={signOut}>
                    <button type="submit">Sign out</button>
                  </form>
                </div>
                <div className="activity-tabs">
                  {[
                    ["host", "Host applications"],
                    ["interest", "Pilot interest"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      className={activityTab === id ? "active" : ""}
                      onClick={() => setActivityTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {busy ? (
                  <div className="loading">
                    <LoaderCircle className="spin" />
                    Loading your activity…
                  </div>
                ) : filteredActivity.length ? (
                  <div className="activity-list">
                    {filteredActivity.map((a) => (
                      <article key={a.id}>
                        <div>
                          <span className={`status status-${a.status}`}>
                            {a.status.replaceAll("_", " ")}
                          </span>
                          <h3>
                            {String(
                              a.payload.name ||
                                a.payload.area ||
                                a.payload.subject,
                            )}
                          </h3>
                          {a.reply && (
                            <p className="operator-reply">
                              Operator response: {a.reply}
                            </p>
                          )}
                          <p>
                            {a.kind === "booking"
                              ? `${a.payload.area} · ${a.payload.date} · ${a.payload.time} IST · ${a.payload.hours}h`
                              : a.kind === "host"
                                ? `${a.payload.area} · ${a.payload.power} kW Type 2 · ${a.payload.access}`
                                : `${a.payload.role} · Pilot interest registered`}
                          </p>
                          <span className="tiny">
                            Saved{" "}
                            {new Date(a.createdAt).toLocaleDateString("en-IN", {
                              timeZone: "Asia/Kolkata",
                            })}
                          </span>
                        </div>
                        {a.status !== "cancelled" && (
                          <button
                            className="inline-link"
                            disabled={busy}
                            onClick={() => void cancel(a.id)}
                          >
                            {a.kind === "booking"
                              ? "Cancel sample"
                              : "Withdraw"}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <PlugZap />
                    <h3>
                      {activityTab === "host"
                        ? "Your hosting story starts here."
                        : activityTab === "interest"
                          ? "Be part of the first chapter."
                          : "Find real charging stations."}
                    </h3>
                    <p>
                      {activityTab === "host"
                        ? "No applications yet. Apply to have your charger reviewed for the network."
                        : activityTab === "interest"
                          ? "Register your interest in the charging network."
                          : "Discover real stations and contact their operators. ChargeNeighbour reservations open only for approved participating hosts."}
                    </p>
                    <button
                      className="button dark"
                      onClick={() =>
                        activityTab === "host"
                          ? open("host")
                          : activityTab === "interest"
                            ? open("join")
                            : (setModal(null),
                              document
                                .getElementById("explore")
                                ?.scrollIntoView({ behavior: "smooth" }))
                      }
                    >
                      {activityTab === "host"
                        ? "Apply to host"
                        : activityTab === "interest"
                          ? "Join pilot"
                          : "Explore chargers"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
                {nextCursor && (
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={() => void loadActivity(nextCursor)}
                  >
                    Load older activity
                  </button>
                )}
                <p>
                  <a className="text-link" href="/hosts">
                    View host chargers & charging sessions →
                  </a>
                </p>
                <p className="tiny">
                  Host applications require operational review. Your application
                  is separate from a confirmed reservation. Commercial sessions
                  require approved hosts and an operationally ready pilot.
                </p>
              </>
            )}
          </>
        )}

        {modal === "pitch" && (
          <>
            <div className="modal-eyebrow">
              <Zap size={16} />
              THE BIGGER PICTURE · PROPOSED PILOT
            </div>
            <h2 id="dialog-title">
              More access.
              <br />
              From chargers already here.
            </h2>
            <p className="pitch-intro">
              ChargeNeighbour aims to turn unused hours on accessible home EV
              chargers into bookable, trusted neighbourhood charging sessions.
            </p>
            <div className="pitch-grid">
              <div>
                <span className="pitch-number">01 / THE OPPORTUNITY</span>
                <h3>Put existing capacity to work.</h3>
                <p>
                  Home AC charging hardware already exists. The hypothesis: some
                  owners will share idle capacity if access, pricing, safety and
                  payouts are handled well.
                </p>
              </div>
              <div>
                <span className="pitch-number">02 / THE FIRST CUSTOMER</span>
                <h3>Planned stops, close to home.</h3>
                <p>
                  Start with Type 2 car drivers who need a planned top-up near a
                  visit, a workday or an errand. This complements public DC
                  networks.
                </p>
              </div>
              <div>
                <span className="pitch-number">03 / THE BUSINESS MODEL</span>
                <h3>A fee when a session happens.</h3>
                <p>
                  Proposed 15% host commission on metered charging revenue. No
                  charger inventory purchase assumed. Payments, tax and
                  settlement arrangements remain launch dependencies.
                </p>
              </div>
              <div>
                <span className="pitch-number">04 / THE TEST</span>
                <h3>Earn trust before expanding.</h3>
                <p>
                  Target an initial cohort of 5–10 approved hosts, selected from
                  applications across India. Measure completed sessions,
                  successful entry, repeat bookings and contribution margin.
                  These are targets, not traction.
                </p>
              </div>
            </div>
            <div className="pitch-economics">
              <h3>One sample session. Transparent maths.</h3>
              <div>
                <span>
                  10 kWh × ₹16<b>₹160</b>
                  <small>Customer spend, before tax</small>
                </span>
                <span>
                  15% commission<b>₹24</b>
                  <small>Platform revenue, before costs</small>
                </span>
                <span>
                  ₹136 − ₹80 electricity<b>₹56</b>
                  <small>Host surplus, before other costs</small>
                </span>
              </div>
              <p className="tiny">
                ₹8/kWh electricity is assumed. Platform revenue is not profit:
                payment fees, support, acquisition, refunds and operations still
                need to be covered. No market-size or traction claim is implied.
              </p>
            </div>
            <h3>What makes the idea testable?</h3>
            <ul className="check-list pitch-checks">
              <li>
                <Check />
                Host approval and written entry instructions address the
                gated-access problem.
              </li>
              <li>
                <Check />
                Connector and power checks reduce mismatched expectations.
              </li>
              <li>
                <Check />
                Meter readings, session records and a clear quote support
                billing trust.
              </li>
              <li>
                <Check />
                Reliable access and operating readiness come before reservation
                coverage.
              </li>
            </ul>
            <div className="source-panel">
              <h3>Evidence & launch dependencies</h3>
              <p>
                <a
                  href="https://www.tatamotors.com/press-releases/tata-ev-celebrates-2-lakh-evs-on-the-road/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Tata Motors, February 2025 <ExternalLink size={12} />
                </a>{" "}
                described 7.2 kW home charger installations. This supports
                hardware availability, not evidence of willingness to share.
              </p>
              <p>
                <a
                  href="https://www.pib.gov.in/PressReleasePage.aspx?PRID=2151393&lang=2&reg=48"
                  target="_blank"
                  rel="noreferrer"
                >
                  Government of India, August 2025 <ExternalLink size={12} />
                </a>{" "}
                confirms 2024 charging-infrastructure guidelines. Local tariff,
                property permission and technical requirements still need review
                for each pilot site.
              </p>
              <p>
                <a
                  href="https://razorpay.com/docs/payments/route/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Razorpay Route documentation <ExternalLink size={12} />
                </a>{" "}
                describes marketplace settlements and eligibility requirements.
                Provider approval and host onboarding must be confirmed before
                collecting money.
              </p>
              <p className="tiny">
                Sources reviewed 19 October 2026. No affiliation or partnership
                is claimed.
              </p>
            </div>
            <div className="pitch-actions">
              <a
                className="button dark"
                href="/ChargeNeighbour-pilot-pitch.pptx"
                download
              >
                <Download size={16} />
                Download pitch deck
              </a>
              <a className="button outline" href="/pitch-brief.md" download>
                <Download size={16} />
                Download pitch brief
              </a>
              <button className="button dark" onClick={() => open("join")}>
                Join the pilot <ArrowUpRight size={16} />
              </button>
            </div>
          </>
        )}

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </dialog>
    </>
  );
}
function Success({
  text,
  onActivity,
}: {
  text: string;
  onActivity: () => void;
}) {
  return (
    <div className="success-state" role="status">
      <span>
        <CircleCheck size={34} />
      </span>
      <h3>All saved.</h3>
      <p>{text}</p>
      <button className="button dark" onClick={onActivity}>
        View my activity <ArrowRight size={16} />
      </button>
    </div>
  );
}
