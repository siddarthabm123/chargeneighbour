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
        operate the pilot. We do not sell application data.
      </p>
      <h2>Location and Google</h2>
      <p>
        Location is optional and requested only after you choose Use my
        location. Your coordinates are sent to this website and Google for
        nearby search and maps. They remain in page memory and are not stored in
        our application database. Clear my location or reload to clear them from
        the page. Google may process your data under its own policy.
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
        Vercel hosts the website and Supabase stores application data in
        Singapore. These providers may process technical logs under their
        policies. Server credentials remain private. Account records use
        database ownership controls; residential addresses are disclosed only to
        appropriate participants when reservations are enabled. No system can
        promise absolute security.
      </p>
      <h2>Cookies and campaign counts</h2>
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
        Commercial charging and payments remain disabled until operator approval
        and provider setup are complete. We do not collect card or bank details
        in application/support forms. Before activating payments we will publish
        applicable provider, settlement, cancellation and retention details and
        update this notice.
      </p>
    </LegalShell>
  );
}
