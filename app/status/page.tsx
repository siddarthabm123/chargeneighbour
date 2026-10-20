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
          <dd>Interactive station map with in-site driving-route preview</dd>
        </div>
        <div>
          <dt>Nearby station list & readable address</dt>
          <dd>
            OpenStreetMap lookup via Photon; optional GPS road-distance
            estimates from OSRM
          </dd>
        </div>
        <div>
          <dt>Google station photos, ratings & reviews</dt>
          <dd>
            {process.env.GOOGLE_PLACES_API_KEY
              ? "Configured — search to check current results"
              : "Awaiting Google API activation"}
          </dd>
        </div>
        <div>
          <dt>Station demo</dt>
          <dd>
            Available without Google billing: AI concept gallery, example
            charger details and clearly labelled fictional reviews
          </dd>
        </div>
        <div>
          <dt>Host applications & interest</dt>
          <dd>
            Open; sign-in required. New hosts must attach a charger photo and
            fresh on-site GPS for manual review.
          </dd>
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
