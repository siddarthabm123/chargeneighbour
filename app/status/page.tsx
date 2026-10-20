import LegalShell from "../legal-shell";
import { commercialReady, operatorDetails } from "../lib/settings";
export const metadata = {
  title: "Service status | ChargeNeighbour",
  alternates: { canonical: "/status" },
};
export default function Status() {
  const { pilot } = operatorDetails();
  return (
    <LegalShell title="A clear view of the pilot.">
      <p>
        These are configured capabilities, not a guarantee that an external
        provider is currently available.
      </p>
      <dl className="status-list">
        <div>
          <dt>Public map</dt>
          <dd>Available through Google Maps</dd>
        </div>
        <div>
          <dt>Detailed station cards</dt>
          <dd>
            {process.env.GOOGLE_PLACES_API_KEY
              ? "Configured — search to check current results"
              : "Awaiting Google API activation"}
          </dd>
        </div>
        <div>
          <dt>Host applications & interest</dt>
          <dd>Open; account sign-in is required</dd>
        </div>
        <div>
          <dt>Email delivery</dt>
          <dd>
            {process.env.EMAIL_SIGNIN_READY === "true"
              ? "Production provider configured"
              : "Limited pilot setup — production email pending"}
          </dd>
        </div>
        <div>
          <dt>Verified host reservations</dt>
          <dd>
            {commercialReady()
              ? "Enabled for approved participating hosts only"
              : "Not open for commercial bookings"}
          </dd>
        </div>
        <div>
          <dt>Support requests</dt>
          <dd>Private receipt form; no sign-in required</dd>
        </div>
        <div>
          <dt>First operating area</dt>
          <dd>
            {pilot || "To be confirmed from approved hosts and driver demand"}
          </dd>
        </div>
      </dl>
      <p>
        We do not claim every Google station is a ChargeNeighbour partner.{" "}
        <a href="/support">Report a problem</a>.
      </p>
    </LegalShell>
  );
}
