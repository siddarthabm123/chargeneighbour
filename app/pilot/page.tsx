import LegalShell from "../legal-shell";
export const metadata = {
  title: "The pilot & business idea | ChargeNeighbour",
  alternates: { canonical: "/pilot" },
};
export default function Pilot() {
  return (
    <LegalShell title="More access. From chargers already here.">
      <p>
        ChargeNeighbour aims to turn unused hours on accessible home EV chargers
        into trusted, bookable neighbourhood charging. We are validating the
        idea through host applications and a proposed local pilot.
      </p>
      <h2>What is working today</h2>
      <p>
        A public Google charging map, station discovery where the Places
        integration is active, host applications, interest registration and
        private support. Commercial reservations require verified hosts,
        approved operating arrangements and active payments.
      </p>
      <h2>The first use case</h2>
      <p>
        Planned Type 2 AC top-ups during a visit, errand or workday. Home AC
        charging complements public DC charging; it is not an emergency
        fast-charging promise.
      </p>
      <h2>A model to test</h2>
      <p>
        The proposed commission is 15% of metered charging revenue. At an
        assumed ₹16/kWh, a 10 kWh session has ₹160 charging value and ₹24
        platform revenue before payment, maps, support, refunds, acquisition and
        tax costs. These are assumptions, not verified margins or traction.
      </p>
      <h2>Evidence before expansion</h2>
      <p>
        Choose a concentrated first area. Verify owners, access, equipment,
        permissions and metering; then measure successful entry, delivered
        energy, completed sessions, repeat usage, complaints and contribution
        after variable costs. Applications, public Google stations and proposed
        targets are not live host inventory.
      </p>
      <h2>Join the first chapter</h2>
      <p>
        We are looking for founding charger hosts, compatible drivers and
        community partners to help validate safe, reliable local access.
      </p>
      <div className="detail-actions">
        <a
          className="button dark"
          href="/ChargeNeighbour-pilot-pitch.pptx"
          download
        >
          Download the pitch deck
        </a>
        <a className="button dark" href="/?action=host">
          Apply as a host
        </a>
        <a className="button outline" href="/?action=join">
          Register pilot interest
        </a>
        <a className="button outline" href="/pitch-brief.md">
          Read the pitch brief
        </a>
      </div>
    </LegalShell>
  );
}
