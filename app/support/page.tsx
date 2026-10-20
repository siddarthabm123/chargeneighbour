import type { Metadata } from "next";
import LegalShell from "../legal-shell";
import SupportForm from "./form";
import { operatorDetails } from "../lib/settings";
export const metadata: Metadata = {
  title: "Support & data requests | ChargeNeighbour",
  alternates: { canonical: "/support" },
  robots: { index: false, follow: true },
};
export default function Support() {
  const { email } = operatorDetails();
  return (
    <LegalShell title="We’re here to listen.">
      <p>
        Ask about the pilot, report a problem or request a review of your data.
        No sign-in is needed. Keep the private receipt link to check for a
        reply.
      </p>
      {email && (
        <p>
          Public contact: <a href={`mailto:${email}`}>{email}</a>
        </p>
      )}
      <div className="notice-card">
        <strong>For an urgent equipment or access concern</strong>
        <p>
          Stop using unsafe equipment and contact the station operator or
          appropriate local emergency service. This form is not monitored as an
          emergency channel. During the pilot, response times are not
          guaranteed.
        </p>
      </div>
      <SupportForm />
    </LegalShell>
  );
}
