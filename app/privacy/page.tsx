import type { Metadata } from "next";
import LegalShell from "../legal-shell";
import { operatorDetails } from "../lib/settings";
export const metadata: Metadata = {
  title: "Privacy notice | ChargeNeighbour",
  alternates: { canonical: "/privacy" },
};
export default function Privacy() {
  const business = operatorDetails();
  return (
    <LegalShell title="Your data. Clear choices.">
      <p>
        Updated 20 October 2026. This notice covers the ChargeNeighbour pilot
        website.
      </p>
      <h2>Who operates this pilot?</h2>
      <p>
        {business.name
          ? `The operator is ${business.name}.`
          : "ChargeNeighbour is a pilot project. A legal operating entity has not yet been declared, and commercial charging is not open."}{" "}
        Use the <a href="/support">private support form</a> for questions or
        data requests.
        {business.email && (
          <>
            {" "}
            You can also contact{" "}
            <a href={`mailto:${business.email}`}>{business.email}</a>.
          </>
        )}
      </p>
      <h2>Information we use</h2>
      <p>
        Supabase handles email authentication. Applications include your account
        identifier, email, name, area, charger/access details, consent and
        timestamps. Support tickets include your email, message, reply and
        status. We use these to manage applications, respond to requests and
        operate the pilot. We do not sell application data. Host applicants must
        also upload at least one charger photo with a fresh, precise on-site GPS
        capture, accuracy and timestamp. These are stored privately in Supabase
        for manual review by authorised operators; a photo or self-reported GPS
        does not verify ownership, charger existence or safety. Images are
        resized and re-encoded to remove embedded metadata. If you separately
        opt in to public photo publication, an authorised operator may approve
        that image for your public listing. We serve only images referenced by
        an approved listing with recorded consent. GPS metadata remains private.
        Withdrawal removes public photo access after the listing is suspended or
        removed.
      </p>
      <h2>Location and map providers</h2>
      <p>
        Location is optional and requested only after you choose Use my
        location. Your coordinates are sent to this website, Google Maps and
        Photon (operated by komoot, using OpenStreetMap data) for nearby search,
        maps and an approximate readable address. Driver search coordinates
        remain in page memory and are not stored in our application database.
        Clear my location or reload to clear them from the page. Providers may
        process requests under their own policies. Your address is copied to
        your device clipboard only when you choose Copy address; anyone with
        access to that clipboard can read it.
      </p>
      <p>
        OpenStreetMap station and address data is community maintained, may be
        incomplete, and does not establish current opening or availability.
        <a href="https://www.openstreetmap.org/copyright">
          {" "}
          OpenStreetMap attribution and licence
        </a>
        ,
        <a href="https://github.com/komoot/photon">
          {" "}
          Photon service information
        </a>{" "}
        and
        <a href="https://www.komoot.com/privacy"> komoot privacy policy</a>. We
        request an approximate mapped address; GPS cannot verify a building
        entrance. No address is automatically copied or saved by this website.
      </p>
      <p>
        Google Maps and Places content is governed by{" "}
        <a href="https://www.google.com/intl/en_us/help/terms_maps/">
          Google Maps terms
        </a>{" "}
        and{" "}
        <a href="https://policies.google.com/privacy">
          Google’s Privacy Policy
        </a>
        . We display supplied attribution and do not build a permanent copy of
        Google station content.
      </p>
      <h2>Security and providers</h2>
      <p>
        Driving routes send the selected origin and destination to Google
        Routes, or to the OSRM service operated by FOSSGIS while Google is
        inactive. The service may retain technical request logs under its{" "}
        <a href="https://routing.openstreetmap.de/about.html">
          privacy and usage information
        </a>
        . OpenStreetMap map tiles reveal the viewed map area to its tile
        service. Route estimates exclude live traffic and are not stored in the
        application database.
      </p>
      <p>
        Vercel hosts the website and Supabase stores application data in
        Singapore. These providers may process technical logs under their
        policies. Server credentials remain private. Account records use
        database ownership controls; residential addresses are disclosed only to
        appropriate participants when reservations are enabled. No system can
        promise absolute security.
      </p>
      <h2>Cookies and campaign counts</h2>
      <p>
        Optional vehicle connection preferences are stored in this tab’s session
        storage, without a vehicle identifier. Clear them in My EV connections.
        A host reservation request sends the selected connections to check fit;
        the preference list is not stored in the reservation record. Public host
        schedules show held/booked time windows without driver identity or
        reservation IDs. Private account session updates refresh while the page
        is visible; they are not public activity notifications.
      </p>
      <p>
        Authentication uses essential secure session cookies. Optional campaign
        measurement is off until you choose Allow; it stores a campaign label in
        session storage and sends aggregate daily counts, without email, GPS or
        account identifiers. You can change this choice using Analytics
        preferences in the footer. Daily keyed network hashes support rate
        limits; raw IP addresses are not stored in that rate-limit table.
        Hosting providers can still process network logs.
      </p>
      <h2>Retention and your choices</h2>
      <p>
        Withdraw applications and interest in My activity. The daily cleanup job
        removes withdrawn applications after 30 days, expired rate-limit records
        after two days, answered or closed support tickets after 90 days without
        updates, and aggregate campaign counts after 13 months. Open tickets and
        financial/incident records may need longer retention; a commercial
        retention schedule must be finalized before payment activation. These
        periods depend on the documented cleanup job being active; you may
        request earlier review through support.
      </p>
      <p>
        Use <a href="/support">Support → Privacy / data deletion</a> to request
        access, correction or deletion. Include enough information to locate
        your record; do not send identity documents in the form. We may need to
        verify account ownership before disclosing or erasing data. Withdrawal
        stops pilot consideration; it does not instantly delete authentication,
        provider logs or records subject to a legitimate retention need.
      </p>
      <h2>Payments and service changes</h2>
      <p>
        Host photo/GPS evidence follows its application's review retention.
        Unsubmitted or otherwise unlinked evidence and private files are removed
        by the cleanup job after two days. When an application is removed after
        withdrawal, its unlinked photo is removed on a following cleanup run.
        Approved host evidence remains private for operational review. Storage
        files need separate provider backups; encrypted application snapshots
        include metadata only.
      </p>
      <p>
        Commercial charging and payments remain disabled until operator approval
        and provider setup are complete. We do not collect card or bank details
        in application/support forms. Before activating payments we will publish
        applicable provider, settlement, cancellation and retention details and
        update this notice.
      </p>
    </LegalShell>
  );
}
