import LegalShell from "../legal-shell";

export const metadata = {
  title: "Problems, solutions & feature status | ChargeNeighbour",
  description:
    "Five charging problems, the safeguards included in ChargeNeighbour, and the operating dependencies for our pilot.",
  alternates: { canonical: "/features" },
};

const features = [
  {
    problem: "1. Will this charger fit my EV?",
    before:
      "Connector and minimum-power filters; missing specifications are labelled.",
    added:
      "Choose your vehicle’s supported connections once per tab. Known mismatches are filtered out; unknown specifications still need confirmation and can be hidden. Charger cards show connector matches. Host requests require a Type 2 AC selection on the server as well as the screen.",
    limit:
      "A connector match does not establish vehicle voltage, adapter support, actual charging speed or equipment condition. Check your vehicle manual and the operator’s specifications.",
  },
  {
    problem: "2. What if the charger becomes unavailable?",
    before:
      "Reported connector counts expire after 15 minutes. Participating-host requests use expiring holds and transactional overlap checks.",
    added:
      "Availability labels show the age of supplied reports, with matching-connector counts for your vehicle. Recheck station details and choose a backup. Participating-host schedules and account sessions refresh every 30 seconds while visible. Verified host owners can confirm or decline their own requests; cancelled or expired requests direct drivers to alternatives.",
    limit:
      "Public mapped stations cannot be reserved here. Opening hours, offered booking hours and a confirmed reservation are separate from a live connector feed. No charger telemetry or out-of-app arrival alerts are connected. Host requests remain closed until operational approval.",
  },
  {
    problem: "3. Can I trust a private charger and its price?",
    before:
      "A new host submits a private photo and fresh on-site GPS for manual review. Participating sessions store the agreed rate and use supervised meter readings.",
    added:
      "Host listings disclose the recorded review scope and date. New approvals require an all-in pricing review, and unreviewed prices cannot accept requests. The request rechecks the displayed rate; a changed quote requires review. Energy estimates use the published rate and the same chosen kWh amount.",
    limit:
      "GPS and a photo are evidence for review, not proof of ownership or electrical certification. Physical inspection, genuine permissions, support operations and final commercial policies still need to be completed for each pilot host. Unknown public-station prices remain unconfirmed.",
  },
  {
    problem: "4. Do the map and list show the same chargers?",
    before:
      "The interactive map and station list share one filtered result set.",
    added:
      "Changing filters removes hidden selections, routes and comparison entries. If the map cannot load, the site keeps the filtered list and explains the failure instead of embedding an unrelated broad map search.",
    limit:
      "Community and provider records may be incomplete. Markers require supplied coordinates; this shared dataset is not a claim of complete charger coverage or a provider’s entire inventory.",
  },
  {
    problem: "5. Which charger is best for my trip and budget?",
    before:
      "In-site road routes and driving-distance/time estimates, plus separately published participating-host rates.",
    added:
      "Compare up to three chargers by connector, power, road distance/time, availability, review and price. Host listings can be sorted by published rate, stated power or name. Compare the same energy quantity to see an estimated charge; missing prices never become ₹0. A separate fictional comparison demo works without Google billing.",
    limit:
      "Road estimates exclude live traffic. Exact private-home routes remain restricted to confirmed participants. A charging-time, traffic or final-bill guarantee is not supplied. Public stations without known tariffs cannot be ranked by price.",
  },
];

export default function Features() {
  return (
    <LegalShell title="Fewer surprises before your next charge.">
      <p>
        Five customer problems and the safeguards included in this pilot.
        Updated 20 October 2026.
      </p>
      <div className="notice-card">
        <strong>
          Discovery and comparison are available. Commercial host bookings
          remain closed.
        </strong>
        <p>
          Google photos and reviews await provider activation. The separate demo
          uses clearly labelled fictional content. Approved host inventory is
          shown only when real hosts have completed review.
        </p>
      </div>
      <p>
        <a className="button dark" href="/#explore">
          Explore chargers
        </a>{" "}
        <a className="button outline" href="/hosts">
          Host chargers & sessions
        </a>
      </p>
      <div className="feature-matrix">
        {features.map((f) => (
          <article key={f.problem}>
            <h2>{f.problem}</h2>
            <p>
              <strong>Already included:</strong> {f.before}
            </p>
            <p>
              <strong>Added to this version:</strong> {f.added}
            </p>
            <p>
              <strong>Operating limits:</strong> {f.limit}
            </p>
          </article>
        ))}
      </div>
      <p>
        For a pitch: “ChargeNeighbour helps drivers check connector fit, compare
        charging options and understand availability and price before
        travelling, with a reviewed host-sharing pilot.” Current capability is
        distinct from planned live integrations, safety certification and
        operating traction.
      </p>
      <p>
        <a href="/status">Check provider and pilot status</a> ·{" "}
        <a href="/support">Report an incorrect listing or a safety concern</a>
      </p>
    </LegalShell>
  );
}
