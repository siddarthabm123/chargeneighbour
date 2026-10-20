import type { Metadata } from "next";
import LegalShell from "../legal-shell";
export const metadata: Metadata = {
  title: "Pilot terms | ChargeNeighbour",
  alternates: { canonical: "/terms" },
};
export default function Terms() {
  return (
    <LegalShell title="Know what to expect.">
      <p>
        Updated 20 October 2026. These terms describe the current pilot. They do
        not announce a commercial charging launch.
      </p>
      <h2>What is available</h2>
      <p>
        You can discover public stations through Google Maps, apply to host,
        register interest and send support requests. Google listings are
        independent public information; they are not automatically
        ChargeNeighbour partners. A host application does not establish
        approval, certification, revenue or bookable coverage.
      </p>
      <h2>Before travelling</h2>
      <p>
        Confirm connector compatibility, operating hours, current price and
        access with the operator. “Open” refers to opening hours, not a free
        connector. Reported connector counts expire in this interface after 15
        minutes and may change before arrival. Card distances are straight-line
        estimates. Use Google driving directions for the road route. This
        service is not emergency assistance.
      </p>
      <h2>Host responsibilities</h2>
      <p>
        Only apply for equipment and parking you are entitled to offer. Property
        or society permissions, safe electrical installation, protective
        devices, metering and access require review before listing approval. Do
        not upload misleading photos, credentials or another person’s private
        data. Public Google stations cannot be claimed as your home charger.
      </p>
      <h2>Reservations, payments and cancellations</h2>
      <p>
        Commercial reservations remain gated. If the service opens, only
        approved participating hosts and offered time slots can be requested. A
        request is not a confirmation. Any confirmed price, taxes,
        cancellation/refund conditions and support arrangements must be shown
        before you commit. Payment status is verified on the server. No charges
        apply to host applications or pilot interest.
      </p>
      <p>
        Until a commercial policy is published, do not send money to anyone
        claiming an application requires a deposit. Report payment requests or
        impersonation using <a href="/support">Support</a>. Refund eligibility
        and timelines cannot be promised without an active merchant/provider
        agreement.
      </p>
      <h2>Estimates and imagery</h2>
      <p>
        Host estimates use stated assumptions, not verified tariffs, guaranteed
        earnings, delivered energy or investment returns. AI concept imagery is
        labelled. The proposed commission is 15%; actual commercial terms must
        be agreed and published before activation.
      </p>
      <h2>Privacy, misuse and questions</h2>
      <p>
        Your use must respect host property, other users and applicable rules.
        Do not submit spam, probe other accounts or misuse public discovery
        data. We may restrict abusive requests. See the{" "}
        <a href="/privacy">privacy notice</a> for data use and{" "}
        <a href="/support">support</a> for complaints, corrections or withdrawal
        requests. Nothing here purports to remove rights that cannot lawfully be
        excluded.
      </p>
    </LegalShell>
  );
}
